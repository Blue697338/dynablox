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
    if (!url) return null;
    // If URL is already an absolute URL to the backend, return as-is
    if (url.startsWith('http://localhost:5000') || url.startsWith('https://localhost:5000')) {
      return url;
    }
    // If URL is an absolute URL to the frontend, replace with backend
    if (url.startsWith('http://localhost:3000')) {
      return url.replace('http://localhost:3000', 'http://localhost:5000');
    }
    // If URL is already an absolute URL (other), return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // For relative URLs, convert to backend
    if (url.startsWith('/')) {
      return 'http://localhost:5000' + url;
    }
    // For relative URLs without leading slash, also convert to backend
    return 'http://localhost:5000/' + url;
  };
  
  useEffect(() => {
    setRetryCount(0);
    multiGetUserHeadshots({
      userIds: [props.id],
      size: size + 'x' + size,
    }).then(image => {
      let u = image.find(v => v.targetId == props.id);
      if (u && u.imageUrl) {
        setImage(getBackendUrl(u.imageUrl));
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