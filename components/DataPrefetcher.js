import { useEffect } from 'react';

/**
 * DataPrefetcher component that preloads critical data in the background
 * to improve perceived performance
 */
export default function DataPrefetcher() {
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const prefetchData = async () => {
      try {
        // Import cachedFetch dynamically to avoid webpack issues
        const { cachedFetch } = await import('../utils/lazyFetch');
        
        // Start cache preload - this should run first but in background
        fetch('/api/preload-cache', { 
          priority: 'low',
          next: { revalidate: 3600 } // Revalidate every hour
        }).catch(err => console.log('Cache preload running in background'));
          
        // Preload the first page of articles - high priority but cached
        try {
          await cachedFetch('/api/articles/page/1?limit=20');
        } catch (err) {
          console.log('First page preload running');
        }
        
        // Queue up the next page for fast pagination response
        setTimeout(() => {
          try {
            cachedFetch('/api/articles/page/2?limit=20')
              .catch(() => {/* silent fail */});
          } catch (e) {
            // Silent fail
          }
        }, 5000);
      } catch (error) {
        // Silent fail - this is just prefetching
        console.log('Prefetch error (safe to ignore):', error.message);
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => prefetchData(), { timeout: 2000 });
    } else {
      setTimeout(prefetchData, 1000);
    }

    return () => {/* No cleanup needed */};
  }, []);

  // This component doesn't render anything
  return null;
} 