import { getAllArticles } from '../../../utils/articleUtils';

// Add caching to improve performance
export const config = {
  runtime: 'nodejs',
};

// In-memory cache
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export default async function handler(req, res) {
  try {
    const { categories, page, limit } = req.query;
    
    // Validate parameters
    if (!categories) {
      return res.status(400).json({ 
        error: 'Missing required parameter', 
        message: 'The categories parameter is required'
      });
    }
    
    // Parse parameters
    const categoryList = Array.isArray(categories) 
      ? categories 
      : categories.split(',').map(c => c.trim());
    
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    
    // Validate page and limit parameters
    if (pageNum < 1) {
      return res.status(400).json({ 
        error: 'Invalid page number', 
        message: 'Page number must be greater than or equal to 1'
      });
    }
    
    if (limitNum < 1 || limitNum > 50) {
      return res.status(400).json({ 
        error: 'Invalid limit', 
        message: 'Limit must be between 1 and 50'
      });
    }
    
    // Check cache first
    const cacheKey = `category_${categoryList.join('_')}_page_${pageNum}_limit_${limitNum}`;
    const cachedData = CACHE.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return res.status(200).json(cachedData.data);
    }
    
    // Get articles with category filter
    const result = await getAllArticles({
      paginate: true,
      page: pageNum,
      limit: limitNum,
      categories: categoryList
    });
    
    // Ensure we have valid articles
    if (!result || !result.articles) {
      return res.status(500).json({
        error: 'Failed to fetch articles',
        message: 'Could not retrieve article data'
      });
    }
    
    // Additional validation to ensure we only return valid articles
    result.articles = result.articles.filter(article => {
      return (
        article && 
        typeof article === 'object' &&
        article.slug && 
        typeof article.slug === 'string' &&
        article.title && 
        typeof article.title === 'string' &&
        article.date && 
        !isNaN(new Date(article.date).getTime())
      );
    });
    
    // Update pagination info if we filtered out articles
    if (result.articles.length < result.pagination.total) {
      // For category filters, we need to adjust the total count
      // since not all articles will match the category
      const totalCategoryArticles = result.articles.length + ((pageNum - 1) * limitNum);
      
      // Set more realistic pagination values
      result.pagination.total = totalCategoryArticles;
      result.pagination.totalPages = Math.ceil(totalCategoryArticles / limitNum);
      result.pagination.hasMore = pageNum < result.pagination.totalPages;
    }
    
    // Store in cache
    CACHE.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    // Return filtered data
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in byCategory API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch articles',
      message: error.message
    });
  }
} 