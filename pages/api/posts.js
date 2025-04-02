// API endpoint for fetching posts
import { getAllPosts } from '../../utils/mdx';

export default async function handler(req, res) {
  try {
    // Parse query parameters
    const { page = 1, limit = 10, category } = req.query;
    
    // Convert to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    // Validate page and limit parameters
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ 
        error: 'Invalid page number', 
        message: 'Page number must be greater than or equal to 1'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({ 
        error: 'Invalid limit', 
        message: 'Limit must be between 1 and 50'
      });
    }
    
    // Get all posts
    const allPosts = await getAllPosts();
    
    // Ensure allPosts is an array
    if (!allPosts || !Array.isArray(allPosts)) {
      console.error('getAllPosts did not return an array:', allPosts);
      return res.status(500).json({ 
        error: 'Server Error', 
        message: 'Failed to retrieve posts'
      });
    }
    
    // Filter by category if specified
    const filteredPosts = category 
      ? allPosts.filter(post => 
          post.category?.toLowerCase() === category.toLowerCase() ||
          post.categories?.some(cat => 
            (typeof cat === 'string' ? cat : cat?.name || '').toLowerCase() === category.toLowerCase()
          )
        )
      : allPosts;
    
    // Ensure filteredPosts is an array before calling slice
    if (!filteredPosts || !Array.isArray(filteredPosts)) {
      console.error('filteredPosts is not an array:', filteredPosts);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    // Calculate pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;
    
    // Get posts for current page
    const posts = filteredPosts.slice(startIndex, endIndex);
    
    // Return paginated results
    return res.status(200).json({
      posts,
      pagination: {
        total: filteredPosts.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(filteredPosts.length / limitNum),
        hasMore: endIndex < filteredPosts.length
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
} 