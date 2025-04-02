import { getAllArticles } from '../../../../utils/articleUtils';

// Add caching to improve performance
export const config = {
  runtime: 'nodejs',
};

// In-memory cache
const CACHE = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

export default async function handler(req, res) {
  try {
    const { page } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    
    // Validate page and limit parameters
    if (pageNum < 1) {
      return res.status(400).json({ 
        error: 'Invalid page number', 
        message: 'Page number must be greater than or equal to 1'
      });
    }
    
    if (limit < 1 || limit > 50) {
      return res.status(400).json({ 
        error: 'Invalid limit', 
        message: 'Limit must be between 1 and 50'
      });
    }
    
    // Check cache first
    const cacheKey = `page_${pageNum}_limit_${limit}`;
    const cachedData = CACHE.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return res.status(200).json(cachedData.data);
    }
    
    // Get paginated articles
    const result = await getAllArticles({
      paginate: true,
      page: pageNum,
      limit
    });
    
    // Ensure we have a valid result object
    if (!result || typeof result !== 'object') {
      console.error('Invalid result from getAllArticles:', result);
      return res.status(500).json({ 
        error: 'Failed to fetch articles',
        message: 'Invalid data structure returned from articles source'
      });
    }
    
    // Ensure articles property exists and is an array
    if (!result.articles || !Array.isArray(result.articles)) {
      console.error('Articles property is not an array:', result.articles);
      // Initialize with empty array to prevent errors
      result.articles = [];
    }
    
    // Additional validation to ensure we only return valid articles
    if (result && result.articles) {
      result.articles = result.articles.filter(article => {
        return (
          article && 
          typeof article === 'object' &&
          article.slug && 
          typeof article.slug === 'string' &&
          article.title && 
          typeof article.title === 'string' &&
          article.date && 
          !isNaN(new Date(article.date).getTime()) &&
          article.image &&
          typeof article.image === 'string'
        );
      });
      
      // Update pagination info if we filtered out articles
      if (result.pagination) {
        if (result.articles.length < result.pagination.total) {
          result.pagination.total = result.articles.length;
          result.pagination.totalPages = Math.ceil(result.articles.length / limit);
          result.pagination.hasMore = pageNum < result.pagination.totalPages;
        }
      } else {
        // Create pagination object if it doesn't exist
        result.pagination = {
          page: pageNum,
          limit,
          total: result.articles.length,
          totalPages: Math.ceil(result.articles.length / limit),
          hasMore: false
        };
      }
    }
    
    // Store in cache
    CACHE.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    // Return paginated data
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in paginated articles API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch articles',
      message: error.message
    });
  }
} 