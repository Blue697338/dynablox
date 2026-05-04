import axios from 'axios';
import config from '../lib/config';
let _csrf = '';

// Helper to extract CSRF token from cookie
const getCsrfTokenFromCookie = () => {
  if (typeof document === 'undefined') return '';
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'rbxcsrf4') {
      try {
        // The cookie value is a JWT, we need to decode it to get the csrf field
        const parts = value.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          return payload.csrf || '';
        }
      } catch (e) {
        console.warn('[request] failed to decode CSRF token from cookie:', e.message);
      }
    }
  }
  return '';
};

const getFullUrl = (apiSite, fullUrl) => {
  let result = config.publicRuntimeConfig.backend.apiFormat.replace(/\{0\}/g, apiSite).replace(/\{1\}/g, fullUrl);
  // Ensure domain URLs have https
  if (result.includes('http://www.dynablox.xyz')) {
    result = result.replace('http://www.dynablox.xyz', 'https://www.dynablox.xyz');
  }
  // Keep localhost for development
  if (result.includes('http://localhost') && !result.includes('http://localhost:')) {
    result = result.replace('http://localhost', 'http://localhost:5000');
  }
  return result;
}

const getBaseUrl = () => {
  return config.publicRuntimeConfig.backend.baseUrl;
}

const getUrlWithProxy = (url) => {
  if (config.publicRuntimeConfig.backend.proxyEnabled) {
    // If URL is relative, convert to absolute backend URL
    if (url.startsWith('/')) {
      url = 'https://www.dynablox.xyz' + url;
    }
    // Ensure domain URLs have https
    if (url.includes('http://www.dynablox.xyz')) {
      url = url.replace('http://www.dynablox.xyz', 'https://www.dynablox.xyz');
    }
    // Keep localhost for development
    if (url.includes('http://localhost') && !url.includes('http://localhost:')) {
      url = url.replace('http://localhost', 'http://localhost:5000');
    }
    return '/api/proxy?url=' + encodeURIComponent(url);
  }
  return url;
}

const request = async (method, url, data) => {
  const isBrowser = typeof window !== 'undefined';
  try {
    // If CSRF token is empty, try to get it from the cookie
    if (!_csrf && isBrowser) {
      _csrf = getCsrfTokenFromCookie();
    }
    
    let headers = {
      'x-csrf-token': _csrf,
    }
    if (!isBrowser) {
      // Auth header, if required
      const authHeaderValue = config.serverRuntimeConfig.backend.authorization;
      if (typeof authHeaderValue === 'string')
        headers[config.serverRuntimeConfig.backend.authorizationHeader || 'authorization'] = authHeaderValue;
      // Custom user agent
      headers['user-agent'] = 'Roblox2016/1.0';
    }
    console.log('[request] making', method, 'request to', url, 'with csrf token:', _csrf ? 'present' : 'empty');
    const result = await axios.request({
      method,
      url: getUrlWithProxy(url),
      data: data,
      headers: headers,
      maxRedirects: 0,
      withCredentials: true, // Send cookies with requests
    });
    console.log('[request] request successful, status:', result.status);
    return result;
  } catch (e) {
    if (e.response) {
      let resp = e.response;
      console.log('[request] request failed with status:', resp.status, 'csrf header:', resp.headers['x-csrf-token'] ? 'present' : 'missing');
      console.log('[request] response headers:', resp.headers);
      if (resp.status === 403 && resp.headers['x-csrf-token']) {
        console.log('[request] csrf token validation failed, retrying with new token');
        _csrf = resp.headers['x-csrf-token'];
        console.log('[request] new csrf token set:', _csrf);
        return await request(method, url, data);
      }
    }
    if (isBrowser) {
      // attempt to make errors easier to diagnose
      if (e.response) {
        // check for regular
        if (e.response.data && e.response.data.errors && e.response.data.errors.length) {
          let err = e.response.data.errors[0]
          e.message = e.message + ': ' + (err.code + ': ' + err.message);
        }
      }
      console.error('[request] error:', e.message);
      throw e;
    } else {
      throw new Error(e.message);
    }
  }
}

export default request;

export {
  getFullUrl,
  getBaseUrl,
  getUrlWithProxy,
}