import { useState, useEffect, useRef, Component } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';
import dynamic from 'next/dynamic';
import { getRelativeTime, formatDate } from '../../utils/dateUtils';
import ArticleReactions from '../../components/ArticleReactions';
import AdSense from '../../components/AdSense';
import { extractTableOfContents } from '../../components/ArticleViewer';
import { getRelatedArticles, getArticleBySlug } from '../../utils/articleUtils';
import Header from '../../components/Header';
import Footer from '../../components/layout/Footer';

// Import components that don't have external dependencies
import SocialShare from '../../components/blog/SocialShare';
import TOCButton from '../../components/blog/TOCButton';
import FloatingShareBar from '../../components/blog/FloatingShareBar';
import AuthorBox from '../../components/blog/AuthorBox';
import RelatedArticles from '../../components/blog/RelatedArticles';
import TableOfContents from '../../components/blog/TableOfContents';
import BlogEditor from '../../components/blog/BlogEditor';

// Dynamically import MDX components to prevent build errors
const MDXRemote = dynamic(() => import('next-mdx-remote').then(mod => mod.MDXRemote), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-100 h-96 rounded-lg"></div>
});

// Dynamically import ArticleViewer without SSR to prevent hydration errors
const ArticleViewer = dynamic(() => import('../../components/ArticleViewer'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded"></div>
    </div>
  ),
});

