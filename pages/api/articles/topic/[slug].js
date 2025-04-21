import { getAllArticles, calculateArticleRelevance } from '../../../../utils/articleUtils';

// Add caching to improve performance
export const config = {
  runtime: 'nodejs',
};

// In-memory cache
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export default async function handler(req, res) {
  try {
    const { slug } = req.query; // The topic slug comes from the URL
    const { page, limit, minScore } = req.query;
    
    if (!slug) {
      return res.status(400).json({ 
        error: 'Missing required parameter', 
        message: 'No topic slug provided'
      });
    }
    
    // Parse parameters
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const minScoreNum = parseInt(minScore, 10) || 20; // Lower default minimum score threshold from 30 to 20
    
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
    const cacheKey = `topic_${slug}_page_${pageNum}_limit_${limitNum}_score_${minScoreNum}`;
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
      const relevance = calculateArticleRelevance(article, slug);
      return {
        ...article,
        relevance
      };
    });
    
    // Filter by minimum relevance score
    const relevantArticles = articlesWithRelevance
      .filter(article => article.relevance?.score >= minScoreNum)
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
      topic: slug,
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
    console.error('Error in topic/[slug] API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch topic articles',
      message: error.message
    });
  }
} 