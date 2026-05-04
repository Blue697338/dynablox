import { useEffect, useState } from "react";
import { createUseStyles } from "react-jss";
import { getBaseUrl } from "../../lib/request";
import { reportImageFail } from "../../services/metrics";
import { multiGetUserHeadshots } from "../../services/thumbnails";

const useStyles = createUseStyles({
  image: {
    maxWidth: '400px',
    width: '100%',
    margin: '0 auto',
    height: 'auto',
    display: 'block',
  },
})

/**
 * Player headshot
 * @param {{id: number; name: string; size?: string;}} props 
 * @returns 
 */
const PlayerHeadshot = (props) => {
  const s = useStyles();
  const size = props.size || 420;
  const [image, setImage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Helper to convert thumbnail URL to backend URL if needed
  const getBackendUrl = (url) => {
    console.log('[PlayerHeadshot] getBackendUrl input:', url);
    if (!url) return null;
    
    // If URL is already an absolute URL to the backend, return as-is
    if (url.startsWith('https://www.dynablox.xyz') || url.startsWith('http://localhost:5000') || url.startsWith('https://localhost:5000')) {
      console.log('[PlayerHeadshot] already backend URL');
      return url;
    }
    
    // If URL is an absolute URL to the frontend, replace with backend
    if (url.startsWith('http://localhost:3000') || url.startsWith('https://www.dynablox.xyz')) {
      const result = url.replace('http://localhost:3000', 'https://www.dynablox.xyz').replace('https://www.dynablox.xyz', 'https://www.dynablox.xyz');
      console.log('[PlayerHeadshot] frontend URL, converted to:', result);
      return result;
    }
    
    // If URL is already an absolute URL (other), return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('[PlayerHeadshot] other absolute URL');
      return url;
    }
    
    // Ensure URL starts with / for consistency
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('/')) {
      normalizedUrl = '/' + normalizedUrl;
    }
    
    const result = 'https://www.dynablox.xyz' + normalizedUrl;
    console.log('[PlayerHeadshot] converted to:', result);
    return result;
  };
  
  useEffect(() => {
    setRetryCount(0);
    multiGetUserHeadshots({
      userIds: [props.id],
      size: size + 'x' + size,
    }).then(image => {
      let u = image.find(v => v.targetId == props.id);
      if (u && u.imageUrl) {
        console.log('[PlayerHeadshot] imageUrl from API:', u.imageUrl);
        const backendUrl = getBackendUrl(u.imageUrl);
        console.log('[PlayerHeadshot] converted to:', backendUrl);
        setImage(backendUrl);
      }
    });
  }, [props.id]);

  return <img className={s.image} src={image} alt={props.name} onError={(e) => {
    if (retryCount >= 3) return;
    reportImageFail({
      errorEvent: e,
      type: 'playerHeadshot',
      src: image,
    })
    setRetryCount(retryCount + 1);
    setImage('/img/empty.png');
  }}></img>
}

export default PlayerHeadshot;