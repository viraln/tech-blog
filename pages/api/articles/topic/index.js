import { getAllArticles } from '../../../../utils/articleUtils';

// Add caching to improve performance
export const config = {
  runtime: 'nodejs',
};

// In-memory cache
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Define our canonical topic mapping for standardization
const topicMap = {
  // Technology topics
  'tech': { id: 'tech', name: 'Technology', icon: '💻' },
  'technology': { id: 'tech', name: 'Technology', icon: '💻' },
  'software': { id: 'software', name: 'Software', icon: '💻' },
  'webdevelopment': { id: 'web-development', name: 'Web Development', icon: '🌐' },
  'web': { id: 'web-development', name: 'Web Development', icon: '🌐' },
  'cloud': { id: 'cloud', name: 'Cloud Computing', icon: '☁️' },
  'security': { id: 'security', name: 'Security', icon: '🔒' },
  'ai': { id: 'ai', name: 'AI', icon: '🤖' },
  'artificialintelligence': { id: 'ai', name: 'AI', icon: '🤖' },
  'machinelearning': { id: 'machine-learning', name: 'Machine Learning', icon: '🧠' },
  'deeplearning': { id: 'deep-learning', name: 'Deep Learning', icon: '🧠' },
  'genai': { id: 'generative-ai', name: 'Generative AI', icon: '🎨' },
  
  // Science topics
  'science': { id: 'science', name: 'Science', icon: '🔬' },
  'physics': { id: 'physics', name: 'Physics', icon: '⚛️' },
  'astronomy': { id: 'astronomy', name: 'Astronomy', icon: '🔭' },
  'biology': { id: 'biology', name: 'Biology', icon: '🧬' },
  'quantum': { id: 'quantum', name: 'Quantum Science', icon: '🔄' },
  
  // Business topics
  'business': { id: 'business', name: 'Business', icon: '💼' },
  'innovation': { id: 'innovation', name: 'Innovation', icon: '💡' },
  'finance': { id: 'finance', name: 'Finance', icon: '💰' },
  
  // Other common topics
  'environment': { id: 'environment', name: 'Environment', icon: '🌿' },
  'health': { id: 'health', name: 'Health', icon: '🩺' },
  'medicine': { id: 'medicine', name: 'Medicine', icon: '🩺' },
  'space': { id: 'space', name: 'Space', icon: '🚀' },
  'design': { id: 'design', name: 'Design', icon: '🎨' },
};

// Function to generate default metadata for topics
function getDefaultTopicMetadata(slug) {
  if (!slug) return null;
  
  // Convert slug to readable name
  const name = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Default icon
  let icon = '📄';
  
  // Return the generated metadata
  return {
    name,
    icon,
    slug
  };
}

// Helper function to normalize strings for consistent matching
function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

