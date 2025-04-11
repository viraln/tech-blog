import { getAllArticles } from '../../../utils/articleUtils';

// Add caching to improve performance
export const config = {
  runtime: 'nodejs',
};

// In-memory cache
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Helper function to normalize strings for consistent matching
function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// A comprehensive matching function for topics
function isTopicMatch(topicA, topicB) {
  if (!topicA || !topicB) return false;
  
  // Normalize both topics
  const normalizedA = normalizeString(typeof topicA === 'string' ? topicA : topicA.name || topicA.id || '');
  const normalizedB = normalizeString(typeof topicB === 'string' ? topicB : topicB.name || topicB.id || '');
  
  // Different matching strategies
  const exactMatch = normalizedA === normalizedB;
  const containsMatch = normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
  
  // For hyphenated topics, also check the un-hyphenated version
  const normalizedANoHyphens = typeof topicA === 'string' ? topicA.toLowerCase().replace(/-/g, '') : '';
  const normalizedBNoHyphens = typeof topicB === 'string' ? topicB.toLowerCase().replace(/-/g, '') : '';
  const hyphenMatch = normalizedANoHyphens === normalizedBNoHyphens && 
                     normalizedANoHyphens.length > 3;
  
  return exactMatch || containsMatch || hyphenMatch;
}

// Function to calculate article relevance score based on topic matches
function calculateArticleRelevance(article, topicSlug) {
  if (!article || !topicSlug) return 0;
  
  // Normalize the topic slug for consistent comparison
  const normalizedTopicSlug = normalizeString(topicSlug);
  const topicWords = topicSlug.split('-').filter(word => word.length > 2);
  
  let score = 0;
  let matchReasons = [];
  
  // Check for exact topic matches
  if (article.topics && Array.isArray(article.topics)) {
    article.topics.forEach(topic => {
      const topicId = typeof topic === 'string' ? topic : (topic.id || topic.slug || '');
      if (isTopicMatch(topicId, topicSlug)) {
        score += 50;
        matchReasons.push('Exact topic match');
      }
    });
  }
  
  // Check for category matches
  if (article.categories && Array.isArray(article.categories)) {
    article.categories.forEach(category => {
      const categoryId = typeof category === 'string' ? category : (category.id || category.slug || '');
      if (isTopicMatch(categoryId, topicSlug)) {
        score += 40;
        matchReasons.push('Category match');
      }
    });
  }
  
  // Check main category match
  if (article.category) {
    const categoryId = typeof article.category === 'string' ? article.category : (article.category.id || article.category.slug || '');
    if (isTopicMatch(categoryId, topicSlug)) {
      score += 45;
      matchReasons.push('Main category match');
    }
  }
  
  // Check for tag matches
  if (article.tags && Array.isArray(article.tags)) {
    article.tags.forEach(tag => {
      const tagId = typeof tag === 'string' ? tag : (tag.id || tag.slug || '');
      if (isTopicMatch(tagId, topicSlug)) {
        score += 30;
        matchReasons.push('Tag match');
      }
    });
  }
  
  // Check for topic words in title (high value)
  if (article.title) {
    const titleLower = article.title.toLowerCase();
    const titleMatches = topicWords.filter(word => titleLower.includes(word));
    if (titleMatches.length > 0) {
      const titleScore = Math.min(35, titleMatches.length * 15);
      score += titleScore;
      matchReasons.push(`Title matches (${titleMatches.length} words)`);
    }
  }
  
  // Check for topic words in excerpt (medium value)
  if (article.excerpt) {
    const excerptLower = article.excerpt.toLowerCase();
    const excerptMatches = topicWords.filter(word => excerptLower.includes(word));
    if (excerptMatches.length > 0) {
      const excerptScore = Math.min(25, excerptMatches.length * 10);
      score += excerptScore;
      matchReasons.push(`Excerpt matches (${excerptMatches.length} words)`);
    }
  }
  
  // Check for topic words in content (if available, lower value but still relevant)
  if (article.content) {
    const contentLower = article.content.toLowerCase();
    const contentMatches = topicWords.filter(word => contentLower.includes(word));
    if (contentMatches.length > 0) {
      const contentScore = Math.min(20, contentMatches.length * 5);
      score += contentScore;
      matchReasons.push(`Content matches (${contentMatches.length} words)`);
    }
  }
  
  // Normalize score to a 0-100 scale and apply additional adjustments
  let normalizedScore = Math.min(100, score);
  
  // Add the details for debugging and transparency
  return {
    score: normalizedScore,
    reasons: matchReasons
  };
}

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