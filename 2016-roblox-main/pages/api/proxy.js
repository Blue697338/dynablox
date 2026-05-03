import axios from 'axios';
import getConfig from 'next/config';
import { fromUrl, parseDomain, ParseResultType } from 'parse-domain';
import { getBaseUrl } from '../../lib/request';
const UrlUtilities = (() => {
  const getDomainFromUrl = (url) => {
    const baseDomainParsed = parseDomain(fromUrl(url));
    if (baseDomainParsed.type === ParseResultType.Listed) {
      return baseDomainParsed.domain + '.' + baseDomainParsed.topLevelDomains.join('.');
    } else if (baseDomainParsed.type === ParseResultType.Ip) {
      return baseDomainParsed.hostname;
      console.log(baseDomainParsed.hostname)
    }else if (baseDomainParsed.type === ParseResultType.Reserved) {
      if (baseDomainParsed.hostname === 'economy-simulator.org' || baseDomainParsed.hostname === 'localhost') {
        return baseDomainParsed.hostname;
      }
      throw new Error('The only allowed reserved domain types are economy-simulator.org or localhost, got ' + baseDomainParsed.hostname);
    } else {
      //throw new Error('Unsupported domain type: ' + baseDomainParsed.type);
    }
  }
  const baseWithDomainAndTld = getDomainFromUrl(getBaseUrl())

  return {
    isSafe: (rawUrl) => {
      const parsedWithDomainAndTld = getDomainFromUrl(rawUrl)
      return parsedWithDomainAndTld === baseWithDomainAndTld;
    },
  }
})();

const actualHandler = async (req, res) => {
  const fullUrl = req.query.url;
  console.log('[proxy] received request for URL:', fullUrl);
  // Right now we just validate the URL. 
  // A safer approach might be to just send the parts of the URL (query params, path, api site) to this handler, then construct the correct URL here.
  const isUrlSafe = UrlUtilities.isSafe(fullUrl);// typeof fullUrl === 'string' && fullUrl.toLowerCase().startsWith(getBaseUrl())
  console.log('[proxy] URL is safe:', isUrlSafe);

  if (getConfig().publicRuntimeConfig.backend.proxyEnabled !== true || !isUrlSafe) {
    console.log('[proxy] rejecting request - proxyEnabled:', getConfig().publicRuntimeConfig.backend.proxyEnabled, 'isUrlSafe:', isUrlSafe);
    return res.status(500).json({
      success: false,
    });
  }
  try {
    let requestHeaders = {
      cookie: req.headers['cookie'] || '',
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'] || 'application/json',
    }
    
    // Extract CSRF token from the rbxcsrf4 cookie
    const cookies = (req.headers['cookie'] || '').split(';');
    console.log('[proxy] cookies found:', cookies.length);
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      console.log('[proxy] checking cookie:', name);
      if (name === 'rbxcsrf4' && value) {
        try {
          // The cookie value might be URL-encoded, decode it first
          const decodedValue = decodeURIComponent(value);
          // The cookie value is a JWT, decode it to get the csrf field
          const parts = decodedValue.split('.');
          console.log('[proxy] JWT parts:', parts.length);
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            console.log('[proxy] JWT payload keys:', Object.keys(payload));
            if (payload.csrf) {
              requestHeaders['x-csrf-token'] = payload.csrf;
              console.log('[proxy] extracted CSRF token from cookie');
            } else {
              console.log('[proxy] no csrf field in JWT payload');
            }
          }
        } catch (e) {
          console.warn('[proxy] failed to decode CSRF token from cookie:', e.message);
        }
      }
    }
    const authHeaderValue = getConfig().serverRuntimeConfig.backend.authorization;
    if (typeof authHeaderValue === 'string')
      requestHeaders[getConfig().serverRuntimeConfig.backend.authorizationHeader || 'authorization'] = authHeaderValue;

    // TODO: whitelisted headers might be safer...
    for (const key in req.headers) {
      if (key === 'host' || key === 'connection' || key === 'accept-encoding' || key === 'host') {
        continue;
      }
      // Don't overwrite x-csrf-token if it was already extracted
      if (key === 'x-csrf-token' && requestHeaders['x-csrf-token']) {
        continue;
      }
      requestHeaders[key] = req.headers[key];
    }
    // Convert Buffer to string if needed
    let requestData = req.body;
    if (Buffer.isBuffer(requestData) && requestData.length > 0) {
      try {
        requestData = JSON.parse(requestData.toString());
      } catch (e) {
        // If not JSON, keep as buffer
        requestData = req.body;
      }
    } else if (Buffer.isBuffer(requestData) && requestData.length === 0) {
      // Empty buffer for GET requests
      requestData = undefined;
    }
    
    console.log('[proxy] making request to:', fullUrl, 'method:', req.method);
    console.log('[proxy] request headers:', Object.keys(requestHeaders).join(', '));
    console.log('[proxy] x-csrf-token present:', requestHeaders['x-csrf-token'] ? 'yes' : 'no');
    const result = await axios.request({
      method: req.method,
      url: fullUrl,
      data: requestData,
      maxRedirects: 0,
      headers: requestHeaders,
      validateStatus: () => true,
    });
    console.log('[proxy] received response status:', result.status);
    console.log('[proxy] response headers:', result.headers);
    for (const item of Object.getOwnPropertyNames(result.headers)) {
      let value = result.headers[item];
      if (item === 'set-cookie') {
        // TODO: "localhost" needs to be configurable
        if (typeof value === 'string') {
          value = value.replace(/roblox\.com/g, 'economy-simulator.org');
          // Remove Domain attribute so cookie is set for current domain (localhost:3000)
          value = value.replace(/;\s*Domain=[^;]*/i, '');
        } else {
          value.forEach((v, i, arr) => {
            arr[i] = v.replace(/roblox\.com/g, 'economy-simulator.org');
            // Remove Domain attribute so cookie is set for current domain (localhost:3000)
            arr[i] = arr[i].replace(/;\s*Domain=[^;]*/i, '');
          });
        }
      }
      res.setHeader(item, value);
    }
    res.status(result.status);
    res.send(result.data);
    res.end();
  } catch (e) {
    console.error('[proxy error]', e);
    res.status(500).json({
      success: false,
      error: e.message,
    })
    res.end();
  }
}

export default function handler(req, res) {
  return new Promise((resolve, reject) => {
    let chunks = []
    req.on('data', function (chunk) {
      chunks.push(chunk);
    })
    req.on('end', function () {
      req.body = Buffer.concat(chunks);
      actualHandler(req, res).then(() => resolve()).catch(e => reject(e));
    })
  })

}

export const config = {
  api: {
    bodyParser: false,
  },
}

export {
  UrlUtilities,
}