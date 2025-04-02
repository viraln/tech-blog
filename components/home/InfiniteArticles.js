import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import Link from 'next/link'
import Image from 'next/image'
import { getRelativeTime } from '../../utils/dateUtils'
import { fetchArticle, fetchArticles, cachedFetch } from '../../utils/lazyFetch'
import { apiFetch } from '../../utils/api-fallback'

// Track which articles have already been prefetched to avoid duplication
const prefetchedArticles = new Set();

// Batch size for prefetching
const PREFETCH_BATCH_SIZE = 5;
let pendingPrefetches = [];
let prefetchTimer = null;

// Process batch prefetching
const processPrefetchBatch = async () => {
  if (pendingPrefetches.length === 0) return;
  
  const batch = [...pendingPrefetches];
  pendingPrefetches = [];
  
  try {
    // Use our batch fetch utility
    await fetchArticles(batch);
    batch.forEach(slug => prefetchedArticles.add(slug));
  } catch (error) {
    console.error('Error prefetching article batch:', error);
  }
};

// Prefetch article data when a card is hovered or visible in viewport
const prefetchArticle = async (slug) => {
  if (typeof window === 'undefined') return
  
  // Skip prefetching for already prefetched articles or invalid slugs
  if (!slug || slug.startsWith('placeholder-') || prefetchedArticles.has(slug)) {
    return;
  }
  
  try {
    // Prefetch the page navigation
    if (typeof window !== 'undefined' && window.next && window.next.router) {
      window.next.router.prefetch(`/posts/${slug}`);
    }
    
    // Add to batch prefetch queue
    pendingPrefetches.push(slug);
    prefetchedArticles.add(slug); // Mark as prefetched immediately to prevent duplicates
    
    // Clear existing timer and set a new one
    if (prefetchTimer) {
      clearTimeout(prefetchTimer);
    }
    
    // Process batch after short delay or when batch is full
    if (pendingPrefetches.length >= PREFETCH_BATCH_SIZE) {
      processPrefetchBatch();
    } else {
      prefetchTimer = setTimeout(processPrefetchBatch, 100);
    }
  } catch (error) {
    console.error('Error prefetching article:', slug, error)
  }
}

// Improved article card with better animations and loading states
const ArticleCard = ({ post, index, observer }) => {
  const cardRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isPrefetched, setIsPrefetched] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Validate if this is a real article, not a mock placeholder
  const isValidArticle = post && 
    post.slug && 
    !post.slug.startsWith('placeholder-') && 
    !post.slug.startsWith('mock-post-') &&
    post.title && 
    post.image;

  if (!isValidArticle) return null;

  // Set up intersection observer to detect when card is visible
  useEffect(() => {
    if (!cardRef.current || !observer) return
    
    observer.observe(cardRef.current)
    
    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current)
      }
    }
  }, [observer])
  
  // When card becomes visible, prefetch the article data
  useEffect(() => {
    if (isVisible && !isPrefetched && post.slug) {
      prefetchArticle(post.slug)
      setIsPrefetched(true)
    }
  }, [isVisible, isPrefetched, post.slug])

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div 
      ref={cardRef}
      className="article-card opacity-0 transform translate-y-4 transition-all duration-500"
      style={{ 
        transitionDelay: `${Math.min(index * 75, 400)}ms`,
      }}
    >
      <Link
        href={`/posts/${post.slug}`}
        className="block h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group"
        onMouseEnter={() => {
          if (!isPrefetched && post.slug) {
            prefetchArticle(post.slug)
            setIsPrefetched(true)
          }
        }}
      >
        <div className="relative h-48 overflow-hidden bg-gray-100">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <Image
            src={post.image}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={`object-cover transition-all duration-700 ${
              imageLoaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0'
            }`}
            unoptimized={post.image.includes('unsplash.com') || post.image.includes('http')}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="text-xs text-white/90 flex items-center space-x-2">
              <span className="flex items-center">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {post.readingTime || 3} min
              </span>
              <span>•</span>
              <span>{getRelativeTime(new Date(post.date))}</span>
            </div>
          </div>
          {post.trending && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-md">
              Trending
            </div>
          )}
          {post.isNew && !post.trending && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-md">
              New
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <div className="mb-2 flex">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
              {post.category || 'Technology'}
            </span>
          </div>
          <h3 className="font-bold text-lg mb-2 text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {post.excerpt}
          </p>
        </div>
      </Link>
    </div>
  )
}

