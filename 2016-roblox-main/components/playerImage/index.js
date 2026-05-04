import { useEffect, useState } from "react";
import { createUseStyles } from "react-jss";
import { getBaseUrl, getUrlWithProxy } from "../../lib/request";
import { reportImageFail } from "../../services/metrics";
import thumbnailStore from "../../stores/thumbnailStore";

const useStyles = createUseStyles({
  image: {
    maxWidth: '400px',
    width: '100%',
    margin: '0 auto',
    height: 'auto',
    display: 'block',
  },
})

const PlayerImage = (props) => {
  const s = useStyles();
  const size = props.size || 420;
  const [retryCount, setRetryCount] = useState(0);
  const thumbs = thumbnailStore.useContainer();
  
  // Helper to convert thumbnail URL to backend URL if needed
  const getBackendUrl = (url) => {
    console.log('[PlayerImage] getBackendUrl called with:', url);
    if (!url) return null;
    // If URL is a relative path to /images/thumbnails, convert to backend URL
    if (url.startsWith('/images/thumbnails')) {
      const result = 'https://www.dynablox.xyz' + url;
      console.log('[PlayerImage] matched /images/thumbnails, returning:', result);
      return result;
    }
    // If URL is a relative path to images/thumbnails (without leading slash), add it
    if (url.startsWith('images/thumbnails')) {
      const result = 'https://www.dynablox.xyz/' + url;
      console.log('[PlayerImage] matched images/thumbnails, returning:', result);
      return result;
    }
    // If URL is already an absolute URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('[PlayerImage] already absolute URL, returning as-is');
      return url;
    }
    // For other relative URLs, also convert to backend
    if (url.startsWith('/')) {
      const result = 'https://www.dynablox.xyz' + url;
      console.log('[PlayerImage] matched /, returning:', result);
      return result;
    }
    console.log('[PlayerImage] no match, returning as-is:', url);
    return url;
  };
  
  const [image, setImage] = useState(props.url ? getBackendUrl(props.url) : thumbs.getUserThumbnail(props.id, '420x420'));

  useEffect(() => {
    if (props.url) {
      setImage(getBackendUrl(props.url))
      return
    }
    setRetryCount(0);
    setImage(thumbs.getUserThumbnail(props.id, '420x420'));
  }, [props]);

  useEffect(() => {
    if (props.url) {
      return
    }
    setImage(thumbs.getUserThumbnail(props.id, '420x420'));
  }, [thumbs.thumbnails]);

  return <img className={s.image} src={image} alt={props.name} onError={(e) => {
    if (retryCount >= 3) return;
    reportImageFail({
      errorEvent: e,
      type: 'playerHeadshot',
      src: image,
    })
    setRetryCount(retryCount + 1);
    setImage('/img/placeholder.png')
  }} />
}

export default PlayerImage;