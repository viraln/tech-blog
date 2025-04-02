const path = require('path');
const fs = require('fs');
const matter = require('gray-matter');

// Add CORS headers helper function
const addCorsHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*', // Or restrict to your domain
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

// Same function as in utils/mdx.js but adapted for Netlify Functions
const getAllPosts = () => {
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

        return {
          slug: data.slug || filename.replace(/\.md$/, ''),
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
    console.error('Error loading blog posts:', error);
    // Return mock posts as fallback
    return createMockPosts();
  }
};

// Netlify function handler
exports.handler = async (event, context) => {
  console.log('Function invoked with query parameters:', event.queryStringParameters);
  
  // Set CORS headers to allow all origins
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  const POSTS_PER_PAGE = 30;
  
  try {
    // Parse the queryStringParameters
    const { page = "1" } = event.queryStringParameters || {};
    const pageNumber = parseInt(page, 10);
    
    if (isNaN(pageNumber) || pageNumber < 1) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid page number' })
      };
    }
    
    // Get all posts
    console.log(`Getting all posts for page ${pageNumber}`);
    const allPosts = getAllPosts();
    console.log(`Retrieved ${allPosts.length} total posts`);
    
    // Ensure allPosts is an array before attempting to slice
    if (!Array.isArray(allPosts)) {
      console.error('getAllPosts did not return an array:', allPosts);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Internal server error',
          message: 'Posts data is not in the expected format'
        })
      };
    }
    
    // Calculate pagination
    const start = (pageNumber - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const paginatedPosts = allPosts.slice(start, end);
    console.log(`Returning ${paginatedPosts.length} posts for page ${pageNumber} (range ${start}-${end})`);
    
    // Trim post data to essential fields
    const trimmedPosts = paginatedPosts.map(post => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      date: post.date,
      image: post.image,
      readingTime: post.readingTime,
      category: post.category,
      metadata: {
        featured: post.metadata?.featured || false,
        trending: post.metadata?.trending || false
      }
    }));
    
    // Return paginated data
    return {
      statusCode: 200,
      headers: addCorsHeaders(),
      body: JSON.stringify({
        posts: trimmedPosts,
        pagination: {
          page: pageNumber,
          limit: POSTS_PER_PAGE,
          total: allPosts.length,
          totalPages: Math.ceil(allPosts.length / POSTS_PER_PAGE),
          hasMore: end < allPosts.length
        }
      })
    };
  } catch (error) {
    console.error('Error in posts function:', error);
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