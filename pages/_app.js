import '../styles/globals.css'
import '../styles/animations.css'
import '../styles/article-fixes.css'
import '../styles/images.css'
import { useEffect } from 'react'
import DataPrefetcher from '../components/DataPrefetcher'
// Remove the direct import to avoid including server-side code
// import { preloadArticleCache } from '../utils/articleUtils'

function MyApp({ Component, pageProps }) {
  // Handle service worker cleanup and error suppression
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load the service worker cleanup script
      const swCleanupScript = document.createElement('script');
      swCleanupScript.src = '/sw-cleanup.js';
      swCleanupScript.async = true;
      
      // Load the host validation error suppression script
      const hostFixScript = document.createElement('script');
      hostFixScript.src = '/host-fix.js';
      hostFixScript.async = true;
      
      // Load the API fallback script
      const apiFallbackScript = document.createElement('script');
      apiFallbackScript.src = '/api-fallback.js';
      apiFallbackScript.async = true;
      
      document.head.appendChild(swCleanupScript);
      document.head.appendChild(hostFixScript);
      document.head.appendChild(apiFallbackScript);
      
      return () => {
        // Clean up scripts when component unmounts
        if (document.head.contains(swCleanupScript)) {
          document.head.removeChild(swCleanupScript);
        }
        if (document.head.contains(hostFixScript)) {
          document.head.removeChild(hostFixScript);
        }
        if (document.head.contains(apiFallbackScript)) {
          document.head.removeChild(apiFallbackScript);
        }
      };
    }
  }, []);

  // Preload article cache on client side only
  useEffect(() => {
    // Only run on client side and use a flag to ensure we only preload once
    if (typeof window !== 'undefined') {
      // Use sessionStorage to track if we've already preloaded in this session
      const hasPreloaded = sessionStorage.getItem('articleCachePreloaded');
      
      if (!hasPreloaded) {
        // Preload article cache after a short delay to not block initial rendering
        const timer = setTimeout(() => {
          // Instead of calling preloadArticleCache directly, make a fetch request
          // to an API endpoint that will trigger the cache preloading on the server
          fetch('/api/preload-cache')
            .then(response => {
              if (response.ok) {
                console.log('Article cache preloaded successfully');
                // Mark as preloaded for this session
                sessionStorage.setItem('articleCachePreloaded', 'true');
              } else {
                console.warn('Failed to preload article cache');
              }
            })
            .catch(err => 
              console.error('Error preloading article cache:', err)
            );
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, []);
  
  return (
    <>
      {/* Add the DataPrefetcher to preload critical resources */}
      <DataPrefetcher />
      <Component {...pageProps} />
    </>
  )
}

export default MyApp