import { chunk, flatten } from "lodash";
import request, { getBaseUrl, getFullUrl } from "../lib/request"

const toCsv = (str) => {
  if (typeof str === 'string') return str;
  return encodeURIComponent(str.join(','));
}

const addBaseUrl = (arrayOfThumbs) => {
  return arrayOfThumbs.map(v => {
    if (typeof v.imageUrl === 'string' && !v.imageUrl.startsWith('http')) {
      v.imageUrl = getBaseUrl() + v.imageUrl;
    }
    return v;
  })
}

export const multiGetUserThumbnails = ({ userIds, size = '420x420', format = 'png' }) => {
  return request('GET', getFullUrl('thumbnails', `/v1/users/avatar?userIds=${toCsv(userIds)}&size=${size}&format=${format}`)).then(d => d.data.data).then(addBaseUrl);
}

let _multiGetHeadshotsMeta = {
  locked: false,
  cache: {},
  pending: [],
  onFinish: [],
  didRun: false,
  timer: 0,
}

export const multiGetUserHeadshots = ({ userIds, size = '420x420', format = 'png' }) => {
  userIds = [... new Set(userIds)];
  let results = [];
  let toRemove = [];
  for (const id of userIds) {
    const key = `${id} ${size} ${format}`;
    const exists = _multiGetHeadshotsMeta.cache[key];
    if (exists) {
      results.push({
        imageUrl: exists,
        state: 'Completed',
        targetId: typeof id === 'string' ? parseInt(id, 10) : id,
      });
      toRemove.push(id);
    }
  }
  userIds = userIds.filter(v => toRemove.includes(v) === false);
  if (userIds.length === 0) {
    console.debug('[info] multiGetUserHeadshots: all results from cache');
    return new Promise((res) => res(results));
  }
  if (_multiGetHeadshotsMeta.pending.length !== 0) {
    clearTimeout(_multiGetHeadshotsMeta.timer);
  }
  userIds.forEach(v => {
    _multiGetHeadshotsMeta.pending.push(v);
  });
  // @ts-ignore
  _multiGetHeadshotsMeta.timer = setTimeout(() => {
    console.debug('[info] Make avatar/headshot request', { pending: _multiGetHeadshotsMeta.pending, size, format });
    const { pending, onFinish } = _multiGetHeadshotsMeta;
    _multiGetHeadshotsMeta.onFinish = [];
    _multiGetHeadshotsMeta.pending = [];
    _multiGetHeadshotsMeta.timer = 0;
    request('GET', getFullUrl('thumbnails', `/v1/users/avatar-headshot?userIds=${toCsv(pending)}&size=${size}&format=${format}`))
      .then(d => {
        console.debug('[info] headshot response received', { status: d.status, dataLength: d.data?.data?.length });
        return d.data.data;
      })
      .then(addBaseUrl)
      .then(finalResults => {
        console.debug('[info] headshot results processed', { count: finalResults?.length });
        finalResults = addBaseUrl(finalResults);
        for (const item of finalResults) {
          const imageUrl = item.imageUrl;
          if (typeof imageUrl !== 'string') {
            console.warn('[warn] headshot imageUrl is not a string', { item });
            continue;
          }
          _multiGetHeadshotsMeta.cache[`${item.targetId} ${size} ${format}`] = imageUrl;
        }
        console.debug('[info] headshot cache updated', { cacheSize: Object.keys(_multiGetHeadshotsMeta.cache).length });
        onFinish.forEach(v => {
          v(finalResults);
        })
      })
      .catch(e => {
        console.error('[error] headshot request failed', { error: e.message, status: e.response?.status, data: e.response?.data });
        onFinish.forEach(v => {
          v([]);
        })
      });
  }, 50);
  return new Promise((res, rej) => {
    _multiGetHeadshotsMeta.onFinish.push((data) => {
      console.debug('[info] headshot promise resolved', { dataLength: data?.length });
      res(data);
    });
  });
}

export const multiGetOutfitThumbnails = ({ userOutfitIds, size = '420x420', format = 'png' }) => {
  return request('GET', getFullUrl('thumbnails', `/v1/users/outfits?userOutfitIds=${toCsv(userOutfitIds)}&size=${size}&format=${format}`)).then(d => d.data.data);
}

export const multiGetGroupIcons = ({ groupIds }) => {
  return request('get', getFullUrl('thumbnails', `/v1/groups/icons?groupIds=${toCsv(groupIds)}&format=png&size=420x420`)).then(d => d.data.data).then(addBaseUrl);
}

export const multiGetAssetThumbnails = ({ assetIds }) => {
  console.debug('[info] multiGetAssetThumbnails requested', { assetIds });
  return request('get', getFullUrl('thumbnails', `/v1/assets?assetIds=${toCsv(assetIds)}&format=png&size=420x420`))
    .then(d => {
      console.debug('[info] asset thumbnails response received', { status: d.status, dataLength: d.data?.data?.length });
      return d.data.data;
    })
    .then(addBaseUrl)
    .then(d => {
      console.debug('[info] asset thumbnails processed', { count: d?.length });
      return d;
    })
    .catch(e => {
      console.error('[error] asset thumbnails request failed', { error: e.message, status: e.response?.status, assetIds });
      throw e;
    });
}

export const multiGetUniverseIcons = ({ universeIds, size }) => {
  let all = [];
  let c = chunk(universeIds, 100);
  for (const item of c) {
    all.push(request('get', getFullUrl('thumbnails', `/v1/games/icons?size=${size}&format=png&universeIds=${toCsv(item)}`)).then(d => d.data.data).then(addBaseUrl))
  }
  return Promise.all(all).then(d => {
    let arr = []
    d.forEach(v => {
      v.forEach(x => {
        arr.push(x);
      })
    })
    return arr
  }).then(d => {
    return d;
  })
}