export default function InfiniteArticles({ 
  posts = [], 
  initialPosts = [], 
  hasMore = true, 
  isLoadingMore = false, 
  onLoadMore = null,
  loadInitialPosts = null,
  initialLoadOnMount = false,
  forceLoad = null
}) {
  const [localPosts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMoreState, setHasMore] = useState(hasMore)
  const [visiblePosts, setVisiblePosts] = useState([])
  const [error, setError] = useState(null)
  const loadingRef = useRef(false)
  const initialLoadDoneRef = useRef(false)
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '1000px'
  })

  // Track failed page load attempts to prevent infinite loops
  const failedPagesRef = useRef(new Set());
  const maxConsecutiveFailures = useRef(0);

  // Initialize localPosts from initialPosts when component mounts
  useEffect(() => {
    if (initialPosts.length > 0 && localPosts.length === 0) {
      // Filter out mock articles
      const filteredPosts = initialPosts.filter(post => 
        post && post.slug && !post.slug.startsWith('placeholder-') && !post.slug.startsWith('mock-post-')
      );
      
      // Sort by date (newest first) before setting
      const sortedInitialPosts = [...filteredPosts].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      setPosts(sortedInitialPosts);
    }
  }, [initialPosts, localPosts.length])

  // Auto-load initial posts if initialLoadOnMount is true
  useEffect(() => {
    if (initialLoadOnMount && typeof loadInitialPosts === 'function' && !initialLoadDoneRef.current && posts.length === 0) {
      console.log('Auto-loading initial posts on component mount');
      initialLoadDoneRef.current = true;
      loadInitialPosts();
    }
  }, [initialLoadOnMount, loadInitialPosts, posts.length]);

  // Update hasMoreState when hasMore prop changes
  useEffect(() => {
    setHasMore(hasMore)
  }, [hasMore])

  // Update loading state when isLoadingMore prop changes
  useEffect(() => {
    setLoading(isLoadingMore)
  }, [isLoadingMore])

  // Filter and validate posts to ensure we only show real articles
  const displayPosts = useMemo(() => {
    let postsToDisplay = [];
    
    if (posts.length > 0) {
      postsToDisplay = posts;
    } else if (localPosts.length > 0) {
      postsToDisplay = localPosts;
    } else if (initialPosts.length > 0) {
      postsToDisplay = initialPosts;
    }
    
    // Filter out any mock posts or invalid entries
    return postsToDisplay.filter(post => 
      post && 
      post.slug && 
      !post.slug.startsWith('placeholder-') && 
      !post.slug.startsWith('mock-post-') &&
      post.title &&
      post.image
    );
  }, [posts, localPosts, initialPosts]);

  const loadMorePosts = useCallback(async () => {
    if (loading || loadingRef.current || !hasMoreState) {
      console.log(`Not loading more posts: loading=${loading}, loadingRef=${loadingRef.current}, hasMoreState=${hasMoreState}`);
      return;
    }
    
    // If a custom onLoadMore function is provided, use it
    if (typeof onLoadMore === 'function') {
      console.log('Using custom onLoadMore function');
      onLoadMore();
      return;
    }
    
    // Check if we've had too many consecutive failures
    if (maxConsecutiveFailures.current >= 3) {
      console.log(`Stopping after ${maxConsecutiveFailures.current} consecutive failed load attempts`);
      setError('Too many failed attempts to load articles. Please try again later or use the manual load button.');
      loadingRef.current = false;
      setLoading(false);
      return;
    }
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      // Use our cached fetch utility instead of direct fetch
      const nextPage = page + 1;
      console.log(`Loading more articles page ${nextPage}, current displayed count: ${displayPosts.length}`);
      
      // If we have no posts yet and loadInitialPosts is provided, use it first
      if (displayPosts.length === 0 && typeof loadInitialPosts === 'function' && !initialLoadDoneRef.current) {
        console.log('No posts yet, using loadInitialPosts function');
        initialLoadDoneRef.current = true;
        loadInitialPosts();
        return;
      }
      
      // Check if this page has repeatedly failed to load
      if (failedPagesRef.current.has(nextPage)) {
        console.log(`Page ${nextPage} previously failed to load, skipping to next page`);
        setPage(nextPage);
        setTimeout(() => {
          loadingRef.current = false;
          setLoading(false);
          loadMorePosts();
        }, 1000);
        return;
      }
      
      let data;
      const timestamp = Date.now();
      
      try {
        // Use our apiFetch instead of direct fetch - it handles fallbacks to Netlify functions
        const url = `/api/articles/page/${nextPage}?limit=30&nocache=${timestamp}`;
        data = await apiFetch(url);
        
        // Validate the response format
        if (!data || typeof data !== 'object') {
          console.error('API returned invalid data format:', data);
          throw new Error('Invalid API response format');
        }
        
        console.log('Raw response data:', JSON.stringify(data).substring(0, 150) + '...');
      } catch (fetchError) {
        console.error('Error fetching from API:', fetchError);
        setError('Error loading articles. Please try again.');
        
        // Mark this page as failed
        failedPagesRef.current.add(nextPage);
        maxConsecutiveFailures.current += 1;
        
        // Wait at least 3 seconds before allowing another attempt
        setTimeout(() => {
          loadingRef.current = false;
          setLoading(false);
        }, 3000);
        return;
      }
      
      // Map the response data to the format required by our component
      const newArticles = (data.articles || data.posts || []).slice(0, 30);
      const pagination = data.pagination || {};
      
      console.log(`Loaded ${newArticles?.length || 0} new articles, hasMore=${pagination.hasMore || false}`);
      
      // Check for empty response when pagination says there should be more
      if (newArticles.length === 0 && pagination.hasMore === true) {
        // If the server says there are more posts but returns none, try the next page
        console.warn(`API returned 0 articles for page ${nextPage} but claims there are more`);
        
        // Mark this page as problematic
        failedPagesRef.current.add(nextPage);
        setPage(nextPage); // Still advance the page
        
        setTimeout(() => {
          loadingRef.current = false;
          setLoading(false);
          if (pagination.hasMore) {
            loadMorePosts(); // Attempt to load the next page
          }
        }, 2000);
        return;
      }
      
      if (newArticles && newArticles.length > 0) {
        // We successfully got articles
        maxConsecutiveFailures.current = 0; // Reset the failure counter
        
        // Make a shallow copy of the display posts
        const updatedPosts = [...localPosts];
        
        // Add only new articles that aren't already in our list
        const currentIds = new Set(updatedPosts.map(p => p.slug));
        newArticles.forEach(article => {
          if (!currentIds.has(article.slug)) {
            updatedPosts.push(article);
          }
        });
        
        setPosts(updatedPosts);
        
        if (!pagination.hasMore) {
          setHasMore(false);
        }
      } else {
        // No more articles
        setHasMore(false);
      }
      
      // Update the page number
      setPage(nextPage);
      
      // Prefetch the next article if available
      if (newArticles && newArticles.length > 0) {
        // Queue prefetch for the first article of the next batch
        setTimeout(() => {
          newArticles.forEach(article => {
            if (article && article.slug && !prefetchedArticles.has(article.slug)) {
              prefetchedArticles.add(article.slug);
              fetchArticle(article.slug).catch(() => {
                // Silent fail for prefetch
              });
            }
          });
        }, 1000);
      }
      
      loadingRef.current = false;
      setLoading(false);
      
    } catch (err) {
      // Handle any unhandled errors in the loadMore process
      console.error('Error in loadMorePosts:', err);
      setError(`Error loading posts: ${err.message}`);
      maxConsecutiveFailures.current += 1;
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page, loading, hasMoreState, displayPosts, loadInitialPosts]);
  
  // Auto-loading effect with better stopping conditions
  useEffect(() => {
    // Log the current state
    console.log(`InfiniteArticles state: inView=${inView}, displayPosts=${displayPosts.length}, hasMoreState=${hasMoreState}, loading=${loading}, loadingRef=${loadingRef.current}`);
    
    // Make sure we're not in a loading state first
    if (loading || loadingRef.current) {
      console.log('Already loading, not triggering new load');
      return;
    }
    
    // IMPORTANT: Stop auto-loading after we have a reasonable number of articles
    // This prevents continuous loading but still ensures we have enough articles
    if (displayPosts.length > 250 && !window.forceLoadingMore) {
      console.log('Already loaded 250+ articles, stopping auto-load. User can manually load more if needed.');
      return;
    }
    
    // Save the current scroll position before loading more content
    let scrollPos = 0;
    if (typeof window !== 'undefined') {
      scrollPos = window.scrollY;
    }
    
    // Load more posts when scrolling into view, but with a debounce
    if (inView) {
      console.log('Intersection observer triggered, loading more posts');
      // Add a small delay to prevent multiple rapid calls
      const timer = setTimeout(() => {
        loadMorePosts();
      }, 300);
      return () => clearTimeout(timer);
    }
    // Also load more posts when we have around 20 articles displayed
    // This ensures we proactively fetch the next page before user reaches the bottom
    else if (displayPosts.length > 0 && displayPosts.length <= 20 && hasMoreState && !loading && !loadingRef.current) {
      console.log('Less than 20 articles displayed, proactively loading more');
      loadMorePosts();
    }
    // ADDITIONAL TRIGGER: Force load more if we have less than 100 articles
    else if (displayPosts.length > 0 && displayPosts.length < 100 && !loading && !loadingRef.current) {
      console.log('Less than 100 articles displayed, forcing load more');
      // Add a delay to avoid too many requests at once
      const timer = setTimeout(() => {
        loadMorePosts();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [inView, loadMorePosts, displayPosts.length, hasMoreState, loading]);
  
  // Add a separate effect to handle scroll restoration
  useEffect(() => {
    if (loading) {
      // Save scroll position when loading starts
      const scrollPos = window.scrollY;
      
      // Create a function to restore scroll after loading
      const restoreScroll = () => {
        if (!loading && scrollPos > 0) {
          // Use requestAnimationFrame to make sure this happens after render
          requestAnimationFrame(() => {
            window.scrollTo({
              top: scrollPos,
              behavior: 'auto' // Use 'auto' to prevent another animation
            });
          });
        }
      };
      
      // Set up an observer to watch for height changes in the grid
      const gridElement = document.querySelector('.infinite-scroll-container .grid');
      if (gridElement) {
        const resizeObserver = new ResizeObserver(() => {
          restoreScroll();
        });
        
        resizeObserver.observe(gridElement);
        return () => resizeObserver.disconnect();
      }
    }
  }, [loading]);

  // Create a ref for the intersection observer
  const observer = useRef(
    typeof window !== 'undefined' 
      ? new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              // When a card becomes visible
              if (entry.isIntersecting) {
                // Add animation class to make visible
                entry.target.classList.add('opacity-100', 'translate-y-0')
                
                // Find the article card element
                const cardElement = entry.target.closest('.article-card')
                if (cardElement && cardElement.parentNode) {
                  const cardIndex = Array.from(cardElement.parentNode.children).indexOf(cardElement)
                  // Mark it as visible for prefetching - use a more stable approach
                  setVisiblePosts(prev => {
                    // Only update if needed to avoid unnecessary renders
                    if (cardIndex >= 0 && !prev.includes(cardIndex)) {
                      // Create a new array only when we need to add a new index
                      const newIndexes = [...prev, cardIndex];
                      // Sort the indexes to ensure stable comparisons
                      return newIndexes.sort((a, b) => a - b);
                    }
                    return prev; // No change needed
                  })
                }
              }
            })
          },
          { threshold: 0.15 }
        )
      : null
  )

  return (
    <div className="infinite-scroll-container">
      <div className="explore-section py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 flex items-center">
            Explore More
            <span className="ml-2 text-sm font-normal text-gray-500">
              {displayPosts.length > 0 ? `(${displayPosts.length} articles)` : ''}
            </span>
          </h2>
          
          {displayPosts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayPosts.map((post, index) => (
                <ArticleCard 
                  key={`article-card-${post.slug}-${index}`}
                  post={post}
                  index={index}
                  observer={observer.current}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-1M8 12h.01M12 12h.01M16 12h.01M12 16h.01" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Articles Found</h3>
              <p className="text-sm text-gray-500">We couldn't find any articles to display at this time. Please check back later.</p>
            </div>
          )}
          
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-600">{error}</p>
              <button 
                onClick={() => loadMorePosts()} 
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-800"
              >
                Try Again
              </button>
            </div>
          )}
          
          {(hasMoreState || loading) && displayPosts.length > 0 && (
            <div 
              ref={loadMoreRef}
              className="loading-indicator flex justify-center my-8"
            >
              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-2"></div>
                  <span className="text-sm text-gray-500">Loading more articles...</span>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    console.log('Load More button clicked');
                    // Set global flag to indicate this was a button click
                    window.forceLoadingMore = true;
                    
                    // Force hasMore to true to ensure loading continues
                    setHasMore(true);
                    
                    // Skip ahead in pages to find new content
                    setPage(page + 3);
                    
                    // Use forceLoad prop if available, otherwise fall back to onLoadMore
                    if (typeof forceLoad === 'function') {
                      console.log('Using forceLoad function from props');
                      forceLoad();
                      
                      // Also set our internal state to ensure UI updates
                      setLoading(true);
                      
                      // Set a backup timer to clear loading state if parent function doesn't do it
                      setTimeout(() => {
                        if (loading) {
                          console.log('Backup timer: forceLoad function did not clear loading state');
                          setLoading(false);
                          window.forceLoadingMore = false;
                        }
                      }, 8000);
                    } else if (typeof onLoadMore === 'function') {
                      console.log('Calling parent onLoadMore function');
                      onLoadMore();
                      
                      // Also set our internal state to ensure UI updates
                      setLoading(true);
                      
                      // Set a backup timer to clear loading state if parent function doesn't do it
                      setTimeout(() => {
                        if (loading) {
                          console.log('Backup timer: Parent function did not clear loading state');
                          setLoading(false);
                          window.forceLoadingMore = false;
                        }
                      }, 8000);
                    } else {
                      console.log('Using component loadMorePosts function');
                      loadMorePosts();
                      
                      // Clear force loading flag after delay
                      setTimeout(() => {
                        window.forceLoadingMore = false;
                      }, 5000);
                    }
                  }} 
                  className="load-more-button px-6 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow flex items-center"
                >
                  <span>Load More Articles</span>
                  <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {!hasMoreState && !loading && displayPosts.length > 0 && (
            <div className="text-center py-6 text-sm text-gray-500 border-t border-gray-100 mt-8">
              <svg className="w-5 h-5 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className="block">
                {`Showing ${displayPosts.length} of 4,450 total articles`}
              </span>
              {/* Single consolidated load more button */}
              <button 
                onClick={() => {
                  console.log('Bottom Load More button clicked');
                  // Set global flag to indicate this was a button click
                  window.forceLoadingMore = true;
                  
                  // Force hasMore to true to ensure loading continues
                  setHasMore(true);
                  
                  // Skip ahead in pages to find new content
                  setPage(page + 3);
                  
                  // Use forceLoad prop if available, otherwise fall back to onLoadMore
                  if (typeof forceLoad === 'function') {
                    console.log('Using forceLoad function from props for bottom button');
                    forceLoad();
                    
                    // Also set our internal state to ensure UI updates
                    setLoading(true);
                    
                    // Set a backup timer to clear loading state if parent function doesn't do it
                    setTimeout(() => {
                      if (loading) {
                        console.log('Backup timer: forceLoad function did not clear loading state');
                        setLoading(false);
                        window.forceLoadingMore = false;
                      }
                    }, 8000);
                  } else if (typeof onLoadMore === 'function') {
                    console.log('Calling parent onLoadMore function from bottom button');
                    onLoadMore();
                    
                    // Also set our internal state to ensure UI updates
                    setLoading(true);
                    
                    // Set a backup timer to clear loading state if parent function doesn't do it
                    setTimeout(() => {
                      if (loading) {
                        console.log('Backup timer: Parent function did not clear loading state');
                        setLoading(false);
                        window.forceLoadingMore = false;
                      }
                    }, 8000);
                  } else {
                    console.log('Using component loadMorePosts function from bottom button');
                    loadMorePosts();
                    
                    // Clear force loading flag after delay
                    setTimeout(() => {
                      window.forceLoadingMore = false;
                    }, 5000);
                  }
                }} 
                className="mt-3 px-6 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow"
              >
                Load More Articles
              </button>
            </div>
          )}
          
          {/* Add a message when a substantial number of articles have been loaded */}
          {hasMoreState && !loading && displayPosts.length > 250 && (
            <div className="text-center mt-4 text-sm text-gray-500">
              <p className="mb-1">📚 You've read a substantial collection of articles!</p>
              <p className="text-xs">Click the button below to load more articles.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
