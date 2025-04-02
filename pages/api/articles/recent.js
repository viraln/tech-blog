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
    const limit = parseInt(req.query.limit, 10) || 10;
    
    // Validate limit parameter
    if (limit < 1 || limit > 50) {
      return res.status(400).json({ 
        error: 'Invalid limit', 
        message: 'Limit must be between 1 and 50'
      });
    }
    
    // Check cache first
    const cacheKey = `recent_limit_${limit}`;
    const cachedData = CACHE.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return res.status(200).json(cachedData.data);
    }
    
    // Get all articles
    const allArticles = await getAllArticles();
    
    if (!allArticles || !Array.isArray(allArticles)) {
      return res.status(500).json({
        error: 'Failed to fetch articles',
        message: 'The article data is unavailable'
      });
    }
    
    // Sort articles by date (newest first)
    const sortedArticles = [...allArticles].sort(
      (a, b) => new Date(b?.date || 0) - new Date(a?.date || 0)
    );
    
    // Get the most recent articles based on the limit
    const recentArticles = sortedArticles.slice(0, limit);
    
    // Validate the articles to ensure they have all required fields
    const validArticles = recentArticles.filter(article => {
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
    
    // Create response object
    const response = {
      articles: validArticles,
      pagination: {
        total: allArticles.length,
        limit: limit,
        hasMore: allArticles.length > limit
      }
    };
    
    // Store in cache
    CACHE.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
    
    // Return the recent articles
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in recent articles API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent articles',
      message: error.message
    });
  }
} 