export default async function handler(req, res) {
  try {
    const { featured, limit } = req.query;
    
    // Parse parameters
    const featuredOnly = featured === 'true';
    const limitNum = parseInt(limit, 10) || 20;
    
    // Check cache first
    const cacheKey = `topics_featured_${featuredOnly}_limit_${limitNum}`;
    const cachedData = CACHE.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return res.status(200).json(cachedData.data);
    }
    
    // Get all articles to analyze topics
    const allArticles = await getAllArticles();
    
    if (!allArticles || !Array.isArray(allArticles)) {
      return res.status(500).json({
        error: 'Failed to fetch articles',
        message: 'The article data is unavailable'
      });
    }
    
    // Track topics and their article counts
    const topicsTracker = new Map();
    
    // Process all articles to collect topics
    allArticles.forEach(article => {
      // Process explicit topics
      if (article.topics && Array.isArray(article.topics)) {
        article.topics.forEach(topic => {
          const topicId = typeof topic === 'string' ? topic : (topic.id || topic.slug || '');
          if (!topicId) return;
          
          if (!topicsTracker.has(topicId)) {
            topicsTracker.set(topicId, { count: 0, latestDate: null });
          }
          
          const tracker = topicsTracker.get(topicId);
          tracker.count++;
          
          // Track the latest article date for this topic
          if (article.date) {
            const articleDate = new Date(article.date);
            if (!tracker.latestDate || articleDate > tracker.latestDate) {
              tracker.latestDate = articleDate;
            }
          }
        });
      }
      
      // Process categories
      if (article.categories && Array.isArray(article.categories)) {
        article.categories.forEach(category => {
          const categoryId = typeof category === 'string' ? category : (category.id || category.slug || '');
          if (!categoryId) return;
          
          if (!topicsTracker.has(categoryId)) {
            topicsTracker.set(categoryId, { count: 0, latestDate: null });
          }
          
          const tracker = topicsTracker.get(categoryId);
          tracker.count++;
          
          if (article.date) {
            const articleDate = new Date(article.date);
            if (!tracker.latestDate || articleDate > tracker.latestDate) {
              tracker.latestDate = articleDate;
            }
          }
        });
      }
      
      // Process main category
      if (article.category) {
        const categoryId = typeof article.category === 'string' ? article.category : (article.category.id || article.category.slug || '');
        if (categoryId) {
          if (!topicsTracker.has(categoryId)) {
            topicsTracker.set(categoryId, { count: 0, latestDate: null });
          }
          
          const tracker = topicsTracker.get(categoryId);
          tracker.count++;
          
          if (article.date) {
            const articleDate = new Date(article.date);
            if (!tracker.latestDate || articleDate > tracker.latestDate) {
              tracker.latestDate = articleDate;
            }
          }
        }
      }
    });
    
    // Convert map to array and add metadata
    let topics = Array.from(topicsTracker.entries()).map(([slug, data]) => {
      // Try to find in our canonical topic map first
      const normalized = normalizeString(slug);
      const canonicalTopic = Object.entries(topicMap).find(([key, _]) => {
        return normalizeString(key) === normalized || normalizeString(key.replace(/-/g, '')) === normalized;
      });
      
      let metadata;
      if (canonicalTopic) {
        metadata = canonicalTopic[1];
      } else {
        // Generate default metadata if not found
        metadata = getDefaultTopicMetadata(slug);
      }
      
      // Calculate recency score (0-100)
      let recencyScore = 0;
      if (data.latestDate) {
        const now = new Date();
        const daysSinceLatest = (now - data.latestDate) / (1000 * 60 * 60 * 24);
        recencyScore = Math.max(0, 100 - Math.min(100, daysSinceLatest * 2)); // 2 points per day
      }
      
      return {
        slug,
        name: metadata.name,
        icon: metadata.icon,
        articleCount: data.count,
        latestArticleDate: data.latestDate?.toISOString() || null,
        recencyScore
      };
    });
    
    // Filter topics with at least 2 articles
    topics = topics.filter(topic => topic.articleCount >= 2);
    
    // Filter featured topics if needed
    if (featuredOnly) {
      // Featured topics have high article count or high recency
      topics = topics.filter(topic => 
        topic.articleCount >= 5 || 
        topic.recencyScore >= 80 ||
        (topic.articleCount >= 3 && topic.recencyScore >= 60)
      );
    }
    
    // Sort topics by a combination of article count and recency
    topics.sort((a, b) => {
      // Calculate a combined score (70% article count, 30% recency)
      const scoreA = (a.articleCount * 0.7) + (a.recencyScore * 0.3);
      const scoreB = (b.articleCount * 0.7) + (b.recencyScore * 0.3);
      return scoreB - scoreA;
    });
    
    // Limit the number of topics
    const limitedTopics = topics.slice(0, limitNum);
    
    // Create response object
    const response = {
      topics: limitedTopics,
      pagination: {
        total: topics.length,
        limit: limitNum,
        hasMore: topics.length > limitNum
      }
    };
    
    // Store in cache
    CACHE.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
    
    // Return the topics
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in topics API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch topics',
      message: error.message
    });
  }
} 