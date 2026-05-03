import { useEffect, useState } from "react";
import { createContainer } from "unstated-next";
import { getAvatar, getMyAvatar, getRules, redrawMyAvatar, setColors as setColorsRequest, setWearingAssets as setWearingAssetsRequest } from "../services/avatar";
import { multiGetUserThumbnails } from "../services/thumbnails";
import * as requestModule from "../lib/request";
const request = requestModule.default;

// Helper function to get render status from backend
const getRenderStatus = async () => {
  try {
    const response = await request('GET', requestModule.getFullUrl('avatar', '/v1/avatar/render-status'));
    return response.data;
  } catch (e) {
    console.error('[characterPage] error getting render status:', e);
    return { isRendering: false };
  }
};

const CharacterCustomizationStore = createContainer(() => {
  const [rules, setRules] = useState(null);
  const [wearingAssets, setWearingAssets] = useState(null);
  const [colors, setColors] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [thumbnail, setThumbnail] = useState(null);
  const [initialAssets, setInitialAssets] = useState(null);
  const [initialColors, setInitialColors] = useState(null);

  useEffect(() => {
    if (!userId) return;
    getMyAvatar().then(result => {
      const assets = result.assets.map(v => {
        return {
          assetId: v.id,
          name: v.name,
          assetType: v.assetType,
        }
      });
      setWearingAssets(assets);
      setInitialAssets(assets);
      setColors(result.bodyColors);
      setInitialColors(result.bodyColors);
      setThumbnail(result.thumbnailUrl);
    })
  }, [userId]);

  // Check if anything has been modified
  useEffect(() => {
    if (!initialAssets || !initialColors || !wearingAssets || !colors) {
      setIsModified(false);
      return;
    }
    
    const assetsChanged = JSON.stringify(initialAssets) !== JSON.stringify(wearingAssets);
    const colorsChanged = JSON.stringify(initialColors) !== JSON.stringify(colors);
    
    setIsModified(assetsChanged || colorsChanged);
  }, [wearingAssets, colors, initialAssets, initialColors]);

  useEffect(() => {
    if (!isRendering) return;
    
    console.log('[characterPage] Starting render status polling');
    let pollCount = 0;
    const maxPolls = 60; // 60 seconds max (1 poll per second)
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      console.log('[characterPage] Polling render status (attempt ' + pollCount + ')');
      
      try {
        const status = await getRenderStatus();
        console.log('[characterPage] Render status response:', status);
        
        if (!status.isRendering) {
          console.log('[characterPage] Render completed! Reloading page');
          clearInterval(pollInterval);
          setIsRendering(false);
          // Wait a moment for thumbnail to be available, then reload
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
      } catch (e) {
        console.error('[characterPage] Error polling render status:', e);
      }
      
      // Stop polling after max attempts
      if (pollCount >= maxPolls) {
        console.warn('[characterPage] Render polling timeout after ' + maxPolls + ' seconds');
        clearInterval(pollInterval);
        setIsRendering(false);
        window.location.reload();
      }
    }, 1000); // Poll every 1 second
    
    return () => {
      clearInterval(pollInterval);
    }
  }, [isRendering]);

  const requestRender = (force = false) => {
    console.log('[characterPage] requestRender called with force=', force);
    console.log('[characterPage] colors=', colors);
    console.log('[characterPage] wearingAssets=', wearingAssets);
    
    if (!colors || !wearingAssets) {
      console.error('[characterPage] colors or wearingAssets not set');
      return;
    }

    setColorsRequest(colors).then(() => {
      console.log('[characterPage] setColorsRequest completed');
      return setWearingAssetsRequest({ assetIds: wearingAssets.map(v => v.assetId) });
    }).then(() => {
      console.log('[characterPage] setWearingAssetsRequest completed');
      if (force) {
        console.log('[characterPage] calling redrawMyAvatar');
        return redrawMyAvatar();
      }
    }).then(() => {
      console.log('[characterPage] render request completed, setting isRendering=true');
      setIsRendering(true);
      setThumbnail(null);
    }).catch(e => {
      console.error('[characterPage] error in requestRender:', e);
    });
  }

  useEffect(() => {
    getRules().then(res => {
      setRules(res);
    })
  }, []);

  return {
    rules,
    setRules,

    userId,
    setUserId,

    wearingAssets,
    setWearingAssets,

    colors,
    setColors,

    isRendering,
    setIsRendering,

    thumbnail,
    setThumbnail,

    isModified,
    setIsModified,

    requestRender,
  }
});

export default CharacterCustomizationStore;