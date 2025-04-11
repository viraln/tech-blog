import { getAllArticles } from '../../../../utils/articleUtils';

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
  
  // Helper function to extract name from topic object or return topic if it's a string
  const extractName = (topic) => {
    if (typeof topic === 'string') return topic;
    if (typeof topic === 'object' && topic !== null) {
      return topic.name || topic.id || topic.slug || '';
    }
    return '';
  };
  
  // Extract names from topics
  const nameA = extractName(topicA).toLowerCase().trim();
  const nameB = extractName(topicB).toLowerCase().trim();
  
  // Direct string match
  if (nameA === nameB) return true;
  
  // Replace hyphens with spaces and check again for direct match
  const spaceNameA = nameA.replace(/-/g, ' ').trim();
  const spaceNameB = nameB.replace(/-/g, ' ').trim();
  if (spaceNameA === spaceNameB) return true;
  
  // Remove spaces and check for compact match
  const compactNameA = nameA.replace(/[\s-]+/g, '').trim();
  const compactNameB = nameB.replace(/[\s-]+/g, '').trim();
  if (compactNameA === compactNameB) return true;
  
  // Check for partial matches with multi-word topics
  // For multi-word topics, ensure we're not just matching on a single word
  if (spaceNameA.includes(' ') || spaceNameB.includes(' ')) {
    const wordsA = spaceNameA.split(' ');
    const wordsB = spaceNameB.split(' ');
    
    // If one is a substring of the other, consider it a match
    if (spaceNameA.includes(spaceNameB) || spaceNameB.includes(spaceNameA)) {
      // For short substrings, make sure it's a significant match
      if (spaceNameA.length < 4 || spaceNameB.length < 4) {
        // For short strings, require exact matching
        return spaceNameA === spaceNameB;
      }
      return true;
    }
    
    // Check if at least half the words match for multi-word topics
    if (wordsA.length > 1 && wordsB.length > 1) {
      const matchingWords = wordsA.filter(wordA => 
        wordsB.some(wordB => wordB === wordA || (wordA.length > 3 && wordB.includes(wordA)))
      );
      
      // Consider it a match if at least half the words match
      if (matchingWords.length >= Math.min(wordsA.length, wordsB.length) / 2) {
        return true;
      }
    }
  }
  
  // Simple substring check for single words or small topics
  if (nameA.length < 4 || nameB.length < 4) {
    return nameA === nameB; // For very short names, require exact match
  }
  
  return compactNameA.includes(compactNameB) || compactNameB.includes(compactNameA);
}

// Function to calculate article relevance score based on topic matches
function calculateArticleRelevance(article, topicSlug) {
  if (!article || !topicSlug) return 0;
  
  // Normalize the topic slug for consistent comparison
  const normalizedTopicSlug = normalizeString(topicSlug);
  const topicWords = topicSlug.split(/[\s-]+/).filter(word => word.length > 2);
  
  let score = 0;
  let matchReasons = [];
  
  // Check for exact topic matches
  if (article.topics && Array.isArray(article.topics)) {
    article.topics.forEach(topic => {
      if (isTopicMatch(topic, topicSlug)) {
        score += 50;
        matchReasons.push('Exact topic match');
      }
    });
  }
  
  // Check for category matches
  if (article.categories && Array.isArray(article.categories)) {
    article.categories.forEach(category => {
      if (isTopicMatch(category, topicSlug)) {
        score += 40;
        matchReasons.push('Category match');
      }
    });
  }
  
  // Check main category match
  if (article.category) {
    if (isTopicMatch(article.category, topicSlug)) {
      score += 45;
      matchReasons.push('Main category match');
    }
  }
  
  // Check for tag matches
  if (article.tags && Array.isArray(article.tags)) {
    article.tags.forEach(tag => {
      if (isTopicMatch(tag, topicSlug)) {
        score += 30;
        matchReasons.push('Tag match');
      }
    });
  }
  
  // Check for topic words in title (high value)
  if (article.title) {
    const titleLower = article.title.toLowerCase();
    
    // Check for exact phrase match first (high value)
    const normalizedTopicStr = topicSlug.replace(/-/g, ' ').toLowerCase();
    if (titleLower.includes(normalizedTopicStr)) {
      score += 70; // Higher score for exact phrase match
      matchReasons.push('Exact phrase match in title');
    } else {
      // Fall back to individual word matches
      const titleMatches = topicWords.filter(word => titleLower.includes(word.toLowerCase()));
      if (titleMatches.length > 0) {
        const titleScore = Math.min(35, titleMatches.length * 15);
        score += titleScore;
        matchReasons.push(`Title matches (${titleMatches.length} words)`);
      }
    }
  }
  
  // Check for topic words in excerpt (medium value)
  if (article.excerpt) {
    const excerptLower = article.excerpt.toLowerCase();
    
    // Check for exact phrase match first (high value)
    const normalizedTopicStr = topicSlug.replace(/-/g, ' ').toLowerCase();
    if (excerptLower.includes(normalizedTopicStr)) {
      score += 50; // Higher score for exact phrase match
      matchReasons.push('Exact phrase match in excerpt');
    } else {
      // Fall back to individual word matches
      const excerptMatches = topicWords.filter(word => excerptLower.includes(word.toLowerCase()));
      if (excerptMatches.length > 0) {
        const excerptScore = Math.min(25, excerptMatches.length * 10);
        score += excerptScore;
        matchReasons.push(`Excerpt matches (${excerptMatches.length} words)`);
      }
    }
  }
  
  // Check for topic words in content (if available, lower value but still relevant)
  if (article.content) {
    const contentLower = article.content.toLowerCase();
    
    // Check for exact phrase match first
    const normalizedTopicStr = topicSlug.replace(/-/g, ' ').toLowerCase();
    if (contentLower.includes(normalizedTopicStr)) {
      score += 40; // Higher score for exact phrase match
      matchReasons.push('Exact phrase match in content');
    } else {
      // Fall back to individual word matches
      const contentMatches = topicWords.filter(word => contentLower.includes(word.toLowerCase()));
      if (contentMatches.length > 0) {
        const contentScore = Math.min(20, contentMatches.length * 5);
        score += contentScore;
        matchReasons.push(`Content matches (${contentMatches.length} words)`);
      }
    }
  }
  
  // Additional boost for matching categories that contain "Additive Manufacturing"
  if (topicSlug.toLowerCase().includes("additive")) {
    // Special handling for Additive Manufacturing and related topics
    if (article.categories && Array.isArray(article.categories)) {
      const hasAdditiveCategory = article.categories.some(cat => {
        const catName = typeof cat === 'string' ? cat : (cat.name || '');
        return catName.toLowerCase().includes('additive') || catName.toLowerCase().includes('3d print');
      });
      
      if (hasAdditiveCategory) {
        score += 30;
        matchReasons.push('Additive Manufacturing category match');
      }
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