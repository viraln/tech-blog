// API endpoint for fetching posts
import { getAllPosts } from '../../utils/mdx';

export default async function handler(req, res) {
  try {
    // Parse query parameters
    const { page = 1, limit = 10, category } = req.query;
    
    // Convert to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    // Get all posts
    const allPosts = await getAllPosts();
    
    // Filter by category if specified
    const filteredPosts = category 
      ? allPosts.filter(post => 
          post.category.toLowerCase() === category.toLowerCase() ||
          post.categories?.some(cat => cat.name.toLowerCase() === category.toLowerCase())
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
    return res.status(500).json({ error: 'Internal server error' });
  }
} 