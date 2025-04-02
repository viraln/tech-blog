// api-fallback.js - Handles API failures with fallback data
// This script monitors fetch requests and provides fallback data when API endpoints fail

(function() {
  if (typeof window === 'undefined') return;
  
  console.log('API Fallback: Initializing API fallback handler');
  
  // Store original fetch function
  const originalFetch = window.fetch;
  
  // Store information about API calls
  const apiCallHistory = {
    articles: new Set(),
    lastInfiniteArticlesCall: null
  };
  
  // Helper function to generate a mock post
  function generateMockPost(index, page = 0) {
    const categories = ['Tech', 'AI & ML', 'Science', 'Business', 'Innovation', 'Gaming', 'Lifestyle'];
    const topics = [
      ['technology', 'software', 'gadgets', 'digital-transformation'], 
      ['artificial-intelligence', 'machine-learning', 'neural-networks', 'data-science'],
      ['research', 'space', 'biology', 'physics'],
      ['startups', 'entrepreneurship', 'finance', 'marketing'],
      ['future-tech', 'sustainability', 'smart-cities', 'renewable-energy'],
      ['video-games', 'game-development', 'esports', 'gaming-culture'],
      ['health', 'wellness', 'travel', 'food']
    ];
    
    const categoryIndex = index % categories.length;
    const category = categories[categoryIndex];
    const topic = topics[categoryIndex][index % 4];
    
    return {
      slug: `mock-post-${page}-${index}`,
      title: `Example ${category} Article ${page}-${index}`,
      excerpt: `This is a mock article about ${topic} created as a fallback when the API is unavailable.`,
      date: new Date(Date.now() - (index * 86400000)).toISOString(),
      image: 'https://source.unsplash.com/random/800x600/?tech',
      readingTime: 3 + (index % 5),
      category: category,
      topics: [topic],
      subtopics: [topics[categoryIndex][(index + 1) % 4]],
      metadata: {
        featured: index === 0,
        trending: index < 3
      }
    };
  }
  
  // Helper function to generate a batch of mock posts
  function generateMockPosts(count = 10, page = 0) {
    return Array.from({ length: count }, (_, i) => generateMockPost(i, page));
  }
  
  // Define patterns to match API routes
  const postsApiPattern = /^\/api\/posts(\?|$)/;
  const postsNetlifyPattern = /^\/.netlify\/functions\/posts(\?|$)/;
  const articleApiPattern = /^\/api\/articles\/([^\/]+)$/;
  const articlePageApiPattern = /^\/api\/articles\/page\/(\d+)(\?|$)/;
  
  // Detects if a URL is for the infinite articles section
  function isInfiniteArticlesRequest(url) {
    return typeof url === 'string' && articlePageApiPattern.test(url);
  }
  
  // Overriding fetch to handle API failures
  window.fetch = async function(url, options) {
    try {
      // Track if this is an infinite articles request
      const isInfiniteRequest = isInfiniteArticlesRequest(url);
      if (isInfiniteRequest) {
        apiCallHistory.lastInfiniteArticlesCall = {
          url: url,
          time: Date.now()
        };
      }
      
      // Try the original fetch first
      const response = await originalFetch(url, options);
      
      // If it's a 404 from our API routes, provide a fallback
      if (!response.ok && response.status === 404) {
        if (typeof url === 'string') {
          // Handle /api/posts endpoint
          if (postsApiPattern.test(url) || postsNetlifyPattern.test(url)) {
            console.log(`[API Fallback] Providing mock data for posts API request: ${url}`);
            
            // Parse query parameters
            const urlObj = new URL(url, window.location.origin);
            const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
            const limit = parseInt(urlObj.searchParams.get('limit') || '10', 10);
            
            // Generate mock posts
            const mockPosts = generateMockPosts(limit, page);
            
            // Create mock response
            return new Response(JSON.stringify({
              posts: mockPosts,
              hasMore: page < 5, // Limit to 5 pages of mock data
              totalPosts: 50
            }), {
              status: 200,
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
          
          // Handle /api/articles/:slug endpoint
          const articleMatch = url.match(articleApiPattern);
          if (articleMatch) {
            const slug = articleMatch[1];
            console.log(`[API Fallback] Providing mock data for article API request: ${slug}`);
            
            // Generate a more detailed article based on the slug
            const parts = slug.split('-');
            const page = parts[2] || 0;
            const index = parts[3] || 0;
            
            const mockArticle = {
              ...generateMockPost(index, page),
              slug,
              content: `
# ${slug.replace(/-/g, ' ')}

This is mock content for an article that couldn't be found. The API endpoint returned a 404 error, so this fallback content was generated instead.

## Introduction

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultrices, nunc nisl aliquet nunc, vitae aliquam nisl nunc vitae nisl.

## Main Section

- Point one about this topic
- Second important consideration
- Third key insight

## Conclusion

In conclusion, this mock article demonstrates the fallback mechanism for missing content.
              `,
              authorName: 'API Fallback Generator',
              authorBio: 'This content was automatically generated when the requested article was not found.'
            };
            
            // Create mock response
            return new Response(JSON.stringify(mockArticle), {
              status: 200,
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
          
          // Handle /api/articles/page/:page endpoint (used by infinite articles)
          const pageMatch = url.match(articlePageApiPattern);
          if (pageMatch) {
            console.log(`[API Fallback] Infinite articles API request failed: ${url}`);
            
            // For the infinite articles section, return empty results instead of mock data
            // This prevents showing mock articles in the infinite scroll section
            return new Response(JSON.stringify({
              articles: [],
              pagination: {
                page: parseInt(pageMatch[1], 10),
                limit: 20,
                total: 4450, // Set to the actual total number of articles we have
                totalPages: Math.ceil(4450 / 20),
                hasMore: true // Always return true since we have thousands of articles
              }
            }), {
              status: 200,
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
        }
      }
      
      return response;
    } catch (error) {
      console.error('[API Fallback] Fetch error:', error);
      
      // For network errors, provide fallbacks
      if (typeof url === 'string') {
        if (postsApiPattern.test(url) || postsNetlifyPattern.test(url)) {
          console.log(`[API Fallback] Providing mock data for failed posts API request: ${url}`);
          
          // Parse query parameters (handle string URLs)
          const urlObj = new URL(url, window.location.origin);
          const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
          const limit = parseInt(urlObj.searchParams.get('limit') || '10', 10);
          
          // Generate mock posts
          const mockPosts = generateMockPosts(limit, page);
          
          // Create mock response
          return new Response(JSON.stringify({
            posts: mockPosts,
            hasMore: page < 5,
            totalPosts: 50
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        
        // Handle article API fallback for network errors
        const articleMatch = url.match(articleApiPattern);
        if (articleMatch) {
          const slug = articleMatch[1];
          console.log(`[API Fallback] Providing mock data for failed article API request: ${slug}`);
          
          // Extract info from slug if available
          const parts = slug.split('-');
          const page = parts[2] || 0;
          const index = parts[3] || 0;
          
          const mockArticle = {
            ...generateMockPost(index, page),
            slug,
            content: `# ${slug.replace(/-/g, ' ')}\n\nThis is fallback content for a network error.`,
            authorName: 'API Fallback Generator',
            authorBio: 'This content was automatically generated when the network request failed.'
          };
          
          return new Response(JSON.stringify(mockArticle), {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        
        // Handle infinite articles API fallback for network errors
        const pageMatch = url.match(articlePageApiPattern);
        if (pageMatch) {
          console.log(`[API Fallback] Infinite articles API network request failed: ${url}`);
          
          // Return empty results instead of mock data for infinite articles
          return new Response(JSON.stringify({
            articles: [],
            pagination: {
              page: parseInt(pageMatch[1], 10),
              limit: 20,
              total: 4450, // Set to the actual total number of articles we have
              totalPages: Math.ceil(4450 / 20),
              hasMore: true // Always return true since we have thousands of articles
            }
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
      }
      
      // Re-throw the error for other cases
      throw error;
    }
  };
  
  console.log('API Fallback: Handler initialized successfully');
})(); 