// System Auto-Refresh utility
// Detects new deployments to Firebase Hosting and automatically refreshes the browser

declare const __APP_BUILD_TIME__: string;

const currentBuild = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : '';

export function initAutoRefreshOnDeploy(checkIntervalMs = 30000): () => void {
  if (!currentBuild || typeof window === 'undefined') {
    return () => {};
  }

  let isChecking = false;

  const checkForUpdate = async () => {
    if (isChecking) return;
    isChecking = true;
    try {
      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.version && data.version !== currentBuild) {
          console.log(`[AutoRefresh] New deployment detected (${data.version} != ${currentBuild}). Reloading...`);
          
          if (!document.getElementById('auto-refresh-banner')) {
            const banner = document.createElement('div');
            banner.id = 'auto-refresh-banner';
            banner.style.cssText = `
              position: fixed;
              top: 16px;
              left: 50%;
              transform: translateX(-50%);
              z-index: 99999;
              background: #ea580c;
              color: white;
              padding: 10px 22px;
              border-radius: 9999px;
              font-weight: 700;
              font-size: 13px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              gap: 10px;
              font-family: system-ui, -apple-system, sans-serif;
            `;
            banner.innerHTML = `
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ffffff;animation:ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
              New system update available! Refreshing...
            `;
            document.body.appendChild(banner);
          }

          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }
      }
    } catch {
      // Ignore background fetch network errors
    } finally {
      isChecking = false;
    }
  };

  const timer = setInterval(checkForUpdate, checkIntervalMs);

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      checkForUpdate();
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('focus', checkForUpdate);

  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('focus', checkForUpdate);
  };
}
