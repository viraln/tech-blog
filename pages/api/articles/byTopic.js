import { getAllArticles, calculateArticleRelevance } from '../../../utils/articleUtils';

// Add caching to improve performance
export const config = {
  runtime: 'nodejs',
};

// In-memory cache
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export default async function handler(req, res) {
  try {
    // --- START: Read trending/featured flags ---
    const { topic, page, limit, minScore, trending, featured } = req.query;
    // --- END: Read trending/featured flags ---
    
    // Validate required parameters
    if (!topic) {
      return res.status(400).json({ 
        error: 'Missing required parameter', 
        message: 'The topic parameter is required'
      });
    }
    
    // Parse parameters
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const minScoreNum = parseInt(minScore, 10) || 30; // Default minimum score threshold
    // --- START: Parse boolean flags ---
    const filterTrending = trending === 'true';
    const filterFeatured = featured === 'true';
    // --- END: Parse boolean flags ---
    
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
    
    // Check cache first - Adjust cache key to include filters
    // --- START: Update Cache Key ---
    const cacheKey = `topic_${topic}_page_${pageNum}_limit_${limitNum}_score_${minScoreNum}_trend_${filterTrending}_feat_${filterFeatured}`;
    // --- END: Update Cache Key ---
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
    
    // Calculate relevance for each article
    const articlesWithRelevance = allArticles.map(article => {
      const relevance = calculateArticleRelevance(article, topic);
      return {
        ...article,
        relevance,
        // Ensure flags exist for filtering, default to false
        trending: article.trending === true, 
        featured: article.featured === true,
      };
    });
    
    // Filter by minimum relevance score
    let relevantArticles = articlesWithRelevance
      .filter(article => article.relevance?.score >= minScoreNum)
      // --- START: Add filtering for trending/featured ---
      .filter(article => {
        if (filterTrending && !article.trending) return false;
        if (filterFeatured && !article.featured) return false;
        return true;
      })
      // --- END: Add filtering for trending/featured ---
      .sort((a, b) => {
        // First sort by relevance
        const relevanceDiff = b.relevance.score - a.relevance.score;
        if (relevanceDiff !== 0) return relevanceDiff;
        
        // If relevance is the same, sort by date (newer first)
        return new Date(b.date || 0) - new Date(a.date || 0);
      });
    
    // Calculate pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedArticles = relevantArticles.slice(startIndex, endIndex);
    
    // Ensure we have valid articles
    const validArticles = paginatedArticles.filter(article => {
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
      topic: topic,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: relevantArticles.length,
        totalPages: Math.ceil(relevantArticles.length / limitNum),
        hasMore: endIndex < relevantArticles.length
      },
      matchStats: {
        totalMatches: relevantArticles.length,
        minScore: minScoreNum,
        averageScore: relevantArticles.length > 0 
          ? (relevantArticles.reduce((sum, article) => sum + article.relevance.score, 0) / relevantArticles.length).toFixed(1)
          : 0
      }
    };
    
    // Store in cache
    CACHE.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
    
    // Return the filtered articles
    res.status(200).json(response);
  } catch (error) {
    console.error(`Error fetching articles for topic: ${req.query.topic}`, error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred'
    });
  }
} 