/**
 * Utility for optimized data fetching with built-in
 * debouncing, deduplication, and batching
 */

// In-memory request cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // Increase cache lifetime to 5 minutes
const PRIORITY_CACHE_TTL = 15 * 60 * 1000; // 15 minutes for priority requests

// Batch queue for article slug requests
let batchQueue = [];
let batchTimer = null;
const BATCH_DELAY = 50; // 50ms delay to batch requests

// Queue for limiting concurrent requests
let requestQueue = [];
const MAX_CONCURRENT_REQUESTS = 6; // Maximum number of concurrent requests
let activeRequests = 0;

// Track in-flight requests to avoid duplicates
const inFlightRequests = new Map();

// Process the request queue
function processRequestQueue() {
  // Process as many requests as we can (up to MAX_CONCURRENT_REQUESTS)
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const { execute } = requestQueue.shift();
    activeRequests++;
    execute().finally(() => {
      activeRequests--;
      processRequestQueue(); // Process next request when one completes
    });
  }
}

// Add a request to the queue
function queueRequest(executeFunc) {
  return new Promise((resolve, reject) => {
    const execute = () => {
      return executeFunc()
        .then(resolve)
        .catch(reject);
    };
    
    requestQueue.push({ execute });
    
    // Start processing the queue if not already running
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      processRequestQueue();
    }
  });
}

/**
 * Process the batch queue of article slugs
 * @returns {Promise<void>}
 */
async function processBatchQueue() {
  if (batchQueue.length === 0) return;
  
  const currentBatch = [...batchQueue];
  batchQueue = [];
  
  try {
    const response = await fetch('/api/articles/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slugs: currentBatch.map(item => item.slug) }),
    });
    
    if (!response.ok) throw new Error('Failed to fetch batch articles');
    
    const data = await response.json();
    
    // Resolve all the promises in the batch
    currentBatch.forEach(({ slug, resolve, reject }) => {
      const article = data.articles.find(a => a.slug === slug);
      if (article) {
        // Store in cache
        cache.set(slug, {
          data: article,
          timestamp: Date.now()
        });
        resolve(article);
      } else {
        reject(new Error(`Article ${slug} not found in batch response`));
      }
    });
  } catch (error) {
    console.error('Error processing article batch:', error);
    // Reject all promises in the batch
    currentBatch.forEach(({ reject }) => {
      reject(error);
    });
  }
}

/**
 * Fetch an article by slug, with automatic batching
 * @param {string} slug - Article slug
 * @returns {Promise<Object>} - Article data
 */
export function fetchArticle(slug) {
  // Check cache first
  const cachedItem = cache.get(slug);
  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    return Promise.resolve(cachedItem.data);
  }
  
  // Otherwise, add to batch queue
  return new Promise((resolve, reject) => {
    batchQueue.push({ slug, resolve, reject });
    
    // Clear existing timer and set a new one
    if (batchTimer) {
      clearTimeout(batchTimer);
    }
    
    batchTimer = setTimeout(() => {
      processBatchQueue();
    }, BATCH_DELAY);
  });
}

/**
 * Fetch multiple articles by slug in one request
 * @param {string[]} slugs - Array of article slugs
 * @returns {Promise<Object[]>} - Array of article data
 */
export function fetchArticles(slugs) {
  if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
    return Promise.resolve([]);
  }
  
  return fetch('/api/articles/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slugs }),
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch batch articles');
      return response.json();
    })
    .then(data => {
      // Store each article in cache
      data.articles.forEach(article => {
        cache.set(article.slug, {
          data: article,
          timestamp: Date.now()
        });
      });
      return data.articles;
    });
}

/**
 * Optimized fetch with caching and priority support
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {boolean} isPriority - Whether this is a priority request (longer TTL)
 * @returns {Promise<any>} - The response data
 */
export function cachedFetch(url, options = {}, isPriority = false) {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  const currentTTL = isPriority ? PRIORITY_CACHE_TTL : CACHE_TTL;
  
  // Check cache first
  const cachedItem = cache.get(cacheKey);
  if (cachedItem) {
    const isExpired = Date.now() - cachedItem.timestamp > currentTTL;
    
    // If not expired, return cached data immediately
    if (!isExpired) {
      // If this is a priority request, update the timestamp to extend cache life
      if (isPriority) {
        cache.set(cacheKey, {
          data: cachedItem.data,
          timestamp: Date.now() // Refresh timestamp
        });
      }
      return Promise.resolve(cachedItem.data);
    }
    
    // If expired but we have an in-flight request, use the cached data temporarily
    // while the new data is fetched in the background
    if (isExpired && inFlightRequests.has(cacheKey)) {
      console.log(`Using stale cache for ${url} while fresh data is being fetched`);
      
      // Refresh in the background without blocking the current request
      inFlightRequests.get(cacheKey)
        .catch(() => {/* silent fail on background refresh */});
      
      return Promise.resolve(cachedItem.data);
    }
  }
  
  // Check if this exact request is already in-flight
  if (inFlightRequests.has(cacheKey)) {
    console.log(`Request for ${url} already in-flight, reusing promise`);
    return inFlightRequests.get(cacheKey);
  }
  
  // Queue the actual fetch operation to limit concurrent requests
  const fetchPromise = queueRequest(() => {
    // Add a small random delay to spread out requests and prevent thundering herd
    const randomDelay = Math.random() * 100; // 0-100ms random delay
    
    return new Promise(resolve => setTimeout(resolve, isPriority ? 0 : randomDelay))
      .then(() => fetch(url, options))
      .then(response => {
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        return response.json();
      })
      .then(data => {
        // Store in cache
        cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        // Remove from in-flight requests
        inFlightRequests.delete(cacheKey);
        
        return data;
      })
      .catch(error => {
        // Remove from in-flight requests on error
        inFlightRequests.delete(cacheKey);
        throw error;
      });
  });
  
  // Store this request as in-flight
  inFlightRequests.set(cacheKey, fetchPromise);
  
  return fetchPromise;
} 