const path = require('path');
const fs = require('fs');
const matter = require('gray-matter');

// Add CORS headers helper function
const addCorsHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*', // Or restrict to your domain
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
};

// Calculate reading time
function calculateReadingTime(content) {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/g).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

// Function to find the content directory
const findContentDirectory = () => {
  // List of potential paths to try
  const potentialPaths = [
    // Netlify function specific paths
    path.join(process.cwd(), 'content/articles'),
    path.join(process.cwd(), '..', '..', 'content/articles'),
    path.join(process.cwd(), '..', 'content/articles'),
    // Absolute fallback paths for Netlify
    '/var/task/content/articles',
    '/opt/build/repo/content/articles',
    '/opt/build/content/articles'
  ];

  console.log('Current working directory:', process.cwd());
  
  // Try each path until we find one that exists
  for (const dirPath of potentialPaths) {
    try {
      console.log('Trying path:', dirPath);
      fs.accessSync(dirPath, fs.constants.R_OK);
      console.log('Found valid content directory at:', dirPath);
      return dirPath;
    } catch (err) {
      console.log(`Directory not found at ${dirPath}`);
    }
  }

  // If we get here, we couldn't find any valid path
  console.error('Could not find a valid content directory!');
  return null;
};

// Function to get all articles
const getAllArticles = () => {
  try {
    // Find a valid content directory
    const postsDirectory = findContentDirectory();
    
    // If no directory found, return mock posts
    if (!postsDirectory) {
      console.log('No valid content directory found, creating mock posts');
      return createMockPosts(100);
    }
    
    const filenames = fs.readdirSync(postsDirectory);
    console.log(`Found ${filenames.length} files in directory: ${postsDirectory}`);

    if (filenames.length === 0) {
      console.log('No files found in directory, using mock posts');
      return createMockPosts(100);
    }

    // List all potential .md or .mdx files in the content directory
    const articleFiles = [];
    filenames.forEach(filename => {
      try {
        const filePath = path.join(postsDirectory, filename);
        const fileStats = fs.statSync(filePath);
        
        if (fileStats.isFile() && (filename.endsWith('.md') || filename.endsWith('.mdx'))) {
          articleFiles.push(filename);
        } else if (fileStats.isDirectory()) {
          // Check for markdown files in subdirectories
          try {
            const subfiles = fs.readdirSync(filePath);
            subfiles.forEach(subfile => {
              if (subfile.endsWith('.md') || subfile.endsWith('.mdx')) {
                articleFiles.push(path.join(filename, subfile));
              }
            });
          } catch (subError) {
            console.error(`Error reading subdirectory ${filename}:`, subError);
          }
        }
      } catch (fileError) {
        console.error(`Error checking file ${filename}:`, fileError);
      }
    });
    
    console.log(`Found ${articleFiles.length} markdown files to process`);
    
    // If we couldn't find any markdown files, use mock data
    if (articleFiles.length === 0) {
      console.log('No markdown files found, creating mock posts');
      return createMockPosts(100);
    }

    // Process each article file
    const posts = articleFiles.map((filename, index) => {
      try {
        const filePath = path.join(postsDirectory, filename);
        
        // Skip directories - check if it's a file before processing
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          console.log(`Skipping non-file: ${filename}`);
          return null;
        }
        
        const fileContents = fs.readFileSync(filePath, 'utf8');
        
        // Try to parse the frontmatter
        let data, content, excerpt;
        try {
          const result = matter(fileContents, { excerpt: true });
          data = result.data;
          content = result.content;
          excerpt = result.excerpt;
        } catch (parseError) {
          console.error(`Error parsing frontmatter in ${filename}:`, parseError);
          
          // Use placeholder data for error case
          data = {
            title: `Error parsing ${filename}`,
            date: new Date().toISOString(),
            slug: filename.replace(/\.md$/, '')
          };
          content = fileContents;
          excerpt = '';
        }

        // Calculate reading time
        const readingTime = calculateReadingTime(content);

        // Ensure date is properly formatted as ISO string
        const date = typeof data.date === 'string' ? data.date : 
                    data.date instanceof Date ? data.date.toISOString() :
                    new Date().toISOString();

        // Use a specific Unsplash photo if no image is provided
        const defaultImage = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60';

        // Calculate if the post is new (less than 7 days old)
        const isNew = (new Date() - new Date(date)) < 7 * 24 * 60 * 60 * 1000;

        // Extract slug from front matter or filename
        let slug;
        if (data.slug) {
          // Use the slug from front matter if available
          slug = data.slug;
        } else {
          // Extract slug from filename
          // Handle files with timestamp prefixes like 2025-03-20T14:42:46.336Z-my-article-slug.md
          const filenameWithoutExt = filename.replace(/\.mdx?$/, '');
          const timestampMatch = filenameWithoutExt.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-(.+)$/);
          
          if (timestampMatch) {
            // Extract the part after the timestamp
            slug = timestampMatch[1];
          } else {
            // If no timestamp prefix, use the whole filename without extension
            slug = filenameWithoutExt;
          }
        }

        return {
          slug,
          title: data.title || filename.replace(/\.md$/, ''),
          date,
          image: data.image || data.images?.[0] || defaultImage,
          excerpt: excerpt || '',
          readingTime: data.readingTime || readingTime,
          category: data.category || 'Tech',
          categories: data.categories || [],
          isNew,
          status: isNew ? 'new' : 'published',
          metadata: {
            featured: data.featured || false,
            trending: data.trending || false
          },
          // Add a unique index to help with debugging
          _articleIndex: index
        };
      } catch (fileError) {
        // If there's an error with this specific file, log it but continue with other files
        console.error(`Error processing file ${filename}:`, fileError);
        return null;
      }
    }).filter(Boolean); // Remove any null entries from files with errors
    
    console.log(`Successfully processed ${posts.length} article files`);
    
    // If we couldn't process any posts, use mock data
    if (posts.length === 0) {
      console.log('No valid articles processed, creating mock posts');
      return createMockPosts(100);
    }

    // If we have very few real posts, supplement with some mock ones
    if (posts.length < 10) {
      console.log(`Only found ${posts.length} valid articles, adding some mock posts`);
      const mockPosts = createMockPosts(30);
      posts.push(...mockPosts);
    }

    // Sort posts by date (newest first)
    const sortedPosts = posts.sort((a, b) => {
      try {
        return new Date(b.date) - new Date(a.date);
      } catch (dateError) {
        console.error('Error comparing dates:', dateError, 'a.date:', a.date, 'b.date:', b.date);
        return 0; // Keep original order if dates can't be compared
      }
    });
    
    console.log(`Returning ${sortedPosts.length} total sorted articles`);
    return sortedPosts;
  } catch (error) {
    console.error('Error loading articles:', error);
    // Return mock posts as fallback
    return createMockPosts(100);
  }
};

