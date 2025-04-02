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

// Create mock data if we can't find real posts
const createMockPosts = (count = 30) => {
  console.log('Creating mock posts as fallback...');
  const mockPosts = [];
  
  for (let i = 0; i < count; i++) {
    mockPosts.push({
      slug: `mock-post-${i}`,
      title: `Mock Post ${i} - Content Not Found`,
      excerpt: 'This is a mock post because the content directory could not be found.',
      date: new Date().toISOString(),
      image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60',
      readingTime: 3,
      category: 'Tech',
      metadata: {
        featured: i === 0,
        trending: i < 5
      }
    });
  }
  
  return mockPosts;
};

// Function to get all articles
const getAllArticles = () => {
  try {
    // Find a valid content directory
    const postsDirectory = findContentDirectory();
    
    // If no directory found, return mock posts
    if (!postsDirectory) {
      return createMockPosts();
    }
    
    const filenames = fs.readdirSync(postsDirectory);
    console.log(`Found ${filenames.length} files in directory`);

    if (filenames.length === 0) {
      console.log('No files found in directory, using mock posts');
      return createMockPosts();
    }

    const posts = filenames.map((filename) => {
      try {
        const filePath = path.join(postsDirectory, filename);
        
        // Skip directories - check if it's a file before processing
        const fileStats = fs.statSync(filePath);
        if (!fileStats.isFile()) {
          console.log(`Skipping directory: ${filename}`);
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
          }
        };
      } catch (fileError) {
        // If there's an error with this specific file, log it but continue with other files
        console.error(`Error processing file ${filename}:`, fileError);
        return null;
      }
    }).filter(Boolean); // Remove any null entries from files with errors

    // Sort posts by date (newest first)
    return posts.sort((a, b) => {
      try {
        return new Date(b.date) - new Date(a.date);
      } catch (dateError) {
        console.error('Error comparing dates:', dateError, 'a.date:', a.date, 'b.date:', b.date);
        return 0; // Keep original order if dates can't be compared
      }
    });
  } catch (error) {
    console.error('Error loading articles:', error);
    // Return mock posts as fallback
    return createMockPosts();
  }
};

// Netlify function handler
exports.handler = async (event, context) => {
  console.log('Articles function invoked with query parameters:', event.queryStringParameters);
  
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
    if (pathSegments.includes('page')) {
      // Handle /api/articles/page/[page] pattern
      const { page = "1", limit = "30" } = event.queryStringParameters || {};
      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 30;
      
      if (isNaN(pageNumber) || pageNumber < 1) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid page number' })
        };
      }
      
      // Get all articles
      console.log(`Getting articles for page ${pageNumber} with limit ${limitNumber}`);
      const allArticles = getAllArticles();
      console.log(`Retrieved ${allArticles.length} total articles`);
      
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
      
      // Trim post data to essential fields
      const trimmedArticles = paginatedArticles.map(article => ({
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        date: article.date,
        image: article.image,
        readingTime: article.readingTime,
        category: article.category,
        categories: article.categories || [],
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