// Dynamically import InfiniteArticles to avoid hydration issues
const InfiniteArticles = dynamic(() => import('../../components/home/InfiniteArticles'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((item) => (
        <div key={item} className="bg-white rounded-lg overflow-hidden shadow-sm animate-pulse h-64">
          <div className="h-36 bg-gray-200"></div>
          <div className="p-4 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      ))}
    </div>
  ),
});

// Extract tableOfContents function for client-side use
const extractTableOfContentsClient = (content) => {
  if (typeof window === 'undefined') {
    return [];
  }
  return extractTableOfContents(content);
};

// Custom components for layout elements
const components = {
  AdSense: (props) => <AdSense {...props} />,
  div: (props) => {
    if (props.className?.includes('adsbygoogle')) {
      return <AdSense slot="article-mid" />;
    }
    return <div {...props} />;
  },
};

// Define a function to safely handle relatedArticles data
const safeRelatedArticles = (relatedArticles) => {
  if (!relatedArticles || !Array.isArray(relatedArticles)) {
    return [];
  }
  
  // Filter out any invalid articles and ensure unique keys
  return relatedArticles
    .filter(article => article && typeof article === 'object') // Ensure only valid objects
    .map((article, i) => {
      // Make sure the slug exists and is valid
      if (!article.slug || typeof article.slug !== 'string' || article.slug.trim() === '') {
        article.slug = `article-${i}`;
      }
      
      // Ensure all required properties exist
      return {
        ...article,
        title: article.title || 'Untitled Article',
        excerpt: article.excerpt || 'No description available',
        date: article.date || new Date().toISOString(),
        image: article.image || 'https://Trendiingz.com/default-og-image.jpg',
        category: article.category || 'Uncategorized',
        readingTime: article.readingTime || 3
      };
    });
};

// Error Boundary component to catch errors in article rendering
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error("Article Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Render error fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-xl w-full bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-700 mb-4">
              We encountered an error while trying to load this article. 
              This might be temporary, so please try refreshing the page.
            </p>
            <div className="flex justify-between mt-6">
              <button 
                onClick={() => window.location.reload()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Refresh Page
              </button>
              <a 
                href="/"
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Go to Home
              </a>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-gray-100 rounded overflow-auto">
                <h2 className="text-sm font-bold text-gray-800 mb-2">Error Details (Development Only):</h2>
                <p className="text-xs font-mono text-red-600">{this.state.error?.toString()}</p>
                <pre className="text-xs mt-2 text-gray-700">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default function Post({ frontMatter, content, slug, relatedArticles: rawRelatedArticles }) {
  // Remove debug logs that print on every render
  // console.log("Article frontMatter:", frontMatter);
  // console.log("Categories:", frontMatter.categories);
  
  // Safely process related articles to ensure unique keys and valid data
  const relatedArticles = safeRelatedArticles(rawRelatedArticles);
  
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showShareButtons, setShowShareButtons] = useState(false);
  const [activeHeading, setActiveHeading] = useState('');
  const [showToc, setShowToc] = useState(false);
  const [showDesktopToc, setShowDesktopToc] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hideProgressBar, setHideProgressBar] = useState(false);
  const contentRef = useRef(null);
  const headingRefs = useRef({});
  const [tableOfContents, setTableOfContents] = useState([]); 

  // Set table of contents on the client side only
  useEffect(() => {
    setTableOfContents(extractTableOfContentsClient(content));
  }, [content]);

  // Infinite Articles state
  const [infinitePosts, setInfinitePosts] = useState([]);
  const [isLoadingInfinite, setIsLoadingInfinite] = useState(false);
  const [infinitePage, setInfinitePage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  // Local state for processed related articles
  const [processedRelatedArticles, setProcessedRelatedArticles] = useState([]);

  // Process related articles once when component mounts
  useEffect(() => {
    // Use the safe related articles function to process the raw data
    const safeArticles = safeRelatedArticles(rawRelatedArticles);
    setProcessedRelatedArticles(safeArticles);
  }, [rawRelatedArticles]);

  const [isMobile, setIsMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  // Initialize useEffect to handle the issue with API routes in static export
  useEffect(() => {
    // Initialize infinite articles from related articles
    if (processedRelatedArticles?.length > 0) {
      // Use the related articles as the base for infinite posts
      setInfinitePosts(processedRelatedArticles);
      
      // Try to load additional content asynchronously if API routes are available
      try {
        // Call loadInitialPosts, but don't wait for it
        loadInitialPosts();
      } catch (err) {
        console.error("Error initializing infinite posts:", err);
      }
    }
  }, [processedRelatedArticles]);

  // Replace loadInitialPosts with a version that uses cachedFetch with priority
  const loadInitialPosts = () => {
    if (isLoadingInfinite) return;
    
    setIsLoadingInfinite(true);
    
    // Extract categories from the current article
    const categoryNames = frontMatter.categories && Array.isArray(frontMatter.categories)
      ? frontMatter.categories.map(cat => typeof cat === 'string' ? cat : (cat.name || '')).filter(Boolean)
      : [];

    // Use cachedFetch with priority for the initial posts
    if (typeof window !== 'undefined') {
      // Attempt to fetch from API with high priority
      import('../../utils/lazyFetch')
        .then(({ cachedFetch }) => {
          // First try to get articles from the same categories
          if (categoryNames.length > 0) {
            // Build a query parameter with categories
            const categoryParam = categoryNames.map(cat => encodeURIComponent(cat)).join(',');
            cachedFetch(`/api/articles/byCategory?categories=${categoryParam}&limit=8`, {}, true)
              .then(data => {
                if (data && data.articles && data.articles.length > 0) {
                  setInfinitePosts(data.articles);
                  setHasMorePosts(true);
                  setIsLoadingInfinite(false);
                } else {
                  // Fall back to regular articles if no category matches
                  fetchRecentArticles();
                }
              })
              .catch(err => {
                console.log('Error fetching by category, falling back to recent:', err);
                fetchRecentArticles();
              });
          } else {
            // No categories specified, just get recent articles
            fetchRecentArticles();
          }
          
          // Helper function for fetching recent articles
          function fetchRecentArticles() {
            cachedFetch('/api/articles/recent?limit=8', {}, true)
              .then(data => {
                if (data && data.articles && data.articles.length > 0) {
                  setInfinitePosts(data.articles);
                  setHasMorePosts(true);
                } else if (processedRelatedArticles?.length > 0) {
                  // Fallback to related articles if API fails
                  setInfinitePosts(processedRelatedArticles);
                  setHasMorePosts(false);
                }
              })
              .catch(err => {
                console.log('Falling back to static content:', err);
                // Fallback to static content
                if (processedRelatedArticles?.length > 0) {
                  setInfinitePosts(processedRelatedArticles);
                }
                setHasMorePosts(false);
              })
              .finally(() => {
                setIsLoadingInfinite(false);
              });
          }
        })
        .catch(err => {
          console.error("Error importing lazyFetch:", err);
          // If module import fails, fall back to static content
    setTimeout(() => {
      if (processedRelatedArticles?.length > 0) {
              setInfinitePosts(processedRelatedArticles);
      }
      setIsLoadingInfinite(false);
            setHasMorePosts(false);
          }, 300);
        });
    } else {
      // Server-side rendering case - use static content
      setTimeout(() => {
        if (processedRelatedArticles?.length > 0) {
          setInfinitePosts(processedRelatedArticles);
        }
        setIsLoadingInfinite(false);
        setHasMorePosts(false);
      }, 300);
    }
  };

  // Update loadMoreInfinite to use cachedFetch
  const loadMoreInfinite = () => {
    // Check if we're already loading or if there are no more posts and it's not a manual load
    if (isLoadingInfinite && !window.forceLoadingMore) return;
    
    // Check for stopping condition: don't auto-load after 250 articles
    // But allow manual loading via button clicks (forceLoadingMore flag)
    if (infinitePosts.length > 250 && !window.forceLoadingMore) {
      console.log('Already loaded 250+ articles in [slug], stopping auto-load. User can manually load more if needed.');
      return;
    }
    
    setIsLoadingInfinite(true);
    // Increment page - if it's a forced load (from button), skip ahead more
    const nextPage = window.forceLoadingMore ? infinitePage + 3 : infinitePage + 1;
    console.log(`Loading more articles in [slug], page ${nextPage}, current count: ${infinitePosts.length}`);
    
    // Extract categories from the current article
    const categoryNames = frontMatter.categories && Array.isArray(frontMatter.categories)
      ? frontMatter.categories.map(cat => typeof cat === 'string' ? cat : (cat.name || '')).filter(Boolean)
      : [];
    
    if (typeof window !== 'undefined') {
      // Use dynamic import to avoid server-side issues
      import('../../utils/lazyFetch')
        .then(({ cachedFetch }) => {
          // Add a timestamp to ensure we don't get cached results
          const timestamp = Date.now();
          
          // Determine whether to continue fetching by category or regular pagination
          const fetchByCategory = categoryNames.length > 0 && infinitePosts.length > 0;
          
          // If we already have some articles and categories are available, fetch by category
          if (fetchByCategory) {
            const categoryParam = categoryNames.map(cat => encodeURIComponent(cat)).join(',');
            cachedFetch(`/api/articles/byCategory?categories=${categoryParam}&page=${nextPage}&limit=8&nocache=${timestamp}`, {}, false)
              .then(data => {
                if (data && data.articles && data.articles.length > 0) {
                  // Filter out invalid articles and duplicates
                  const existingSlugs = new Set(infinitePosts.map(post => post.slug));
                  const newArticles = data.articles.filter(article => 
                    article && 
                    article.slug && 
                    !article.slug.startsWith('placeholder-') && 
                    !article.slug.startsWith('mock-post-') &&
                    !existingSlugs.has(article.slug)
                  );
                  
                  console.log(`Found ${newArticles.length} new valid articles out of ${data.articles.length}`);
                  
                  if (newArticles.length > 0) {
                    // Sort by date before adding
                    const sortedArticles = [...newArticles].sort((a, b) => 
                      new Date(b.date) - new Date(a.date)
                    );
                    
                    setInfinitePosts(prev => {
                      const combined = [...prev, ...sortedArticles];
                      return combined.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                    });
                  }
                  
                  // Always keep hasMore true until we have a substantial number of articles
                  if (infinitePosts.length < 250 || window.forceLoadingMore) {
                    setHasMorePosts(true);
                  } else {
                    setHasMorePosts(data.articles.length >= 8);
                  }
                  
                  setInfinitePage(nextPage);
                } else {
                  // If no more articles by category, switch to regular pagination
                  fetchRegularArticles();
                }
              })
              .catch(err => {
                console.log('Error loading more articles by category, falling back:', err);
                fetchRegularArticles();
              })
              .finally(() => {
                setIsLoadingInfinite(false);
                // Clear the force loading flag after a delay
                if (window.forceLoadingMore) {
                  setTimeout(() => {
                    window.forceLoadingMore = false;
                  }, 1000);
                }
              });
          } else {
            fetchRegularArticles();
          }
          
          // Helper function for fetching regular paginated articles
          function fetchRegularArticles() {
            // Use cachedFetch without priority for additional pages
            cachedFetch(`/api/articles/page/${nextPage}?limit=8&nocache=${timestamp}`, {}, false)
              .then(data => {
                if (data && data.articles && data.articles.length > 0) {
                  // Filter out invalid articles and duplicates
                  const existingSlugs = new Set(infinitePosts.map(post => post.slug));
                  const newArticles = data.articles.filter(article => 
                    article && 
                    article.slug && 
                    !article.slug.startsWith('placeholder-') && 
                    !article.slug.startsWith('mock-post-') &&
                    !existingSlugs.has(article.slug)
                  );
                  
                  console.log(`Found ${newArticles.length} new valid articles out of ${data.articles.length}`);
                  
                  if (newArticles.length > 0) {
                    // Sort by date before adding
                    const sortedArticles = [...newArticles].sort((a, b) => 
                      new Date(b.date) - new Date(a.date)
                    );
                    
                    setInfinitePosts(prev => {
                      const combined = [...prev, ...sortedArticles];
                      return combined.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                    });
                  }
                  
                  // Always keep hasMore true until we have a substantial number of articles
                  if (infinitePosts.length < 250 || window.forceLoadingMore) {
                    setHasMorePosts(true);
                  } else {
                    setHasMorePosts(data.articles.length >= 8);
                  }
                  
                  setInfinitePage(nextPage);
                } else {
                  // Don't set hasMore to false if we're still under our target article count
                  if (infinitePosts.length < 250 || window.forceLoadingMore) {
                    setHasMorePosts(true);
                    // Try skipping ahead a page
                    setInfinitePage(nextPage + 1);
                  } else {
                    setHasMorePosts(false);
                  }
                }
              })
              .catch(err => {
                console.log('Error loading more posts:', err);
                // Don't set hasMore to false if we're still under our target article count
                if (infinitePosts.length < 250 || window.forceLoadingMore) {
                  setHasMorePosts(true);
                } else {
                  setHasMorePosts(false);
                }
              })
              .finally(() => {
                setIsLoadingInfinite(false);
                // Clear the force loading flag after a delay
                if (window.forceLoadingMore) {
                  setTimeout(() => {
                    window.forceLoadingMore = false;
                  }, 1000);
                }
              });
          }
        })
        .catch(err => {
          console.error("Error importing lazyFetch:", err);
          // Fallback if module import fails
          setIsLoadingInfinite(false);
          // Don't set hasMore to false if we're still under our target article count
          if (infinitePosts.length < 250 || window.forceLoadingMore) {
            setHasMorePosts(true);
          } else {
            setHasMorePosts(false);
          }
        });
    } else {
      // Server-side case - should not happen, but included for completeness
      setIsLoadingInfinite(false);
      if (infinitePosts.length < 250 || window.forceLoadingMore) {
        setHasMorePosts(true);
      } else {
        setHasMorePosts(false);
      }
    }
  };

  // Add a dedicated function to force loading more articles
  const forceLoadMoreArticles = () => {
    console.log('[slug] Force loading more articles triggered');
    
    // Set global flag to indicate this was a manual action
    window.forceLoadingMore = true;
    
    // Reset loading state
    setIsLoadingInfinite(false);
    
    // Clear any cached loading flags
    if (typeof window !== 'undefined') {
      // Reset the page if we're at a high number to start fresh
      if (infinitePage > 5) {
        setInfinitePage(1);
      } else {
        // Skip ahead to find new content
        setInfinitePage(infinitePage + 5);
      }
      
      // Force the hasMore state to true
      setHasMorePosts(true);
      
      // Trigger the load after a short delay
      setTimeout(() => {
        loadMoreInfinite();
      }, 100);
    }
  };

  // Make the function available globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.forceLoadMoreArticles_Slug = forceLoadMoreArticles;
      
      return () => {
        window.forceLoadMoreArticles_Slug = null;
      };
    }
  }, []);

  // Handle browser history and back button
  useEffect(() => {
    // Save the current pathname for checking navigation source
    const currentPath = window.location.pathname;
    
    // Only modify history state if there's a hash in the URL
    if (window.location.hash) {
      // Mark when navigating to an element
      const state = { fromTOC: true, source: currentPath };
      window.history.replaceState(
        state,
        '',
        window.location.pathname + window.location.hash
      );
    }

    const handlePopState = (event) => {
      // If navigating from within the same article (internal TOC navigation)
      if (event.state && event.state.fromTOC && event.state.source === currentPath) {
        console.log("Handling TOC navigation");
        // Allow normal handling for hash changes within this article
      } else {
        // This is external navigation (like clicking the logo to go home)
        console.log("External navigation detected");
        // Allow the normal navigation to proceed
        // IMPORTANT: Don't do anything here that might prevent navigation
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [slug]); // Changed from [frontMatter] to [slug] to prevent unnecessary re-initialization

  useEffect(() => {
    // Update view count
    const updateViews = async () => {
      try {
        // In a real app, you would update the view count in your database
        console.log('View count updated for:', slug);
      } catch (error) {
        console.error('Failed to update view count:', error);
      }
    };
    updateViews();

    let lastScrollPosition = 0;
    let ticking = false;
    let animationFrameId;
    let scrollTimer;
    
    // Add scroll event listener to track reading progress and active section
    const handleScroll = () => {
      const currentScrollPosition = window.scrollY;
      
      // Cancel any pending animation frame to prevent backlog during fast scrolling
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      // Use debouncing for heavy calculations like activeHeading detection
      clearTimeout(scrollTimer);
      
      // Only update if we've scrolled a meaningful amount (more frequent updates for smoother progress) 
      // or if we haven't processed an animation frame yet
      const hasScrolledSignificantly = Math.abs(currentScrollPosition - lastScrollPosition) > 2;
      
      if (!ticking || hasScrolledSignificantly) {
        lastScrollPosition = currentScrollPosition;
        
        animationFrameId = window.requestAnimationFrame(() => {
          // Find the "You might also like" section
          const relatedArticlesSection = document.querySelector('h2.text-3xl.font-bold.text-gray-800.mb-8');
          
          let progress = 0;
          if (relatedArticlesSection) {
            // Get the article content section
            const articleContent = contentRef.current;
            
            if (articleContent) {
              // Start point is the top of the article content
              const startY = articleContent.getBoundingClientRect().top + window.scrollY;
              // End point is the "You might also like" section
              const endY = relatedArticlesSection.getBoundingClientRect().top + window.scrollY;
              // Current scroll position
              const currentY = window.scrollY;
              
              // Calculate progress as percentage of distance between start and end points
              const totalDistance = endY - startY;
              const scrolledDistance = currentY - startY;
              
              // Check if we're above the starting point
              if (currentY < startY) {
                // Immediately reset progress to 0 when above the starting point
                progress = 0;
              } else {
                // Calculate normal progress when between start and end points
                progress = Math.min(100, Math.max(0, (scrolledDistance / totalDistance) * 100));
                
                // If we've scrolled past the end point, set progress to 100%
                if (currentY >= endY - window.innerHeight) {
                  progress = 100;
                }
              }
              
              // Check if we've scrolled past the "You might also like" section
              const relatedSectionVisiblePosition = relatedArticlesSection.getBoundingClientRect().top;
              // Hide progress bar when the section is above the viewport (or nearly so)
              setHideProgressBar(relatedSectionVisiblePosition < 100);
            } else {
              // Fallback if content ref isn't available
              const sectionPosition = relatedArticlesSection.getBoundingClientRect().top + window.scrollY;
              const totalScrollableDistance = sectionPosition - window.innerHeight;
              progress = Math.min(100, Math.max(0, (window.scrollY / totalScrollableDistance) * 100));
            }
          } else {
            // Fallback to the original calculation if the section isn't found
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
          }
          
          // Update scroll progress with requestAnimationFrame for smoother animation
          setScrollProgress(prevProgress => {
            // If we're at the top (progress = 0), reset immediately without easing
            if (progress === 0 && window.scrollY <= 10) {
              return 0;
            }
            // Otherwise apply subtle easing to the progress updates for smoother motion
            return prevProgress + (progress - prevProgress) * 0.15;
          });

          // Show/hide TOC based on scroll position and progress
          const heroHeight = window.innerHeight * 0.7; // 70vh - hero section height
          // Hide TOC completely when progress reaches 100%
          setShowDesktopToc(window.scrollY > heroHeight && progress < 100);

          if (progress > 25 && !showShareButtons && progress < 100) {
            setShowShareButtons(true);
          } else if ((progress <= 25 || progress >= 100) && showShareButtons) {
            setShowShareButtons(false);
          }
          
          // Reset ticking flag so we can process the next frame
          ticking = false;
          animationFrameId = null;
        });
        
        // Use debounced updates for the activeHeading since it's less critical for performance
        // and can cause more re-renders
        scrollTimer = setTimeout(() => {
          // Enhanced active heading detection - run less frequently for better performance
          if (tableOfContents.length > 0) {
            const headings = tableOfContents.map(h => ({
              id: h.slug,
              element: document.getElementById(h.slug)
            })).filter(h => h.element);

            const scrollPosition = window.scrollY;
            const headerOffset = 150;

            // Find the heading that's currently in view using a single pass
            let currentHeading = null;
            for (const heading of headings) {
              const element = heading.element;
              const rect = element.getBoundingClientRect();
              const offsetTop = rect.top + scrollPosition;
              
              if (scrollPosition >= offsetTop - headerOffset) {
                currentHeading = heading.id;
              } else {
                break;
              }
            }

            if (currentHeading && currentHeading !== activeHeading) {
              setActiveHeading(currentHeading);
              
              // Use replaceState to update hash without adding to history
              // Only update the URL when actually changing activeHeading
              window.history.replaceState(
                { 
                  isArticlePage: true, 
                  slug,
                  isTableOfContentsNavigation: true 
                },
                '',
                `#${currentHeading}`
              );
            } else if (!currentHeading && headings.length > 0 && !activeHeading) {
              setActiveHeading(headings[0].id);
            }
          }
        }, 100); // 100ms debounce for heading detection
        
        ticking = true;
      }
    };

    // Use passive: true for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Clean up any pending animation frame and timers
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      clearTimeout(scrollTimer);
    };
  }, [activeHeading, tableOfContents, slug, showShareButtons]);

  // Initialize refs for all headings after component mounts
  useEffect(() => {
    tableOfContents.forEach(heading => {
      const element = document.getElementById(heading.slug);
      if (element) {
        headingRefs.current[heading.slug] = element;
      }
    });
    
    // Set initial active heading if user lands on page with hash
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1);
      if (tableOfContents.some(h => h.slug === hash)) {
        setActiveHeading(hash);
      }
    } else if (tableOfContents.length > 0) {
      // Set first heading as active by default
      setActiveHeading(tableOfContents[0].slug);
    }
  }, [tableOfContents]);

  // Enhanced share function
  const shareArticle = (platform) => {
    // Get current URL safely
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const url = currentUrl || `https://Trendiingz.com/posts/${slug}`;
    const text = frontMatter.title;
    const summary = frontMatter.excerpt || '';
    
    // Only try to use navigator.share on the client side
    if (typeof window !== 'undefined') {
      // Check for native sharing capability
      if (navigator.share && 
          isMobile && 
          ['twitter', 'facebook', 'linkedin', 'whatsapp'].includes(platform)) {
        try {
          navigator.share({
            title: frontMatter.title,
            text: frontMatter.excerpt || '',
            url: window.location.href
          })
          .then(() => console.log('Successfully shared'))
          .catch((error) => console.log('Error sharing:', error));
          return;
        } catch (err) {
          console.error('Share API error:', err);
          // Fall back to normal sharing if navigator.share fails
        }
      }
    }
    
    let shareUrl;
    try {
      switch (platform) {
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
          break;
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
          break;
        case 'linkedin':
          // Use the full LinkedIn sharing URL with all parameters
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
          break;
        case 'reddit':
          shareUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
          break;
        case 'whatsapp':
          shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
          break;
        default:
          return;
      }

      // Only run this on the client side
      if (typeof window !== 'undefined') {
        // Open the share dialog in a new window
        const width = 600;
        const height = 400;
        const left = window.innerWidth / 2 - width / 2;
        const top = window.innerHeight / 2 - height / 2;

        // Handle LinkedIn specifically
        if (platform === 'linkedin') {
          window.open(url, '_blank'); // First open the article in a new tab
          setTimeout(() => {
            window.open(shareUrl, 'share', 
              `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=${top},left=${left}`
            );
          }, 100);
        } else {
          window.open(shareUrl, 'share',
            `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=${top},left=${left}`
          );
        }
      }
    } catch (error) {
      console.error('Error sharing article:', error);
      // Fallback: copy URL to clipboard if sharing fails
      if (typeof window !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          alert('Link copied to clipboard! You can now share it manually.');
        }).catch(() => {
          alert('Could not share article. Please try copying the URL manually.');
        });
      }
    }
  };

  // Function to copy URL to clipboard - make it isomorphic safe
  const copyToClipboard = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = `https://Trendiingz.com/posts/${slug}`;
      navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  };

  // Handle scroll to top
  const scrollToTop = () => {
    // Use smoother scrolling with better performance
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Prepare structured data for the article
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: frontMatter.title,
    description: frontMatter.excerpt,
    image: frontMatter.image,
    datePublished: frontMatter.date,
    dateModified: frontMatter.lastModified,
    publisher: {
      '@type': 'Organization',
      name: 'Trendiingz',
      logo: {
        '@type': 'ImageObject',
        url: 'https://Trendiingz.com/logo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': frontMatter.url
    },
    wordCount: frontMatter.wordCount,
    keywords: (frontMatter.keywords || []).join(', '),
    articleSection: frontMatter.category,
    inLanguage: frontMatter.locale
  };

  // Calculate read progress for the progress bar
  const progressBarStyle = {
    width: `${scrollProgress}%`
  };

  // Create a toggle function for the TOC on mobile
  const toggleTableOfContents = () => {
    setShowToc(!showToc);
  };

  // Popular topics for header - you can make this dynamic based on your data
  const popularTopics = [
    { name: 'Technology', href: '/topics/technology' },
    { name: 'AI', href: '/topics/ai' },
    { name: 'Business', href: '/topics/business' },
    { name: 'Design', href: '/topics/design' },
    { name: 'Productivity', href: '/topics/productivity' },
    { name: 'Health', href: '/topics/health' },
  ];

  // Initialize useEffect for mobile detection
  useEffect(() => {
    // Set initial values
    setIsMobile(window.innerWidth < 640);
    setWindowWidth(window.innerWidth);
    
    // Handle resize events
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize useEffect for mobile Safari detection and fixing
  useEffect(() => {
    // Detect iOS Safari and add a class to the body for iOS-specific fixes
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      document.body.classList.add('ios-device');
      
      // Fix for iOS Safari viewport height issues
      const fixViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      fixViewportHeight();
      window.addEventListener('resize', fixViewportHeight);
      window.addEventListener('orientationchange', fixViewportHeight);
      
      return () => {
        window.removeEventListener('resize', fixViewportHeight);
        window.removeEventListener('orientationchange', fixViewportHeight);
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <Head>
        <title>{`${frontMatter.title} | Trendiingz - Latest Tech & Trends`}</title>
        <meta name="description" content={frontMatter.excerpt} />
        <meta name="keywords" content={frontMatter.keywords?.join(', ') || ''} />
        
        {/* Basic SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Trendiingz" />
        <link rel="canonical" href={`https://Trendiingz.com/posts/${slug}`} />
        
        {/* Open Graph */}
        <meta property="og:site_name" content="Trendiingz" />
        <meta property="og:title" content={frontMatter.title} />
        <meta property="og:description" content={frontMatter.excerpt} />
        <meta property="og:image" content={frontMatter.image} />
        <meta property="og:image:alt" content={frontMatter.imageAlt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://Trendiingz.com/posts/${slug}`} />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@Trendiingz" />
        <meta name="twitter:title" content={frontMatter.title} />
        <meta name="twitter:description" content={frontMatter.excerpt} />
        <meta name="twitter:image" content={frontMatter.image} />
        
        {/* Article Metadata */}
        <meta property="article:published_time" content={frontMatter.date} />
        <meta property="article:modified_time" content={frontMatter.lastModified} />
        <meta property="article:section" content={frontMatter.category} />
        {frontMatter.keywords?.map((keyword) => (
          <meta key={keyword} property="article:tag" content={keyword} />
        ))}

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />

        {/* Mobile-specific fixes */}
        <style jsx global>{`
          @media (max-width: 640px) {
            /* Fix for iOS 100vh issue */
            .ios-device .h-\[60vh\] {
              height: calc(var(--vh, 1vh) * 60);
            }
            
            /* Improve touch targets for mobile */
            button, a {
              min-height: 44px;
            }
            
            /* Optimize typography for mobile */
            .prose h1 { font-size: 1.75rem; }
            .prose h2 { font-size: 1.5rem; }
            .prose h3 { font-size: 1.25rem; }
            .prose p, .prose ul, .prose ol { font-size: 1rem; }
            
            /* Improve spacing for mobile reading */
            .prose p { margin-bottom: 1.25em; }
          }
          
          /* Optimize scrolling performance */
          @media (pointer: coarse) {
            * {
              -webkit-overflow-scrolling: touch;
            }
            
            /* Prevent overscroll bounce on iOS */
            html, body {
              overscroll-behavior-y: none;
            }
          }
        `}</style>
      </Head>

      {/* Header Section */}
      <Header />

        {/* Enhanced progress bar - use hardware acceleration */}
      <div className={`h-0.5 bg-gray-100 w-full overflow-hidden transition-opacity duration-300 ease-out sticky top-16 z-40 ${hideProgressBar ? 'opacity-0' : 'opacity-100'}`}>
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 will-change-transform"
            style={{
              transform: `scaleX(${scrollProgress / 100})`,
              transformOrigin: 'left',
              transition: 'transform 250ms cubic-bezier(0.33, 1, 0.68, 1)'
            }}
          ></div>
            </div>

      <article className="bg-white pb-16" itemScope itemType="https://schema.org/Article">
        {/* Hero Section with Gradient Overlay - Improved for better mobile display */}
        <div className="relative h-[60vh] sm:h-[70vh] min-h-[450px] sm:min-h-[600px] w-full">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/30 z-10" />
          <Image
            src={frontMatter.image}
            alt={frontMatter.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
            itemProp="image"
            unoptimized={frontMatter.image.includes('unsplash.com') || frontMatter.image.includes('http')}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 z-20 max-w-4xl mx-auto">
            <div className="space-y-3 sm:space-y-4">
              {/* Categories */}
              {frontMatter.categories && frontMatter.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {/* Show exact category first with special styling */}
                  {frontMatter.categories
                    .filter(cat => cat.type === 'exact')
                    .map((category, index) => (
                      <a 
                        key={`exact-${index}-${category.name}`}
                        href={`/topics/${encodeURIComponent(category.name)}`}
                        className="inline-block bg-white/90 backdrop-blur-sm text-gray-800 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium hover:bg-white transition-colors"
                      >
                        {category.name}
                      </a>
                    ))
                  }
                
                  {/* Display general categories next */}
                  {frontMatter.categories
                    .filter(cat => cat.type === 'general')
                    .map((category, index) => (
                      <a 
                        key={`general-${index}-${category.name}`}
                        href={`/topics/${encodeURIComponent(category.name)}`}
                        className="inline-block bg-green-100 text-green-800 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium hover:bg-green-200 transition-colors"
                      >
                        {category.name}
                      </a>
                    ))
                  }
                  
                  {/* Only show a limited number of categories on mobile */}
                  {frontMatter.categories
                    .filter(cat => cat.type !== 'general' && cat.type !== 'exact')
                    .slice(0, isMobile ? 2 : frontMatter.categories.length)
                    .map((category, index) => {
                      // Style based on category type
                      let bgColor = 'bg-gray-100';
                      let textColor = 'text-gray-800';
                      let hoverBg = 'hover:bg-gray-200';
                      
                      if (category.type === 'specific') {
                        bgColor = 'bg-blue-100';
                        textColor = 'text-blue-800';
                        hoverBg = 'hover:bg-blue-200';
                      } else if (category.type === 'medium') {
                        bgColor = 'bg-purple-100';
                        textColor = 'text-purple-800';
                        hoverBg = 'hover:bg-purple-200';
                      } else if (category.type === 'niche') {
                        bgColor = 'bg-yellow-100';
                        textColor = 'text-yellow-800';
                        hoverBg = 'hover:bg-yellow-200';
                      }
                      
                      return (
                        <a 
                          key={`other-${index}-${category.name}`}
                          href={`/topics/${encodeURIComponent(category.name)}`}
                          className={`inline-block ${bgColor} ${textColor} ${hoverBg} px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors`}
                        >
                          {category.name}
                        </a>
                      );
                    })
                  }
                  
                  {/* Show +X more if we've truncated categories on mobile */}
                  {isMobile && 
                    frontMatter.categories.filter(cat => cat.type !== 'general' && cat.type !== 'exact').length > 2 && (
                    <span className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                      +{frontMatter.categories.filter(cat => cat.type !== 'general' && cat.type !== 'exact').length - 2} more
                    </span>
                  )}
                </div>
              )}
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                {frontMatter.title}
              </h1>
              <div className="flex items-center space-x-4 text-white/90 text-xs sm:text-sm md:text-base">
                <time dateTime={frontMatter.date}>
                  {new Date(frontMatter.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
                <span>•</span>
                <span>{frontMatter.readingTime} min read</span>
              </div>
            </div>
          </div>
        </div>

        {/* Add the photographer attribution centered beneath the hero image */}
        {frontMatter.imageCredit && (
          <div className="text-center py-2.5 border-b border-gray-100 text-gray-500 text-xs md:text-sm font-medium">
            <div className="max-w-3xl mx-auto px-4">
              <div dangerouslySetInnerHTML={{ __html: frontMatter.imageCredit
                .replace(/\*/g, '')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
                  // Add UTM parameters to Unsplash links
                  if (url.includes('unsplash.com')) {
                    // Separate the URL from any query parameters that might already exist
                    const [baseUrl, existingQuery] = url.split('?');
                    const separator = existingQuery ? '&' : '?';
                    const utmParams = `utm_source=trendiingz&utm_medium=referral`;
                    return `<a href="${baseUrl}${separator}${utmParams}" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:text-indigo-700 transition-colors">${text}</a>`;
                  }
                  // Return normal links unchanged
                  return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:text-indigo-700 transition-colors">${text}</a>`;
                })
              }} />
            </div>
          </div>
        )}

        {/* Enhanced Floating Share Buttons - Now with mobile optimization */}
        <div className={`fixed z-30 transition-opacity duration-300 ${showShareButtons ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${
          // Position differently on mobile vs desktop - using state instead of direct window check
          isMobile 
            ? 'bottom-4 left-1/2 transform -translate-x-1/2' 
            : 'left-4 top-1/2 transform -translate-y-1/2'
        }`}>
          <div className={`flex ${
            // Horizontal on mobile, vertical on desktop - using state instead of direct window check
            isMobile 
              ? 'flex-row space-x-3 px-4' 
              : 'flex-col space-y-3'
          } bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg`}>
            {!isMobile && (
              <h4 className="text-sm font-medium text-gray-600 text-center mb-2">Share</h4>
            )}
            <button 
              onClick={() => shareArticle('twitter')} 
              className="w-10 h-10 rounded-full bg-[#1DA1F2] text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
              aria-label="Share on Twitter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.083 10.083 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.93 4.93 0 001.522 6.574 4.97 4.97 0 01-2.229-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.9 13.9 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63a9.935 9.935 0 002.46-2.548l-.047-.02z"/>
              </svg>
            </button>
            <button 
              onClick={() => shareArticle('facebook')} 
              className="w-10 h-10 rounded-full bg-[#4267B2] text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
              aria-label="Share on Facebook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
              </svg>
            </button>
            <button 
              onClick={() => shareArticle('linkedin')} 
              className="w-10 h-10 rounded-full bg-[#0A66C2] text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
              aria-label="Share on LinkedIn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </button>
            <button 
              onClick={() => shareArticle('whatsapp')} 
              className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
              aria-label="Share on WhatsApp"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </button>
            {isMobile ? (
              // Show fewer buttons on mobile to avoid crowding
              <button 
                onClick={scrollToTop} 
                className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
                aria-label="Scroll to top"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            ) : (
              // Show all buttons on desktop
              <>
                <button 
                  onClick={copyToClipboard} 
                  className="w-10 h-10 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                  aria-label="Copy link"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" />
                  </svg>
                </button>
                <button 
                  onClick={scrollToTop} 
                  className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
                  aria-label="Scroll to top"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Article Content */}
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12" ref={contentRef}>

          {/* Mobile TOC Toggle Button - Only show when we have TOC content */}
          {tableOfContents.length > 1 && (
            <button 
              onClick={toggleTableOfContents}
              className="lg:hidden sticky top-4 z-30 float-right ml-4 mb-4 bg-white/95 backdrop-blur-md text-indigo-600 p-2.5 rounded-full shadow-md border border-gray-100 flex items-center justify-center hover:bg-indigo-50 transition-colors"
              aria-label={showToc ? "Hide table of contents" : "Show table of contents"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${showToc ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
          )}

          {/* Mobile Table of Contents - Optimize transitions and animations */}
          {tableOfContents.length > 1 && (
            <div className={`lg:hidden fixed inset-0 z-40 ${showToc ? 'block' : 'hidden'}`}>
              <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
                style={{ opacity: showToc ? 1 : 0 }}
                onClick={() => setShowToc(false)}
              ></div>
              <div className={`absolute right-0 top-0 bottom-0 w-3/4 max-w-xs bg-white shadow-xl overflow-hidden flex flex-col transform transition-all duration-300 ease-out ${
                showToc ? 'translate-x-0' : 'translate-x-full'
              }`}>
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-base text-gray-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                    Contents
                  </h3>
                  <button 
                    onClick={() => setShowToc(false)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Close table of contents"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Reading progress - Hardware accelerated transitions */}
                <div className={`relative h-1 bg-gray-100 ${hideProgressBar ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ease-out`}>
                  <div 
                    className="absolute top-0 left-0 right-0 h-full bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 will-change-transform"
                    style={{
                      transform: `scaleX(${scrollProgress / 100})`,
                      transformOrigin: 'left',
                      transition: 'transform 250ms cubic-bezier(0.33, 1, 0.68, 1)'
                    }}
                  >
                    <div className="absolute top-0 right-0 h-full w-1 bg-white/20"></div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <nav className="px-4 py-3 scroll-smooth">
                    <div className="relative">
                      <div className="absolute top-0 bottom-0 left-[6px] w-0.5 bg-gradient-to-b from-indigo-500/10 to-purple-500/10 rounded-full"></div>
                      <div className="space-y-0.5">
                        {tableOfContents.map((heading) => {
                          const isActive = heading.slug === activeHeading;
                          const isMainHeading = heading.level === 2;
                          
                          return (
                            <a
                              key={`toc-${heading.slug}`}
                              href={`#${heading.slug}`}
                              onClick={(e) => {
                                e.preventDefault();
                                const element = document.getElementById(heading.slug);
                                if (element) {
                                  // Update URL hash without breaking navigation
                                  window.history.replaceState(
                                    { 
                                      fromTOC: true, 
                                      source: window.location.pathname,
                                      slug
                                    },
                                    '',
                                    `${window.location.pathname}#${heading.slug}`
                                  );
                                  
                                  // Smooth scroll to element with offset
                                  const headerOffset = 100;
                                  const elementPosition = element.getBoundingClientRect().top;
                                  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                                  
                                  window.scrollTo({
                                    top: offsetPosition,
                                    behavior: 'smooth'
                                  });
                                  
                                  setActiveHeading(heading.slug);
                                  setShowToc(false); // Close the mobile TOC after selection
                                }
                              }}
                              className={`group flex items-center py-1.5 ${
                                isMainHeading ? 'font-medium' : 'pl-4 text-[13px]'
                              } ${isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-500'}`}
                            >
                              <span className={`relative flex h-2 w-2 min-w-[8px] mr-2.5 ${isActive ? 'mt-0' : 'mt-0'}`}>
                                <span className={`absolute inset-0 rounded-full ${isActive 
                                  ? 'bg-indigo-600 shadow-sm shadow-indigo-200' 
                                  : 'bg-gray-300 group-hover:bg-gray-400'
                                }`}></span>
                                {isActive && (
                                  <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-75 duration-100"></span>
                                )}
                              </span>
                              <span className={`truncate will-change-transform ${isActive ? 'font-medium transform translate-x-0.5 transition-transform duration-150 ease-out' : ''}`}>
                                {heading.text}
                              </span>
                              {isActive && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 min-w-[12px] ml-auto text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </nav>
                </div>
                
                <div className="p-4 border-t border-gray-100 flex justify-between items-center">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <span className="tabular-nums">{Math.round(scrollProgress)}% read</span>
                  </div>
                  <button 
                    onClick={() => setShowToc(false)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Table of Contents - Optimize transitions */}
          {tableOfContents.length > 1 && (
            <div className={`hidden lg:block fixed right-8 z-10 transition-all duration-300 ease-out ${
              showDesktopToc ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`} style={{ top: 'max(80px, 15vh)' }}>
              <div className="w-64 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 transition-all duration-300 will-change-transform hover:shadow-xl">
                <div className="flex flex-col h-[500px]">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-base text-gray-800 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                      </svg>
                      Contents
                    </h3>
                    <div className="flex items-center space-x-1">
                      <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                      <span className="text-xs text-gray-500 tabular-nums will-change-contents">
                        {Math.round(scrollProgress)}%
                      </span>
                    </div>
                  </div>

                  <div className={`relative h-1 bg-gray-100 ${hideProgressBar ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ease-out`}>
                    <div 
                      className="absolute top-0 left-0 right-0 h-full bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 will-change-transform"
                      style={{
                        transform: `scaleX(${scrollProgress / 100})`,
                        transformOrigin: 'left',
                        transition: 'transform 250ms cubic-bezier(0.33, 1, 0.68, 1)'
                      }}
                    >
                      <div className="absolute top-0 right-0 h-full w-1 bg-white/20"></div>
                    </div>
                  </div>

                  <nav className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 scroll-smooth scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300">
                    <div className="relative">
                      <div className="absolute top-0 bottom-0 left-[6px] w-0.5 bg-gradient-to-b from-indigo-500/10 to-purple-500/10 rounded-full"></div>
                      <div className="space-y-0.5">
                        {tableOfContents.map((heading, index) => {
                          const isActive = heading.slug === activeHeading;
                          const isMainHeading = heading.level === 2;
                          
                          return (
                            <a
                              key={`desktop-toc-${heading.slug}`}
                              href={`#${heading.slug}`}
                              onClick={(e) => {
                                e.preventDefault();
                                const element = document.getElementById(heading.slug);
                                if (element) {
                                  // Update URL hash without breaking navigation
                                  window.history.replaceState(
                                    { 
                                      fromTOC: true, 
                                      source: window.location.pathname,
                                      slug
                                    },
                                    '',
                                    `${window.location.pathname}#${heading.slug}`
                                  );
                                  
                                  const headerOffset = 120;
                                  const elementPosition = element.getBoundingClientRect().top;
                                  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                                  
                                  window.scrollTo({
                                    top: offsetPosition,
                                    behavior: 'smooth'
                                  });
                                  
                                  setActiveHeading(heading.slug);
                                  setShowToc(false); // Close the mobile TOC after selection
                                }
                              }}
                              className={`group flex items-center py-1.5 transition-all duration-200 ${
                                isMainHeading ? 'font-medium' : 'pl-4 text-[13px]'
                              } ${isActive ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-500'}`}
                            >
                              <span className={`relative flex h-2 w-2 min-w-[8px] mr-2.5 will-change-transform ${
                                isActive ? 'scale-110' : 'scale-100'
                              }`} style={{ transition: 'transform 200ms cubic-bezier(0.33, 1, 0.68, 1)' }}>
                                <span className={`absolute inset-0 rounded-full transition-colors duration-200 ${
                                  isActive 
                                    ? 'bg-indigo-600 shadow-sm shadow-indigo-200' 
                                    : 'bg-gray-300 group-hover:bg-gray-400'
                                }`}></span>
                                {isActive && (
                                  <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-75 duration-100"></span>
                                )}
                              </span>
                              <span className={`relative will-change-transform transition-all duration-200 truncate ${
                                isActive 
                                  ? 'font-medium translate-x-0.5' 
                                  : 'translate-x-0'
                              }`} style={{ transition: 'transform 200ms cubic-bezier(0.33, 1, 0.68, 1)' }}>
                                <span className={`absolute left-0 right-0 h-0.5 -bottom-0.5 bg-indigo-500 origin-left will-change-transform ${
                                  isActive ? 'scale-x-100' : 'scale-x-0'
                                }`} style={{ transition: 'transform 250ms cubic-bezier(0.33, 1, 0.68, 1)' }}></span>
                                {heading.text}
                              </span>
                              {isActive && (
                                <svg xmlns="http://www.w3.org/2000/svg" 
                                  className="h-3 w-3 min-w-[12px] ml-auto text-indigo-500 will-change-transform"
                                  viewBox="0 0 20 20" 
                                  fill="currentColor"
                                >
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </nav>
                </div>
              </div>
            </div>
          )}

          {/* Article Excerpt - Only show separately if specified */}
          {frontMatter.showExcerptSeparately && (
            <div className="mb-12 text-xl text-gray-600 leading-relaxed border-l-4 border-indigo-500 pl-6 py-2">
              {frontMatter.excerpt}
            </div>
          )}

          {/* Categories section - More compact on mobile */}
          {frontMatter.categories && frontMatter.categories.length > 0 && (
            <div className="mb-8 sm:mb-12">
              <h3 className="text-xs sm:text-sm uppercase tracking-wider font-medium text-gray-500 mb-2 sm:mb-3">Browse by category</h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {/* Display general categories first with larger size */}
                {frontMatter.categories
                  .filter(cat => cat.type === 'general')
                  .map((category, index) => (
                    <a 
                      key={`general-content-${index}`}
                      href={`/topics/${encodeURIComponent(category.name)}`}
                      className="bg-green-100 hover:bg-green-200 text-green-800 px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors"
                    >
                      {category.name}
                    </a>
                  ))
                }
                
                {/* Display other categories */}
                {frontMatter.categories
                  .filter(cat => cat.type !== 'general')
                  .map((category, index) => {
                    // Style based on category type
                    let bgColor = 'bg-gray-100';
                    let textColor = 'text-gray-800';
                    let hoverBg = 'hover:bg-gray-200';
                    
                    if (category.type === 'specific') {
                      bgColor = 'bg-blue-100';
                      textColor = 'text-blue-800';
                      hoverBg = 'hover:bg-blue-200';
                    } else if (category.type === 'medium') {
                      bgColor = 'bg-purple-100';
                      textColor = 'text-purple-800'; 
                      hoverBg = 'hover:bg-purple-200';
                    } else if (category.type === 'niche') {
                      bgColor = 'bg-yellow-100';
                      textColor = 'text-yellow-800';
                      hoverBg = 'hover:bg-yellow-200';
                    }
                    
                    return (
                      <a 
                        key={`other-content-${index}`}
                        href={`/topics/${encodeURIComponent(category.name)}`}
                        className={`${bgColor} ${textColor} ${hoverBg} px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors`}
                      >
                        {category.name}
                      </a>
                    );
                  })
                }
              </div>
            </div>
          )}

          {/* Main Content - Improved prose for mobile */}
          <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none w-full prose-headings:text-gray-800 prose-p:text-gray-700 prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:text-indigo-800 prose-img:w-full prose-img:rounded-lg">
            {/* Only render ArticleViewer on the client side */}
            <ArticleViewer content={content} />
          </div>

          {/* Article CTA - Improved for mobile */}
          <div className="my-10 sm:my-16 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-sm">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">Stay updated with the latest trends</h3>
            <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6">Get exclusive content and be the first to know about new articles.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="flex-grow px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button href="http://twitter.com/trendiingz" target="_blank" className="bg-indigo-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap">
                Subscribe Now
              </button>
            </div>
          </div>

          {/* Simplified Article Footer */}
          <footer className="mt-10 sm:mt-16 pt-6 sm:pt-8 border-t border-gray-100">
            <div className="flex flex-col space-y-6">
              {/* Categories */}
              {frontMatter.categories && frontMatter.categories.length > 0 && (
                <div>
                  <div className="text-xs sm:text-sm text-gray-500 uppercase mb-2">Categories</div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {frontMatter.categories.map((category, index) => {
                      // Style based on category type
                      let bgColor = 'bg-gray-50';
                      let textColor = 'text-gray-700';
                      
                      if (category.type === 'general') {
                        bgColor = 'bg-green-50';
                        textColor = 'text-green-700';
                      } else if (category.type === 'specific') {
                        bgColor = 'bg-blue-50';
                        textColor = 'text-blue-700';
                      } else if (category.type === 'medium') {
                        bgColor = 'bg-purple-50';
                        textColor = 'text-purple-700';
                      } else if (category.type === 'niche') {
                        bgColor = 'bg-yellow-50';
                        textColor = 'text-yellow-700';
                      }
                      
                      return (
                        <Link
                          href={`/topics/${encodeURIComponent(category.name.toLowerCase().replace(/\s+/g, '-'))}`}
                          key={`footer-${index}`}
                          className={`${bgColor} ${textColor} hover:bg-opacity-80 transition-colors px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm`}
                        >
                          {category.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Last Updated */}
              <div className="text-xs sm:text-sm text-gray-500">
                Last updated: {(() => {
                  // Check if lastModified is a valid date
                  const lastModDate = frontMatter.lastModified ? new Date(frontMatter.lastModified) : null;
                  const isValidDate = lastModDate && !isNaN(lastModDate.getTime());
                  
                  if (isValidDate) {
                    return lastModDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                  } else {
                    // Fallback to article date if lastModified is invalid
                    const pubDate = frontMatter.date ? new Date(frontMatter.date) : new Date();
                    return pubDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                  }
                })()}
              </div>
            </div>
          </footer>
        </div>

        {/* Related Articles - Shows articles that share categories */}
        <div className="bg-gray-50 py-10 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">
              You might also like
              <span className="ml-2 text-sm font-medium text-gray-500">
                Articles related to {frontMatter.category}
              </span>
            </h2>
            {processedRelatedArticles && processedRelatedArticles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {processedRelatedArticles.map((article, index) => {
                  // Extract category names from the article's categories
                  const articleCategoryNames = article.categories && Array.isArray(article.categories)
                    ? article.categories.map(cat => typeof cat === 'string' ? cat : (cat.name || '')).filter(Boolean)
                    : [];
                  
                  // Extract current article's category names
                  const currentCategoryNames = frontMatter.categories && Array.isArray(frontMatter.categories)
                    ? frontMatter.categories.map(cat => typeof cat === 'string' ? cat : (cat.name || '')).filter(Boolean)
                    : [];
                  
                  // Find matching categories
                  const matchingCategories = articleCategoryNames.filter(catName => 
                    currentCategoryNames.some(currentCat => 
                      currentCat.toLowerCase() === catName.toLowerCase() || 
                      currentCat.toLowerCase().includes(catName.toLowerCase()) ||
                      catName.toLowerCase().includes(currentCat.toLowerCase())
                    )
                  );
                  
                  return (
                  <a
                    href={`/posts/${article.slug}`}
                    key={`related-${article.slug}-${index}`}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group h-full flex flex-col"
                  >
                    <div className="relative h-36 sm:h-40 w-full">
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                        unoptimized={article.image.includes('unsplash.com') || article.image.includes('http')}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {matchingCategories.length > 0 && (
                          <div className="absolute top-3 right-3 bg-purple-600 text-white text-xs px-2 py-1 rounded-md">
                            Matching Topic
                          </div>
                        )}
                    </div>
                    <div className="p-4 sm:p-5 flex-grow flex flex-col justify-between">
                      <div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {article.category && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                matchingCategories.includes(article.category) 
                                  ? 'bg-indigo-200 text-indigo-800' 
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}>
                            {article.category}
                          </span>
                            )}
                            {articleCategoryNames.length > 0 && articleCategoryNames.slice(0, 2).map((catName, i) => {
                              if (catName === article.category) return null;
                              const isMatching = matchingCategories.includes(catName);
                              return (
                                <span 
                                  key={`cat-${i}`}
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    isMatching 
                                      ? 'bg-purple-200 text-purple-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {catName}
                                </span>
                              );
                            })}
                            {articleCategoryNames.length > 2 && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full font-medium">
                                +{articleCategoryNames.length - 2} more
                              </span>
                            )}
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                          {article.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-3 sm:mb-4">
                          {article.excerpt}
                        </p>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>{article.readingTime} min read</span>
                        <span className="mx-2">•</span>
                        <span>{getRelativeTime(new Date(article.date))}</span>
                      </div>
                    </div>
                  </a>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 bg-white rounded-xl shadow-sm text-center">
                <p className="text-gray-600">No related articles found at this time.</p>
              </div>
            )}
          </div>
        </div>

        {/* Infinite Articles Section - Always display, even with empty initial data */}
        <div className="bg-white py-8 mt-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">Explore More</h2> */}
            {/* Pass loadInitialPosts as a ref to InfiniteArticles to ensure it loads automatically */}
            <InfiniteArticles 
              posts={infinitePosts.length > 0 ? infinitePosts : []}
              hasMore={hasMorePosts}
              isLoadingMore={isLoadingInfinite}
              onLoadMore={loadMoreInfinite}
              loadInitialPosts={loadInitialPosts}
              initialLoadOnMount={true}
              forceLoad={forceLoadMoreArticles} // Add force load function for manual loading
            />
          </div>
        </div>
      </article>
      
      {/* Footer */}
      <Footer />
    </ErrorBoundary>
  );
}

export async function getStaticPaths() {
  try {
    // Import the optimized utilities 
    const { preloadArticleCache, articleCache } = await import('../../utils/articleUtils');
    
    // Ensure we have the initial article cache loaded
    await preloadArticleCache();
    
    // Get the list of article files
    const files = fs.readdirSync(path.join(process.cwd(), 'content/articles'));
    
    // Instead of processing all files, just generate paths for the most recent articles
    // This dramatically speeds up builds while ensuring the most important pages are pre-rendered
    const recentFiles = files.slice(0, 100); // Only build the 100 most recent articles statically
    
    const paths = recentFiles.map((filename) => {
      try {
        // Use the cached frontmatter if available
        let slug;
        if (articleCache && articleCache.has(filename)) {
          const frontMatter = articleCache.get(filename);
          slug = frontMatter.slug || filename.replace(/\.md$/, '');
        } else {
          // If not in cache, extract from the filename for now
          // This avoids having to read the file contents for all files during build
          const filenameParts = filename.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-(.*?)\.md$/);
          if (filenameParts && filenameParts[1]) {
            slug = filenameParts[1];
          } else {
            slug = filename.replace(/\.md$/, '');
          }
        }
        
        return {
          params: { slug }
        };
      } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
        return null;
      }
    }).filter(Boolean); // Filter out any null entries from errors
    
    return {
      paths,
      fallback: 'blocking' // This allows us to build other pages on-demand
    };
  } catch (error) {
    console.error('Error in getStaticPaths:', error);
    return {
      paths: [],
      fallback: 'blocking'
    };
  }
}

export async function getStaticProps({ params: { slug } }) {
  try {
    console.time(`getStaticProps:${slug}`);
    console.log('Getting static props for slug:', slug);
    
    // Import and use getArticleBySlug
    const { getArticleBySlug, getRelatedArticles } = await import('../../utils/articleUtils');
    
    // Use optimized getArticleBySlug
    const article = await getArticleBySlug(slug);
    
    if (!article) {
      console.error(`Article not found for slug: ${slug}`);
      return { notFound: true };
    }
    
    const { frontMatter, content: rawContent } = article;
    
    // Calculate word count for SEO and reading time
    const wordCount = rawContent.split(/\s+/g).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
    
    // Ensure all necessary SEO fields are present
    const serializedFrontMatter = {
      ...frontMatter,
      date: frontMatter.date instanceof Date 
        ? frontMatter.date.toISOString() 
        : frontMatter.date,
      wordCount,
      readingTime: frontMatter.readingTime || readingTime,
      excerpt: frontMatter.excerpt || rawContent.slice(0, 160).trim() + '...',
      keywords: frontMatter.keywords || frontMatter.tags || [],
      category: frontMatter.category || 'Technology',
      // Ensure categories are properly handled
      categories: frontMatter.categories || [],
      image: frontMatter.image || 'https://Trendiingz.com/default-og-image.jpg',
      imageAlt: frontMatter.imageAlt || frontMatter.title,
      imageCredit: frontMatter.imageCredit || '',
      url: `https://Trendiingz.com/posts/${slug}`,
      locale: 'en_US'
    };

    // Get related articles in parallel with other operations
    const relatedArticlesPromise = getRelatedArticles(
      frontMatter.keywords, 
      slug, 
      6, 
      frontMatter.categories || []
    );
    
    // Import only if needed
    let serializedContent = null;
    try {
      // Only try to serialize if we need it
      if (process.env.NODE_ENV === 'production') {
        const { serialize } = await import('next-mdx-remote/serialize');
        const remarkGfm = (await import('remark-gfm')).default;
        
        // Dynamically import rehype plugins to prevent build errors
        const rehypeSlug = (await import('rehype-slug')).default;
        const rehypeAutolinkHeadings = (await import('rehype-autolink-headings')).default;
        const rehypePrism = (await import('rehype-prism-plus')).default;
        
        serializedContent = await serialize(rawContent, {
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [
              rehypeSlug,
              [rehypeAutolinkHeadings, { behavior: 'wrap' }],
              [rehypePrism, { ignoreMissing: true }]
            ]
          }
        });
      }
    } catch (error) {
      console.error('Error serializing MDX content:', error);
      // Continue without serialized content - will fallback to regular markdown
    }
    
    // Wait for related articles to finish and sort by newest first
    let relatedArticles = await relatedArticlesPromise;
    
    // Ensure articles are sorted by newest first
    if (relatedArticles && relatedArticles.length > 0) {
      relatedArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    console.timeEnd(`getStaticProps:${slug}`);
    return {
      props: {
        frontMatter: serializedFrontMatter,
        content: rawContent,
        serializedContent,
        slug,
        relatedArticles
      },
      // Add revalidation to improve build time while keeping content fresh
      revalidate: 600 // 10 minutes
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return { notFound: true };
  }
} 