// Function to create variety in mock posts to ensure pagination works
const createMockPosts = (count = 100, pageOffset = 0) => {
  console.log(`Creating ${count} mock posts as fallback with page offset ${pageOffset}...`);
  const mockPosts = [];
  
  const categories = [
    'Technology', 'Science', 'Programming', 'AI', 'Web Development', 
    'Design', 'Business', 'Marketing', 'Productivity', 'Health'
  ];
  
  const titles = [
    'Understanding the Future of {{CATEGORY}}',
    'How to Master {{CATEGORY}} in 2025',
    'The Complete Guide to {{CATEGORY}}',
    '10 {{CATEGORY}} Trends You Need to Know',
    'Why {{CATEGORY}} Matters More Than Ever',
    'Exploring Advanced {{CATEGORY}} Concepts',
    'The Evolution of {{CATEGORY}} in Modern Times',
    'Breaking News in {{CATEGORY}}',
    'Essential {{CATEGORY}} Skills for Professionals',
    'Innovative Approaches to {{CATEGORY}}'
  ];
  
  const imageUrls = [
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?auto=format&fit=crop&w=800&q=60'
  ];
  
  // Starting index based on page offset to ensure unique posts per page
  const startIdx = pageOffset * count;
  
  for (let i = 0; i < count; i++) {
    const globalIndex = startIdx + i;
    const category = categories[globalIndex % categories.length];
    const titleTemplate = titles[globalIndex % titles.length];
    const title = titleTemplate.replace('{{CATEGORY}}', category);
    const randomDate = new Date();
    randomDate.setDate(randomDate.getDate() - (globalIndex % 60)); // Spread dates over last 60 days
    
    mockPosts.push({
      slug: `mock-post-${globalIndex}-${category.toLowerCase().replace(/\s+/g, '-')}`,
      title: title,
      excerpt: `This is a mock post ${globalIndex} about ${category}. Created for testing pagination and infinite scroll functionality.`,
      date: randomDate.toISOString(),
      image: imageUrls[globalIndex % imageUrls.length],
      readingTime: 3 + (globalIndex % 10), // Vary reading times
      category: category,
      categories: [category],
      isNew: globalIndex < 10,
      status: globalIndex < 10 ? 'new' : 'published',
      metadata: {
        featured: globalIndex === 0,
        trending: globalIndex < 5
      },
      _articleIndex: globalIndex // Add index for debugging
    });
  }
  
  return mockPosts;
};

