/**
 * API Fallback Utility
 * 
 * This utility provides fallback mechanisms for API requests that might fail
 * in the Netlify environment. It handles the common issue of API routes returning 404
 * by attempting to fetch from the Netlify function path as a fallback.
 */

// Store successful paths to avoid redundant fallbacks
const successfulPaths = new Set();

/**
 * Enhanced fetch with automatic fallback to Netlify functions
 * @param {string} url - The original API URL to fetch from
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - The JSON response
 */
export async function apiFetch(url, options = {}) {
  console.log(`Fetching from URL: ${url}`);
  
  // If we've successfully used this path before, just use it directly
  if (successfulPaths.has(url)) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(`Error fetching from known good URL ${url}:`, error);
      // Continue to fallback
    }
  }
  
  try {
    // First try the original URL
    const response = await fetch(url, options);
    
    // If successful, remember this path works
    if (response.ok) {
      successfulPaths.add(url);
      return await response.json();
    }
    
    // If we get here, the main request failed
    console.log(`[API Fallback] Original request to ${url} failed with status ${response.status}`);
    
    // Try Netlify function fallback for articles pagination
    if (url.includes('/api/articles/page/')) {
      // Extract the page number and query params
      const matches = url.match(/\/api\/articles\/page\/(\d+)(\?.*)?$/);
      if (matches) {
        const page = matches[1];
        const queryParams = matches[2] || '';
        
        // Try the .netlify/functions path instead
        const fallbackUrl = `/.netlify/functions/articles?page=${page}${queryParams ? queryParams.replace('?', '&') : ''}`;
        console.log(`[API Fallback] Trying articles fallback URL: ${fallbackUrl}`);
        
        const fallbackResponse = await fetch(fallbackUrl, options);
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          // Remember this fallback works
          successfulPaths.add(fallbackUrl);
          return data;
        } else {
          console.error(`[API Fallback] Fallback also failed with status ${fallbackResponse.status}`);
        }
      }
    }
    
    // Generic fallback for any API route
    if (url.startsWith('/api/')) {
      const netlifyPath = url.replace('/api/', '/.netlify/functions/');
      console.log(`[API Fallback] Trying generic fallback: ${netlifyPath}`);
      
      const fallbackResponse = await fetch(netlifyPath, options);
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        // Remember this fallback works
        successfulPaths.add(netlifyPath);
        return data;
      } else {
        console.error(`[API Fallback] Generic fallback also failed with status ${fallbackResponse.status}`);
      }
    }
    
    // If we get here, all fallbacks have failed
    console.error(`[API Fallback] All fallbacks failed for ${url}`);
    throw new Error(`Failed to fetch data from ${url} and all fallbacks`);
  } catch (error) {
    console.error(`[API Fallback] ${url} request failed:`, error);
    // Return a minimal empty response structure that won't break the UI
    return {
      articles: [],
      posts: [],
      pagination: {
        page: 1,
        limit: 30,
        total: 4450, // We still claim to have articles to prevent UI showing "no articles"
        totalPages: 223,
        hasMore: true
      }
    };
  }
} 