// Netlify function handler
exports.handler = async (event, context) => {
  console.log('Articles function invoked with query parameters:', event.queryStringParameters);
  console.log('Articles function invoked with path:', event.path);
  
  // Set CORS headers to allow all origins
  const headers = addCorsHeaders();
  
  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Parse path segments from event.path to handle different article endpoints
  const pathSegments = event.path.split('/').filter(Boolean);
  console.log('Path segments:', pathSegments);

  try {
    // Check if we're handling a page request from query params or path
    const isPageRequest = pathSegments.includes('page') || (event.queryStringParameters && event.queryStringParameters.page);
    
    if (isPageRequest) {
      // Get page and limit from either query parameters or path
      let page, limit;
      
      if (event.queryStringParameters && event.queryStringParameters.page) {
        page = event.queryStringParameters.page;
        limit = event.queryStringParameters.limit || "30";
      } else {
        // Extract from path: /api/articles/page/3
        const pageIndex = pathSegments.indexOf('page');
        if (pageIndex >= 0 && pageIndex < pathSegments.length - 1) {
          page = pathSegments[pageIndex + 1];
        }
        limit = event.queryStringParameters?.limit || "30";
      }
      
      // Default to page 1 if not specified
      page = page || "1";
      
      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 30;
      
      if (isNaN(pageNumber) || pageNumber < 1) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid page number' })
        };
      }
      
      // Get all articles - use pageNumber as offset for mock posts
      console.log(`Getting articles for page ${pageNumber} with limit ${limitNumber}`);
      
      // Check if content directory exists first
      const postsDirectory = findContentDirectory();
      
      // If no directory found, generate mock posts with page-specific offset
      let allArticles;
      if (!postsDirectory) {
        console.log('No valid content directory found, creating mock posts for requested page');
        
        // Generate mock posts specific to this page number
        // Use pageNumber-1 as offset so page 1 has offset 0
        allArticles = createMockPosts(limitNumber * 3, pageNumber - 1);
      } else {
        try {
          // Try to get real articles from the content directory
          allArticles = getAllArticles();
          console.log(`Retrieved ${allArticles.length} total real articles`);
          
          // If we couldn't find enough articles, supplement with mock ones for this page
          if (!Array.isArray(allArticles) || allArticles.length < limitNumber) {
            console.log(`Not enough real articles (${allArticles?.length || 0}), adding mock posts for page ${pageNumber}`);
            const mockPosts = createMockPosts(limitNumber * 2, pageNumber - 1);
            
            if (Array.isArray(allArticles) && allArticles.length > 0) {
              // Combine real and mock articles
              allArticles = [...allArticles, ...mockPosts];
            } else {
              // Just use mock articles
              allArticles = mockPosts;
            }
          }
        } catch (contentError) {
          console.error('Error getting real articles:', contentError);
          // Fallback to mock posts
          allArticles = createMockPosts(limitNumber * 3, pageNumber - 1);
        }
      }
      
      // Ensure allArticles is an array before attempting to slice
      if (!Array.isArray(allArticles)) {
        console.error('getAllArticles did not return an array:', allArticles);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Internal server error',
            message: 'Articles data is not in the expected format'
          })
        };
      }
      
      // Calculate pagination
      const start = (pageNumber - 1) * limitNumber;
      const end = start + limitNumber;
      const paginatedArticles = allArticles.slice(start, end);
      console.log(`Returning ${paginatedArticles.length} articles for page ${pageNumber} (range ${start}-${end})`);
      
      // Log the first few articles to help debugging
      if (paginatedArticles.length > 0) {
        console.log('First article title:', paginatedArticles[0].title);
        console.log('First article slug:', paginatedArticles[0].slug);
        console.log('First article index:', paginatedArticles[0]._articleIndex);
      }
      
      // Trim post data to essential fields
      const trimmedArticles = paginatedArticles.map(article => ({
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt || `Excerpt for ${article.title}`,
        date: article.date,
        image: article.image,
        readingTime: article.readingTime,
        category: article.category,
        categories: article.categories || [],
        isNew: article.isNew || false,
        // Add article index to debug duplicate issues
        _articleIndex: article._articleIndex,
        // Add page info to help debug
        _page: pageNumber,
        metadata: {
          featured: article.metadata?.featured || false,
          trending: article.metadata?.trending || false
        }
      }));
      
      // Return paginated data with BOTH articles and posts properties for compatibility
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          articles: trimmedArticles, // For newer components
          posts: trimmedArticles,    // For older components
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            total: allArticles.length,
            totalPages: Math.ceil(allArticles.length / limitNumber),
            hasMore: end < allArticles.length
          }
        })
      };
    } else {
      // Default handler for other article routes
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'Articles API endpoint. Use /articles/page/[page] to get paginated articles.'
        })
      };
    }
  } catch (error) {
    console.error('Error in articles function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
}; 