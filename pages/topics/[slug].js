import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import Header from '../../components/Header'
import Footer from '../../components/layout/Footer'
import { topicCategories } from '../../data/topics'
import TopicNav from '../../components/home/TopicNav'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import dynamic from 'next/dynamic'

// Get article data
import { getAllPosts } from '../../utils/mdx'
import { getAllArticles, calculateArticleRelevance } from '../../utils/articleUtils'

// Define our canonical topic mapping for standardization
const topicMap = {
  // Technology topics
  'tech': { id: 'tech', name: 'Technology', icon: '💻' },
  'technology': { id: 'tech', name: 'Technology', icon: '💻' },
  'software': { id: 'software', name: 'Software', icon: '💻' },
  'webdevelopment': { id: 'web-development', name: 'Web Development', icon: '🌐' },
  'web': { id: 'web-development', name: 'Web Development', icon: '🌐' },
  'mobile': { id: 'mobile', name: 'Mobile', icon: '📱' },
  'cloud': { id: 'cloud', name: 'Cloud Computing', icon: '☁️' },
  'cloudcomputing': { id: 'cloud', name: 'Cloud Computing', icon: '☁️' },
  'security': { id: 'security', name: 'Security', icon: '🔒' },
  'cybersecurity': { id: 'security', name: 'Cybersecurity', icon: '🔒' },
  'datascience': { id: 'data-science', name: 'Data Science', icon: '📊' },
  'datasecurity': { id: 'data-security', name: 'Data Security', icon: '🔒' },
  
  // AI topics
  'ai': { id: 'ai', name: 'AI', icon: '🤖' },
  'artificialintelligence': { id: 'ai', name: 'AI', icon: '🤖' },
  'machinelearning': { id: 'machine-learning', name: 'Machine Learning', icon: '🧠' },
  'deeplearning': { id: 'deep-learning', name: 'Deep Learning', icon: '🧠' },
  'genai': { id: 'generative-ai', name: 'Generative AI', icon: '🎨' },
  'generativeai': { id: 'generative-ai', name: 'Generative AI', icon: '🎨' },
  'nlp': { id: 'nlp', name: 'NLP', icon: '💬' },
  'naturallanguageprocessing': { id: 'nlp', name: 'NLP', icon: '💬' },
  'computervision': { id: 'computer-vision', name: 'Computer Vision', icon: '👁️' },
  
  // Science topics
  'science': { id: 'science', name: 'Science', icon: '🔬' },
  'physics': { id: 'physics', name: 'Physics', icon: '⚛️' },
  'astronomy': { id: 'astronomy', name: 'Astronomy', icon: '🔭' },
  'biology': { id: 'biology', name: 'Biology', icon: '🧬' },
  'quantum': { id: 'quantum', name: 'Quantum Science', icon: '🔄' },
  'medicine': { id: 'medicine', name: 'Medicine', icon: '🩺' },
  'health': { id: 'health', name: 'Health', icon: '🩺' },
  'engineering': { id: 'engineering', name: 'Engineering', icon: '⚙️' },
  
  // Environment topics
  'climate': { id: 'climate', name: 'Climate', icon: '🌍' },
  'climatechange': { id: 'climate', name: 'Climate', icon: '🌍' },
  'environment': { id: 'environment', name: 'Environment', icon: '🌿' },
  'sustainability': { id: 'sustainability', name: 'Sustainability', icon: '♻️' },
  
  // Humanities & Social topics
  'history': { id: 'history', name: 'History', icon: '📜' },
  'historical': { id: 'history', name: 'History', icon: '📜' },
  'ancient': { id: 'history', name: 'Ancient History', icon: '🏛️' },
  'art': { id: 'art', name: 'Art', icon: '🎨' },
  'music': { id: 'music', name: 'Music', icon: '🎵' },
  'literature': { id: 'literature', name: 'Literature', icon: '📚' },
  'philosophy': { id: 'philosophy', name: 'Philosophy', icon: '🧠' },
  'psychology': { id: 'psychology', name: 'Psychology', icon: '🧠' },
  'education': { id: 'education', name: 'Education', icon: '📚' },
  'religion': { id: 'religion', name: 'Religion', icon: '🕌' },
  'culture': { id: 'culture', name: 'Culture', icon: '🌐' },
  
  // Other topics
  'business': { id: 'business', name: 'Business', icon: '💼' },
  'innovation': { id: 'innovation', name: 'Innovation', icon: '💡' },
  'gaming': { id: 'gaming', name: 'Gaming', icon: '🎮' },
  'videogames': { id: 'gaming', name: 'Gaming', icon: '🎮' },
  'lifestyle': { id: 'lifestyle', name: 'Lifestyle', icon: '✨' },
  'life': { id: 'life', name: 'Life', icon: '✨' },
  'politics': { id: 'politics', name: 'Politics', icon: '🏛️' },
  'finance': { id: 'finance', name: 'Finance', icon: '💰' },
  'food': { id: 'food', name: 'Food', icon: '🍳' },
  'entertainment': { id: 'entertainment', name: 'Entertainment', icon: '🎭' },
  'robotics': { id: 'robotics', name: 'Robotics', icon: '🦾' },
  'softrobotics': { id: 'soft-robotics', name: 'Soft Robotics', icon: '🦾' },
  'design': { id: 'design', name: 'Design', icon: '🎨' },
  'space': { id: 'space', name: 'Space', icon: '🚀' },
  'sports': { id: 'sports', name: 'Sports', icon: '⚽' },
  'travel': { id: 'travel', name: 'Travel', icon: '✈️' },
  'bioinspired': { id: 'bio-inspired', name: 'Bio-Inspired', icon: '🦋' },
  'biomimicry': { id: 'biomimicry', name: 'Biomimicry', icon: '🦎' },
  'adaptive': { id: 'adaptive', name: 'Adaptive', icon: '🧩' },
};

// For specific known topics, add custom mapping
const topicAliases = {
  'history': ['historical', 'ancient', 'past', 'civilization', 'archaeology'],
  'sports': ['athletic', 'olympics', 'football', 'soccer', 'basketball', 'baseball'],
  'art': ['artistic', 'painting', 'sculpture', 'gallery', 'museum'],
  'music': ['musical', 'song', 'concert', 'album', 'band', 'artist'],
  'data-security': ['cybersecurity', 'security', 'data privacy', 'privacy', 'encryption', 'data protection'],
  'life': ['lifestyle', 'living', 'daily life', 'quality of life', 'wellbeing', 'well-being'],
  'lifestyle': ['life', 'living', 'daily life', 'quality of life', 'wellbeing', 'well-being'],
  // Add more mappings as needed
};

// --- START: Define getTopicIcon function ---
// Function to get an icon for a topic slug
function getTopicIcon(slug) {
  if (!slug) return '📚'; // Default icon

  const normalizedSlug = normalizeString(slug).compact;

  // Check the main topicMap using the normalized compact slug
  if (topicMap[normalizedSlug]) {
    return topicMap[normalizedSlug].icon || '📚';
  }

  // Check aliases or related terms
  for (const key in topicMap) {
    if (topicMap[key].id === normalizedSlug) {
      return topicMap[key].icon || '📚';
    }
    if (topicMap[key].name && topicMap[key].name.toLowerCase().includes(normalizedSlug)) {
       return topicMap[key].icon || '📚';
    }
  }

  // Check topicAliases
  if (typeof topicAliases !== 'undefined') {
      for (const mainTopic in topicAliases) {
          if (topicAliases[mainTopic].includes(normalizedSlug) && topicMap[mainTopic]) {
              return topicMap[mainTopic].icon || '📚';
          }
      }
  }

  // Fallback icon
  return '📚';
}
// --- END: Define getTopicIcon function ---

// --- START: Define getSubtopics function ---
// Function to get related subtopics for a given topic slug
function getSubtopics(slug) {
  if (!slug) return [];

  const normalizedSlug = normalizeString(slug).compact;

  // Check topicAliases first
  if (typeof topicAliases !== 'undefined' && topicAliases[normalizedSlug]) {
    // Return aliases, formatted nicely
    return topicAliases[normalizedSlug].slice(0, 5).map(formatTopicName);
  }

  // If no direct aliases, find related topics in topicMap
  let related = [];
  if (topicMap[normalizedSlug] && topicMap[normalizedSlug].related) {
     related = topicMap[normalizedSlug].related;
  } else {
     // Basic fallback: find topics containing the slug name
     const searchTerm = formatTopicName(normalizedSlug).toLowerCase();
     for (const key in topicMap) {
         if (key !== normalizedSlug && (key.includes(normalizedSlug) || topicMap[key].name.toLowerCase().includes(searchTerm))) {
             if (related.length < 5 && !related.includes(topicMap[key].name)) {
                 related.push(topicMap[key].name);
             }
         }
     }
  }

  // Return up to 5 formatted subtopic names
  return related.slice(0, 5).map(formatTopicName);
}
// --- END: Define getSubtopics function ---

// --- START: Define getTopicDescription function ---
// Function to generate a generic description for a topic slug
function getTopicDescription(slug) {
  if (!slug) return 'Explore articles and resources on various topics.';

  const formattedName = formatTopicName(slug);
  return `Discover the latest articles, news, insights, and resources related to ${formattedName}. Stay updated on trends and developments.`;
}
// --- END: Define getTopicDescription function ---

// --- START: Define getDefaultTopicMetadata function ---
function getDefaultTopicMetadata(slug) {
  if (!slug) return null;

  const slugStr = typeof slug === 'string' ? slug : String(slug);
  const normalizedSlug = normalizeString(slugStr);
  const displayName = formatTopicName(slugStr); // Use existing formatting

  // Simple metadata structure
  return {
    id: normalizedSlug.compact || 'unknown',
    name: displayName,
    icon: getTopicIcon(slugStr), // Use existing icon function
    slug: slugStr, // Keep original slug for reference
    description: getTopicDescription(slugStr) // Use existing description function
  };
}
// --- END: Define getDefaultTopicMetadata function ---

// Helper function to normalize strings for consistent matching
function normalizeString(str) {
  // Check if str is a string, if not, try to convert it to string or return empty string
  if (!str) return '';
  
  // Handle non-string inputs by converting to string when possible
  const stringValue = typeof str === 'string' 
    ? str 
    : (typeof str === 'object' && str !== null && (str.name || str.id || str.slug || str.toString))
      ? (str.name || str.id || str.slug || str.toString())
      : String(str);
  
  try {
  // First, create a version with special chars replaced by spaces, then normalized
    const spacedVersion = stringValue.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Second, create a version with special chars simply removed
    const compactVersion = stringValue.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  // Store both versions for later comparison
  return {
    spaced: spacedVersion,
    compact: compactVersion,
      original: stringValue.toLowerCase().trim()
  };
  } catch (error) {
    console.error('Error normalizing string:', str, error);
    return { spaced: '', compact: '', original: '' };
  }
}

// Define prefixes array
const prefixes = ['a', 'an', 'the', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'to', 'from'];

// Update format topic name function to better handle topic names with proper capitalization
function formatTopicName(slug) {
  // Handle special cases and known acronyms
  const knownTopics = {
    'ai': 'AI',
    'ui': 'UI',
    'ux': 'UX',
    'ar': 'AR',
    'vr': 'VR',
    'ml': 'ML',
    'iot': 'IoT',
    'saas': 'SaaS',
    'paas': 'PaaS',
    'iaas': 'IaaS',
    'devops': 'DevOps',
    'fintech': 'FinTech',
    'edtech': 'EdTech',
    'martech': 'MarTech',
    'healthtech': 'HealthTech',
    'proptech': 'PropTech',
    '3d': '3D',
    '5g': '5G',
    'b2b': 'B2B',
    'b2c': 'B2C',
    'c2c': 'C2C',
    'p2p': 'P2P',
    'web3': 'Web3',
    'api': 'API',
    'sdk': 'SDK',
    'css': 'CSS',
    'html': 'HTML',
    'nft': 'NFT',
    'dao': 'DAO',
    'defi': 'DeFi',
    'sql': 'SQL',
    'nosql': 'NoSQL',
    'json': 'JSON',
    'yaml': 'YAML',
    'xml': 'XML',
    'graphql': 'GraphQL',
    'rest': 'REST',
    'gpt': 'GPT',
    'cpu': 'CPU',
    'gpu': 'GPU',
    'tpu': 'TPU',
    'npm': 'npm',
    'aws': 'AWS',
    'gcp': 'GCP',
    'azure': 'Azure',
    'ci': 'CI',
    'cd': 'CD',
    'cicd': 'CI/CD',
    'cli': 'CLI',
    'gui': 'GUI',
    'kubernetes': 'Kubernetes',
    'k8s': 'Kubernetes',
    'docker': 'Docker',
    'healthcare': 'Healthcare',
    'webdev': 'Web Development',
    'mobiledev': 'Mobile Development',
    'machinelearning': 'Machine Learning',
    'deeplearning': 'Deep Learning',
    'datascience': 'Data Science',
    'bigdata': 'Big Data',
    'virtualreality': 'Virtual Reality',
    'augmentedreality': 'Augmented Reality',
    'artificialintelligence': 'Artificial Intelligence',
    'computerscience': 'Computer Science',
    'cybersecurity': 'Cybersecurity',
    'infosec': 'Information Security',
    'uxdesign': 'UX Design',
    'appdev': 'App Development',
    'fullstack': 'Full Stack',
    'frontenddevelopment': 'Frontend Development',
    'backenddevelopment': 'Backend Development',
    'cloudcomputing': 'Cloud Computing',
    'serverless': 'Serverless',
    'microservices': 'Microservices',
    '3dprinting': '3D Printing',
    'blockchaintech': 'Blockchain Technology',
    'cryptotech': 'Crypto Technology'
  };

  // Return directly if it's a known topic
  if (knownTopics[slug.toLowerCase()]) {
    return knownTopics[slug.toLowerCase()];
  }

  // Special case for multi-word slugs with known topics
  const parts = slug.split('-');
  if (parts.length > 1) {
    const processedParts = parts.map(part => {
      if (knownTopics[part.toLowerCase()]) {
        return knownTopics[part.toLowerCase()];
      }
      
      // Check if this is a prefix word
      if (prefixes.includes(part.toLowerCase())) {
        return part.toLowerCase();
      }
      
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    });
    
    return processedParts.join(' ');
  }

  // Normal capitalization for single words
  return slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase();
}

function isTopicMatch(topicA, topicB) {
  if (!topicA || !topicB) return false;
  
  // Normalize both topics
  const normalizedA = typeof topicA === 'string' ? normalizeString(topicA) : topicA;
  const normalizedB = typeof topicB === 'string' ? normalizeString(topicB) : topicB;
  
  // Convert single string to normalized object if needed
  const a = typeof normalizedA === 'string' ? normalizeString(normalizedA) : normalizedA;
  const b = typeof normalizedB === 'string' ? normalizeString(normalizedB) : normalizedB;
  
  // Extract names if objects
  const nameA = typeof topicA === 'object' && topicA !== null ? 
    (topicA.name || topicA.id || topicA.slug || '').toLowerCase().trim() : 
    String(topicA).toLowerCase().trim();
    
  const nameB = typeof topicB === 'object' && topicB !== null ? 
    (topicB.name || topicB.id || topicB.slug || '').toLowerCase().trim() : 
    String(topicB).toLowerCase().trim();
  
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
  
  // Different matching strategies
  const exactMatch = a.compact === b.compact;
  const spacedMatch = a.spaced === b.spaced;
  const containsMatch = a.compact.includes(b.compact) || b.compact.includes(a.compact);
  
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
  
  // Word-level matching for single words (from original function)
  const wordsMatch = a.spaced.split(' ').some(word => b.spaced.split(' ').includes(word) && word.length > 2);
  
  // For hyphenated topics, also check the un-hyphenated version
  const hyphenMatch = a.original.replace(/-/g, '') === b.original.replace(/-/g, '') && 
                     a.original.length > 3;
                     
  // For topics with spaces, also check the hyphenated version
  const spaceToHyphenMatch = a.original.replace(/\s+/g, '-') === b.original || 
                            b.original.replace(/\s+/g, '-') === a.original;
                            
  return exactMatch || spacedMatch || containsMatch || wordsMatch || hyphenMatch || spaceToHyphenMatch;
}

// Helper function to find a topic by slug in the topicMap
function findTopicBySlug(slug) {
  if (!slug) return null;
  
  // Normalize the input slug for comparison
  const normalizedInputSlug = normalizeString(slug);
  
  // Search in all categories of the topicMap
  for (const category in topicMap) {
    const topics = topicMap[category];
    if (!Array.isArray(topics)) continue;
    
    for (const topic of topics) {
      // Check if the current topic's slug matches the input slug
      if (isTopicMatch(topic.id || topic.slug || '', slug)) {
        return {
          name: topic.name,
          icon: topic.icon,
          slug: topic.id || topic.slug
        };
      }
    }
  }
  
  // Check in topicAliases if defined
  if (typeof topicAliases !== 'undefined') {
    for (const aliasKey in topicAliases) {
      const aliases = topicAliases[aliasKey];
      for (const alias of aliases) {
        if (isTopicMatch(alias, slug)) {
          // Find the main topic this alias points to
          for (const category in topicMap) {
            const topics = topicMap[category];
            if (!Array.isArray(topics)) continue;
            
            for (const topic of topics) {
              if (isTopicMatch(topic.id || topic.slug || '', aliasKey)) {
                return {
                  name: topic.name,
                  icon: topic.icon,
                  slug: topic.id || topic.slug
                };
              }
            }
          }
        }
      }
    }
  }
  
  // Finally, check if the slug exactly matches a topic category name
  for (const category in topicMap) {
    if (isTopicMatch(category, slug)) {
      const topics = topicMap[category];
      if (Array.isArray(topics) && topics.length > 0) {
        // Find a representative topic from this category
        const representativeTopic = topics[0];
        return {
          name: category.charAt(0).toUpperCase() + category.slice(1),
          icon: representativeTopic.icon || '📚',
          slug: category,
          isCategory: true // Mark this as a category match
        };
      }
    }
  }
  
  return null;
}

// RelatedTopicCard component
const RelatedTopicCard = ({ topic, articles }) => {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [articleCount, setArticleCount] = useState(0);
  
  // Deduplicate articles by slug to ensure no duplicates are shown
  const uniqueArticles = useMemo(() => {
    if (!articles || !Array.isArray(articles)) return [];
    
    // Use a map to keep only the most recent article for each slug
    const articleMap = new Map();
    articles.forEach(article => {
      if (!article.slug) return;
      
      // If we already have this slug, only replace if the current one is newer
      if (articleMap.has(article.slug)) {
        const existing = articleMap.get(article.slug);
        if (article.date && existing.date && new Date(article.date) > new Date(existing.date)) {
          articleMap.set(article.slug, article);
        }
      } else {
        articleMap.set(article.slug, article);
      }
    });
    
    // Convert map to array and sort by date (newest first)
    return Array.from(articleMap.values())
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
      });
  }, [articles]);
  
  // Get clean slug by removing .webp extension if it exists 
  const getProperSlug = (topicInput) => {
    // If the topic is a string, create a slug from it
    if (typeof topicInput === 'string') {
      return createTopicSlug(topicInput);
    }
    
    // If it's an object with id or slug, use that
    if (topicInput.id) return topicInput.id;
    if (topicInput.slug) return topicInput.slug;
    
    // Otherwise generate a slug from the name
    return createTopicSlug(topicInput.name || 'topic');
  };
  
  // Get an appropriate icon for the topic with backups
  const getTopicIconWithPriority = (topicInput) => {
    // If it's a string, try to get an icon for it
    if (typeof topicInput === 'string') {
      return getTopicIcon(topicInput);
    }
    
    // Check if the topic object has an icon
    if (topicInput.icon) return topicInput.icon;
    
    // Try to get an icon from the name or id
    if (topicInput.name) return getTopicIcon(topicInput.name);
    if (topicInput.id) return getTopicIcon(topicInput.id);
    
    // Fallback to a generic icon
    return '📚';
  };
  
  // Handle clicks on the topic card
  const handleTopicClick = (e) => {
    e.preventDefault();
    const slug = getProperSlug(topic);
    
    // Track navigation for analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'related_topic_click', {
        topic_name: typeof topic === 'string' ? topic : (topic.name || topic.id || 'unknown'),
        from_page: router.asPath
      });
    }
    
    // Navigate to the topic page
    router.push(`/topics/${slug}`);
  };
  
  // Fetch article count for this topic
  useEffect(() => {
    const fetchArticleCount = async () => {
      if (!topic) return;
      
      const topicSlug = getProperSlug(topic);
      
      try {
        // First check if we already have articles for this topic
        if (articles && Array.isArray(articles) && articles.length > 0) {
          setArticleCount(articles.length);
          return;
        }
        
        // Otherwise try to fetch from API
        const response = await fetch(`/api/articles/topic/${topicSlug}?count=true`);
        if (response.ok) {
          const data = await response.json();
          setArticleCount(data.count || 0);
        }
      } catch (error) {
        console.error(`Failed to fetch article count for ${topicSlug}:`, error);
        // Set a default count if articles array is available
        if (articles && Array.isArray(articles)) {
          setArticleCount(articles.length);
        }
      }
    };
    
    fetchArticleCount();
  }, [topic, articles]);
  
  // Format topic name for display
  const getDisplayName = () => {
    if (typeof topic === 'string') {
      return formatTopicName(topic);
    }
    
    return topic.name || formatTopicName(topic.id || 'Topic');
  };
  
  // Extract image URL if available
  const getTopicImage = () => {
    if (typeof topic === 'object' && topic.image) {
      return topic.image;
    }
    
    return null;
  };

  const topicImage = getTopicImage();
  const topicIcon = getTopicIconWithPriority(topic);
  const topicName = getDisplayName();
  const topicSlug = getProperSlug(topic);
  
    return (
    <div 
      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-300 h-full cursor-pointer flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleTopicClick}
    >
      <div className="flex flex-col h-full">
        {/* Topic Header */}
        <div className="bg-gradient-to-br from-indigo-700 to-purple-700 p-4 text-white flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm w-10 h-10 mr-3">
              <span className="text-xl">{topicIcon}</span>
            </div>
            <div>
              <h3 className="font-bold text-lg truncate max-w-[150px] sm:max-w-xs">{topicName}</h3>
              <div className="text-xs text-white/70 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {articleCount} {articleCount === 1 ? 'article' : 'articles'}
              </div>
            </div>
          </div>
          <div className={`transform transition-transform duration-300 ${isHovered ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
              </div>
            </div>
            
        {/* Related Articles */}
        <div className="p-4 flex-1">
          {uniqueArticles && uniqueArticles.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Recent Articles</h4>
              {uniqueArticles.slice(0, 3).map((article, index) => (
                <div 
                  key={article.slug || index} 
                  className="flex items-start py-2 border-b border-gray-100 last:border-0 group cursor-pointer hover:bg-indigo-50 rounded-md transition-colors duration-200 -mx-2 px-2" // Added hover effect and padding fix
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/posts/${article.slug}`);
                  }}
                >
                  <div className="w-10 h-10 rounded-md bg-gray-200 flex-shrink-0 overflow-hidden mr-3">
                    {article.image ? (
                      <img 
                        src={article.image} 
                        alt={article.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://placehold.co/100x100/6366f1/ffffff?text=${article.title.charAt(0)}`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-700 font-bold">
                        {article.title.charAt(0)}
                    </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-gray-800 group-hover:text-indigo-700 transition-colors line-clamp-2">
                      {article.title}
                    </h5>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {article.date ? new Date(article.date).toLocaleDateString('en-US', {
                        month: 'short', 
                        day: 'numeric',
                      }) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-sm">No articles yet</p>
          </div>
          )}
      </div>
        
        {/* Card Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 mt-auto">
          <div className={`flex items-center justify-center text-indigo-700 text-sm font-medium transition-all duration-300 ${isHovered ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-50 text-indigo-700'} rounded-lg py-2 group-hover:bg-indigo-100 group-hover:text-indigo-800`}>
            <span>Browse Topic</span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''} group-hover:translate-x-1`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

// Create a client-side only wrapper component that will handle all router operations
const ClientSideContent = ({ initialData }) => {
  const router = useRouter();
  // Extract slug safely, falling back to initialData if router is not ready
  const { slug, subSlug } = router?.query || { 
    slug: initialData?.topic || null, 
    subSlug: null 
  };
  
  // Track initialization with ref instead of empty dependency useEffect
  const initializedRef = useRef(false);
  const loadMoreButtonRef = useRef(null);
  
  // Define constants used throughout the component
  const articlesPerPage = 9;
  
  // Define all state hooks at the top level consistently regardless of loading state
  const [allArticles, setAllArticles] = useState(initialData.articlesData || []);
  const [articles, setArticles] = useState((initialData.articlesData || []).slice(0, articlesPerPage));
  const [isLoading, setIsLoading] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('latest');
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState((initialData.articlesData || []).length > articlesPerPage);
  const [relatedTopics, setRelatedTopics] = useState(initialData.relatedTopics || []);
  const [topicMetadata, setTopicMetadata] = useState(initialData.topicMetadata || null);
  const [clientDataLoaded, setClientDataLoaded] = useState(false);
  const [clientDataError, setClientDataError] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newlyLoadedArticles, setNewlyLoadedArticles] = useState([]);
  
  // Add animation state for content reveal
  const [animateContent, setAnimateContent] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const heroRef = useRef(null);
  
  // --- START: Define getTopicDescription directly inside component ---
  const getTopicDescription = useCallback((currentSlug) => {
    if (!currentSlug) return 'Explore articles and resources on various topics.';
    const formattedName = formatTopicName(currentSlug);
    return `Discover the latest articles, news, insights, and resources related to ${formattedName}. Stay updated on trends and developments.`;
  }, []); // No dependencies needed if formatTopicName is global
  // --- END: Define getTopicDescription directly inside component ---
  
  // Define helper functions and processor functions
  function processFetchedArticles(articles, topicSlug) {
    // Return mock data if no articles
    if (!articles || articles.length === 0) {
      console.warn(`No articles found for topic: ${topicSlug}, using fallback data`);
      return createMockArticles(topicSlug, currentFilter);
    }
    
    // Deduplicate by slug to avoid duplicate key warnings and duplicate content
    const uniqueArticles = [];
    const slugSet = new Set();
    const titleSet = new Set();
    
    // Apply a more aggressive filter for certain topics
    const isMLTopic = topicSlug.toLowerCase().includes('machine learning');
    const isHealthcareTopic = topicSlug.toLowerCase().includes('health') || 
                             topicSlug.toLowerCase() === 'healthcare' ||
                             topicSlug.toLowerCase() === 'medical';
    const isARTopic = topicSlug.toLowerCase() === 'ar' || 
                      topicSlug.toLowerCase().includes('augmented reality') ||
                      topicSlug.toLowerCase().includes('augmented-reality');
    
    console.log(`Processing ${articles.length} articles for topic: ${topicSlug} (Healthcare: ${isHealthcareTopic}, ML: ${isMLTopic}, AR: ${isARTopic})`);
    
    articles.forEach(article => {
      // Skip if we already have this article
      if (slugSet.has(article.slug) || titleSet.has(article.title)) {
        console.log(`Skipping duplicate article: ${article.title}`);
        return;
      }
      
      // --- START: Ensure trending/featured flags exist ---
      if (article.trending === undefined) article.trending = false;
      if (article.featured === undefined) article.featured = false;
      // --- END: Ensure trending/featured flags exist ---
      
      // Special handling for AR topics to include all relevant AR content
      if (isARTopic) {
        // Check for AR terminology with more patterns
        const hasARTerms = /\b(augmented reality|AR|AR glasses|AR headset|AR technology|mixed reality|spatial computing|AR app|augmented|metaverse|XR|extended reality|AR platform)\b/i.test(article.title || '') || 
                          /\b(augmented reality|AR|AR glasses|AR headset|AR technology|mixed reality|spatial computing|AR app|augmented|metaverse|XR|extended reality|AR platform)\b/i.test(article.excerpt || '');
        
        // For AR topic page, we want to include most content that might be relevant
        if (!hasARTerms) {
          // Check if any categories or tags suggest AR relevance
          let hasARCategory = false;
          
          if (article.categories && Array.isArray(article.categories)) {
            hasARCategory = article.categories.some(cat => {
              const catName = typeof cat === 'string' ? cat : (cat.name || cat.id || '');
              return catName.toLowerCase().includes('ar') || 
                    catName.toLowerCase().includes('augmented') ||
                    catName.toLowerCase().includes('reality') ||
                    catName.toLowerCase().includes('mixed');
            });
          }
          
    if (article.tags && Array.isArray(article.tags)) {
            hasARCategory = hasARCategory || article.tags.some(tag => {
              const tagName = typeof tag === 'string' ? tag : (tag.name || tag.id || '');
              return tagName.toLowerCase().includes('ar') || 
                    tagName.toLowerCase().includes('augmented') ||
                    tagName.toLowerCase().includes('reality') ||
                    tagName.toLowerCase().includes('mixed');
            });
          }
          
          // If we found AR in categories or tags, include it regardless of content
          if (hasARCategory) {
            // Include this article
            slugSet.add(article.slug);
            titleSet.add(article.title);
            uniqueArticles.push(article);
            return; // Skip further processing
          }
          
          // Calculate relevance score to see if it's still relevant despite not directly mentioning AR
          const relevance = calculateArticleRelevance(article, topicSlug);
          if (relevance < 10) { // Even lower threshold for AR topics - we want to be inclusive
            console.log(`AR topic: Very low relevance article filtered out: ${article.title} (score: ${relevance})`);
            return;
          }
        }
      }
      
      // Special filtering for Healthcare topics
      if (isHealthcareTopic) {
        // Check article for AR/VR content
        const hasARTerms = /\b(augmented reality|AR glasses|AR headset|AR technology)\b/i.test(article.title || '') || 
                          /\b(augmented reality|AR glasses|AR headset|AR technology)\b/i.test(article.excerpt || '');
        
        // Check for healthcare-related terms 
        const hasHealthTerms = /\b(health|medical|medicine|patient|doctor|hospital|therapy|treatment|clinical|wellness)\b/i.test(article.title || '') ||
                              /\b(health|medical|medicine|patient|doctor|hospital|therapy|treatment|clinical|wellness)\b/i.test(article.excerpt || '');
        
        // If it has AR terms but no health terms in the title, it's not relevant
        if (hasARTerms && !hasHealthTerms) {
          console.log(`Healthcare topic: Filtering out AR article: ${article.title}`);
          return;
        }
        
        // Calculate relevance score for additional filtering
        const relevance = calculateArticleRelevance(article, topicSlug);
        if (relevance < 40) { // Higher threshold for healthcare
          console.log(`Healthcare topic: Low relevance article filtered out: ${article.title} (score: ${relevance})`);
          return;
        }
      }
      
      // Machine Learning filtering
      if (isMLTopic) {
        const relevance = calculateArticleRelevance(article, topicSlug);
        
        // Check for AR terms that shouldn't be in Machine Learning content
        const hasARTerms = /\b(augmented reality|AR glasses|AR headset)\b/i.test(article.title || '') || 
                         /\b(augmented reality|AR glasses|AR headset)\b/i.test(article.excerpt || '');
                         
        const hasMLTerms = /\b(machine learning|ML|algorithm|neural network|AI model|training data)\b/i.test(article.title || '') ||
                         /\b(machine learning|ML|algorithm|neural network|AI model|training data)\b/i.test(article.excerpt || '');
        
        // Skip AR content that doesn't explicitly mention ML terms
        if (hasARTerms && !hasMLTerms) {
          console.log(`Filtering out AR article from ML page: ${article.title}`);
          return;
        }
        
        // Skip low relevance content
        if (relevance < 35) {
          console.log(`Filtering out low relevance article: ${article.title} (score: ${relevance})`);
          return;
        }
      }
      
      slugSet.add(article.slug);
      titleSet.add(article.title);
      uniqueArticles.push(article);
    });
    
    return uniqueArticles;
  }
  
  // Deduplication function to avoid duplicate articles
  const deduplicateArticles = (articlesArray) => {
    if (!articlesArray || !Array.isArray(articlesArray)) return [];
    
    const uniqueArticles = [];
    const slugSet = new Set();
    const titleSet = new Set();
    const excerptSet = new Set();
    
    for (const article of articlesArray) {
      if (!article.slug || !article.title) continue;
      if (slugSet.has(article.slug) || titleSet.has(article.title)) continue;
      
      // Additional check for very similar excerpts to avoid near-duplicates
      let isDuplicate = false;
      if (article.excerpt) {
        for (const excerpt of excerptSet) {
          // Calculate similarity between excerpts
          if (excerpt && excerpt.length > 20 && article.excerpt.length > 20) {
            // Simple similarity check - if more than 70% of the words are the same, consider it a duplicate
            const words1 = excerpt.toLowerCase().split(/\s+/);
            const words2 = article.excerpt.toLowerCase().split(/\s+/);
            const commonWords = words1.filter(word => words2.includes(word));
            const similarity = commonWords.length / Math.min(words1.length, words2.length);
            
            if (similarity > 0.7) {
              isDuplicate = true;
              break;
            }
          }
        }
      }
      
      if (isDuplicate) continue;
      
      slugSet.add(article.slug);
      titleSet.add(article.title);
      if (article.excerpt) excerptSet.add(article.excerpt);
      uniqueArticles.push(article);
    }
    
    return uniqueArticles;
  };
  
  // Define loadClientData with useCallback before it's used in useEffect
  const loadClientData = useCallback(async () => {
    try {
      // Only load if router is ready and we have a valid slug
      if (!router || !router.isReady || !slug) {
        console.log("Router not ready or slug missing, skipping data load");
        return;
      }
      
      console.log(`Starting client-side data load for topic: ${slug}`);
      setIsLoading(true);
      
      try {
        // Attempt to fetch real articles - this should use the top-level topic API
        let articlesData = await fetchArticleData(slug);
          
        // Apply aggressive deduplication
        articlesData = deduplicateArticles(articlesData);
        console.log(`Loaded ${articlesData.length} articles for ${slug}`);
        
        if (articlesData.length > 0) {
          // If we have real articles, use them
          // Set allArticles to deduplicated articles
          setAllArticles(articlesData);
          setArticles(articlesData.slice(0, articlesPerPage));
          setHasMore(articlesData.length > articlesPerPage);
          
          // Calculate related topics if we have real articles
          try {
            const topicsData = getRelatedTopicsFromArticles(articlesData, slug);
            console.log(`Generated ${topicsData.length} related topics`);
            if (topicsData.length > 0) {
              setRelatedTopics(topicsData);
            }
          } catch (topicsError) {
            console.error('Error generating related topics:', topicsError);
        }
      } else {
          console.warn('No articles returned, showing mock data');
          // Create fallback content only if no real articles
          const mockArticles = createMockArticles(slug, currentFilter);
          setAllArticles(mockArticles);
          setArticles(mockArticles.slice(0, articlesPerPage));
          setHasMore(mockArticles.length > articlesPerPage);
          
          // Generate related topics from mock data as last resort
          const topicsData = getRelatedTopicsFromArticles(mockArticles, slug);
          if (topicsData.length > 0) {
            setRelatedTopics(topicsData);
          }
        }
        
        // Mark as client-loaded
        setClientDataLoaded(true);
        setClientDataError(false);
        
      } catch (error) {
        console.error('[Client] Error in client-side data loading:', error);
        setClientDataError(true);
      } finally {
        setIsLoading(false);
        setClientDataLoaded(true);
      }
    } catch (err) {
      console.error('[Client] Fatal error in loadClientData:', err);
      setClientDataError(true);
      setIsLoading(false);
      setClientDataLoaded(true);
    }
  }, [router, slug, setAllArticles, setArticles, setHasMore, setIsLoading, setRelatedTopics, setClientDataLoaded, setClientDataError]);
  
  // Use for intersection observer to trigger animations
  const handleIntersection = entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setAnimateContent(true);
      }
    });
  };
  
  // Initialize intersection observer for animation triggers
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Trigger initial animation after a short delay for smoother transitions
    const timer = setTimeout(() => {
      setAnimateContent(true);
    }, 100);
    
    // Observer for scroll animations
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.2,
      rootMargin: '0px'
    });
    
    // Add elements to observe
    const elementsToObserve = document.querySelectorAll('.observe-me');
    elementsToObserve.forEach(el => observer.observe(el));
    
    // Hide scroll indicator after scrolling
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowScrollIndicator(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      clearTimeout(timer);
      elementsToObserve.forEach(el => observer.unobserve(el));
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);
  
  // Define filteredArticles with useMemo to prevent unnecessary recalculations
  const filteredArticles = useMemo(() => {
    if (!allArticles || allArticles.length === 0) return [];
  
    // First deduplicate all articles by slug
    const uniqueArticles = [];
    const slugSet = new Set();
    
    for (const article of allArticles) {
      if (!article.slug) continue;
      if (slugSet.has(article.slug)) continue;
      
      slugSet.add(article.slug);
      uniqueArticles.push(article);
    }
    
    console.log(`Deduplicated ${allArticles.length} articles to ${uniqueArticles.length} unique articles`);
    
    // Then apply filters
    let filtered = [...uniqueArticles];
  
    if (currentFilter === 'trending') {
      filtered = filtered.filter(article => article.trending === true);
    } else if (currentFilter === 'featured') {
      filtered = filtered.filter(article => article.featured === true);
    }
  
    // Sort by date (latest first)
    filtered.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
      });
  
    return filtered;
  }, [allArticles, currentFilter, slug]);
  
  // Memoize related topics calculation
  const calculatedRelatedTopics = useMemo(() => {
    // Only calculate related topics when allArticles changes
    if (allArticles && allArticles.length > 0 && slug) {
      return getRelatedTopicsFromArticles(allArticles, slug);
    }
    return null; // Return null if we can't calculate
  }, [allArticles, slug]);
  
  // Memoize the related topics list for rendering
  const memoizedRelatedTopicsList = useMemo(() => {
    if (!relatedTopics || !Array.isArray(relatedTopics) || relatedTopics.length === 0) {
      return <div className="py-4 text-gray-500 dark:text-gray-400">No related topics found</div>;
    }
  
  return (
      <div className="space-y-4">
        {relatedTopics.map((topic) => (
          <RelatedTopicCard
            key={topic && (topic.id || topic.slug || Math.random().toString(36).substring(2, 9))}
            topic={topic}
            articles={topic && topic.articles ? topic.articles : []}
          />
                ))}
              </div>
    );
  }, [relatedTopics]);

  // Add CSS animation styles
  useEffect(() => {
    // Add the necessary CSS animation to the document head
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      @keyframes fadeIn {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .animate-fadeIn {
        animation: fadeIn 0.5s ease-in-out forwards;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Clean up on unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Handle data loading
  useEffect(() => {
    // Make sure router exists and is ready before proceeding
    if (!router || !router.isReady || !slug) {
      return;
    }
    
    const handleDataLoading = async () => {
      console.log(`URL parameter changed to ${slug}, reloading data...`);
      
      // Reset state to prevent showing stale data
      setIsLoading(true);
      setNavLoading(true);
      setClientDataLoaded(false);
      setClientDataError(false);
      
      try {
        // Load data for the new topic
        await loadClientData();
      } catch (error) {
        console.error('Error loading data:', error);
        setClientDataError(true);
      } finally {
        setIsLoading(false);
        setNavLoading(false);
      }
      
      // Scroll to top of page for better user experience
      window.scrollTo(0, 0);
    };
    
    handleDataLoading();
  }, [router, slug, loadClientData, setIsLoading, setNavLoading, setClientDataLoaded, setClientDataError]);
  
  // Add router event listeners for loading state
  useEffect(() => {
    // Make sure router exists before accessing its properties
    if (!router || !router.events) return;
    
    const handleStart = (url) => {
      if (url.startsWith('/topics/') && url !== router.asPath) {
        console.log(`[Topic Page] Navigation started to: ${url}`);
        setNavLoading(true);
      }
    };
    
    const handleComplete = () => {
      setNavLoading(false);
    };
    
    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);
    
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]); // Change dependency from router.events to router
  
  // Client-side data fetching function - Wrap with useCallback to avoid recreating on every render
  const fetchArticleData = useCallback(async (topicSlug) => {
  try {
    console.log(`Fetching articles for topic: ${topicSlug}`);
    
    // Use the proven API endpoints that were working before
    let apiUrl = `/api/articles/topic/${encodeURIComponent(topicSlug)}?limit=50&page=1`;
    
    // Add higher relevance threshold for Machine Learning to exclude AR content
    if (topicSlug.toLowerCase().includes('machine learning')) {
      apiUrl += '&minScore=35';
    }
    // Lower threshold for AR topics to include more relevant content
    else if (topicSlug.toLowerCase() === 'ar' || 
             topicSlug.toLowerCase().includes('augmented reality') ||
             topicSlug.toLowerCase().includes('augmented-reality')) {
      apiUrl += '&minScore=15';  // Lower threshold for AR topics
      console.log('Using lower threshold for AR topic');
    }
    // Lower threshold for multi-word topics like "User Experience"
    else if (topicSlug.includes('-') || topicSlug.includes(' ')) {
      apiUrl += '&minScore=20';  // Lower threshold for multi-word topics
      console.log(`Using lower threshold for multi-word topic: ${topicSlug}`);
    }
    // Default threshold for other topics
    else {
      apiUrl += '&minScore=25';  // Slightly lower general threshold
    }
      
      // Add filter parameters if needed
      if (currentFilter === 'trending') {
        apiUrl += '&trending=true';
      } else if (currentFilter === 'featured') {
        apiUrl += '&featured=true';
      }
      
      // Add a higher minScore for machine learning to get more relevant content
      if (topicSlug.toLowerCase().includes('machine learning')) {
        apiUrl += '&minScore=30';  // Increase the relevance threshold
      }
      
      console.log(`Requesting from: ${apiUrl}`);
      const response = await fetch(apiUrl);
      
      // If the primary endpoint fails, try the fallback
      if (!response.ok) {
        console.warn(`Primary API endpoint failed with status ${response.status}, trying fallback...`);
        
        // Try the general articles endpoint as fallback
        const fallbackUrl = `/api/posts?limit=50`;
        const fallbackResponse = await fetch(fallbackUrl);
        
        if (!fallbackResponse.ok) {
          console.error(`Fallback API also failed with status ${fallbackResponse.status}`);
          throw new Error(`Both API endpoints failed`);
        }
        
        const fallbackData = await fallbackResponse.json();
        return processFetchedArticles(fallbackData.posts || [], topicSlug);
      }
      
      // Process the response from the primary endpoint
      const data = await response.json();
      const articles = data.articles || [];
      
      console.log(`Successfully fetched ${articles.length} articles from ${apiUrl}`);
      
      return processFetchedArticles(articles, topicSlug);
    } catch (error) {
      console.error('Error fetching article data:', error);
      
      // Only use mock data if the API call failed completely
      console.warn('Using mock data due to API failure');
      return createMockArticles(topicSlug, currentFilter);
    }
  }, [currentFilter]);
  
  // Effect to set default filter to 'latest' on first load
  useEffect(() => {
    if (!initializedRef.current) {
      setCurrentFilter('latest');
      initializedRef.current = true;
    }
  }, []);
  
  // useEffect to apply initial filtering when allArticles changes
  useEffect(() => {
    if (allArticles && allArticles.length > 0) {
      // Apply current filter to articles
      const initialArticles = filteredArticles.slice(0, articlesPerPage);
      setArticles(initialArticles);
      setHasMore(filteredArticles.length > articlesPerPage);
    }
  }, [allArticles, filteredArticles, articlesPerPage]);
  
  // Set up Intersection Observer for infinite scrolling
  useEffect(() => {
    // Skip if no more articles or still loading
    if (!hasMore || isLoading || !loadMoreButtonRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Load more articles when the button enters the viewport and is not loading
        if (entry.isIntersecting && !isLoading) {
          handleLoadMore();
        }
      },
      { 
        root: null, // Use viewport as root
        rootMargin: '0px 0px 100px 0px', // Start loading when within 100px of viewport
        threshold: 0.1 // Trigger when at least 10% of the element is visible
      }
    );
    
    observer.observe(loadMoreButtonRef.current);
    
    // Cleanup observer on unmount
    return () => {
      if (loadMoreButtonRef.current) {
        observer.unobserve(loadMoreButtonRef.current);
      }
    };
  }, [hasMore, isLoading, filteredArticles]);
  
  // Function to change filter - non-hook functions can be anywhere
  const changeFilter = (filter) => {
    if (filter === currentFilter) return; // Don't reapply the same filter
    
    setCurrentFilter(filter);
    setPage(0);
    
    // Use the filteredArticles that were calculated by useMemo
    const initialArticles = filteredArticles.slice(0, articlesPerPage);
    setArticles(initialArticles);
    setHasMore(filteredArticles.length > articlesPerPage);
  };
  
  // Handle the case when we have articles to display
  const handleLoadMore = () => {
    console.log('Loading more articles...');
    setIsLoadingMore(true);
    
    // Calculate next page of articles from filteredArticles
    const nextStartIndex = articles.length;
    const nextEndIndex = nextStartIndex + articlesPerPage;
    
    // Get next batch with aggressive deduplication
    const existingSlugs = new Set(articles.map(article => article.slug));
    const existingTitles = new Set(articles.map(article => article.title));
    const existingExcerpts = new Set(articles.map(article => article.excerpt));
    
    const nextPageArticles = filteredArticles
      .slice(nextStartIndex, nextEndIndex)
      .filter(article => {
        // Skip if no slug, title, or we've seen this before
        if (!article.slug || !article.title) return false;
        if (existingSlugs.has(article.slug)) return false;
        if (existingTitles.has(article.title)) return false;
        
        // Also check excerpt similarity for additional deduplication
        if (article.excerpt) {
          // Exact match check
          if (existingExcerpts.has(article.excerpt)) return false;
          
          // Check for similar excerpts
          for (const excerpt of existingExcerpts) {
            if (excerpt && excerpt.length > 20 && article.excerpt.length > 20) {
              // Simple similarity check - if more than 70% of the words are the same, consider it a duplicate
              const words1 = excerpt.toLowerCase().split(/\s+/);
              const words2 = article.excerpt.toLowerCase().split(/\s+/);
              const commonWords = words1.filter(word => words2.includes(word));
              const similarity = commonWords.length / Math.min(words1.length, words2.length);
              
              if (similarity > 0.7) return false;
            }
          }
        }
        
        return true;
      });
    
    console.log(`Loading more articles: Found ${nextPageArticles.length} new unique articles`);
    
    // Only append if we have new articles
    if (nextPageArticles.length > 0) {
      setArticles(currentArticles => {
        console.log(`Adding ${nextPageArticles.length} articles to existing ${currentArticles.length}`);
        return [...currentArticles, ...nextPageArticles];
      });
    } else {
      console.log('No new unique articles to load');
    }
    
    // Check if we have more articles to load
    // Move to the next batch even if we didn't find any unique articles in this batch
    const remainingArticles = filteredArticles.length - (nextEndIndex);
    console.log(`Has more articles: ${remainingArticles > 0} (loaded: ${articles.length + nextPageArticles.length}, total: ${filteredArticles.length})`);
    setHasMore(remainingArticles > 0);
    
    // Reset the loading state after a short delay
    setTimeout(() => {
      setIsLoadingMore(false);
    }, 200);
  };
  
  // If we're in a loading state, show loading UI with the hooks already defined
  if (router.isFallback) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />
        <TopicNav className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-6" />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
              <div className="h-48 bg-gradient-to-r from-indigo-700/50 to-purple-700/50"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Return component JSX
  return (
    <>
      <Head>
        <title>{formatTopicName(slug)} Articles & Resources | Tech Blog</title>
        <meta name="description" content={topicMetadata?.description || `Explore the latest ${formatTopicName(slug)} articles, news, and resources.`} />
        <meta property="og:title" content={`${formatTopicName(slug)} - Tech Blog`} />
        <meta property="og:description" content={topicMetadata?.description || `Explore the latest ${formatTopicName(slug)} articles, news, and resources.`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={topicMetadata?.image || "/images/og-image.jpg"} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <Header />
        <TopicNav className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-6" />
        
        {/* Enhanced Hero Section */}
        <section 
          ref={heroRef}
          className={`bg-gradient-to-br from-indigo-900 to-purple-800 text-white relative overflow-hidden mb-8 transition-opacity duration-500 ${animateContent ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* Decorative background patterns */}
          <div className="absolute inset-0 overflow-hidden opacity-10">
            <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-1/2 h-1/2 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-1/2 h-1/2 bg-indigo-300 rounded-full blur-3xl"></div>
              </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative z-10">
            <div className="flex flex-col md:flex-row items-start gap-8">
              {/* Topic Icon/Image */}
              <div className={`bg-white/10 backdrop-blur-sm p-6 rounded-2xl shadow-xl flex items-center justify-center transform transition-all duration-700 ${animateContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                <div className="text-6xl sm:text-7xl">{getTopicIcon(slug)}</div>
            </div>
              
              {/* Topic Information */}
              <div className="flex-1">
                <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 transition-all duration-700 delay-100 ${animateContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                  {formatTopicName(slug)}
                </h1>
                
                <p className={`text-lg sm:text-xl text-white/80 mb-6 max-w-3xl transition-all duration-700 delay-200 ${animateContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                  {topicMetadata?.description || getTopicDescription(slug)}
                </p>
                
                {/* Tags/Subtopics */}
                <div className={`flex flex-wrap gap-2 mb-4 transition-all duration-700 delay-300 ${animateContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                  {getSubtopics(slug).map((subtopic, index) => (
                    <Link
                      key={index} 
                      href={`/topics/${createTopicSlug(subtopic)}`}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                    >
                      {subtopic}
                    </Link>
                  ))}
                </div>
                
                {/* Article count & CTA button */}
                <div className={`flex items-center gap-4 flex-wrap transition-all duration-700 delay-400 ${animateContent ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                  <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="font-medium">
                      {isLoading ? (
                        <span className="flex items-center">
                          <span className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mr-2"></span>
                          Loading...
                        </span>
                      ) : (
                        `${allArticles.length} Articles`
                      )}
                    </span>
                  </div>
                  
                  <a 
                    href="#articles"
                    className="bg-white text-indigo-700 hover:bg-indigo-50 px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-md hover:shadow-lg"
                  >
                    Browse Articles
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            
            {/* Scroll indicator */}
            {/* {showScrollIndicator && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center animate-bounce">
                <div className="text-white/50 text-sm mb-1">Scroll to explore</div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            )} */}
          </div>
        </section>
        
        <main id="articles" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
          {/* Filter and View Bar - with enhanced animations */}
          <div className={`bg-white rounded-xl shadow-sm p-4 mb-6 observe-me transition-all duration-500 transform ${animateContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="flex justify-between flex-wrap gap-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                  <button
                  onClick={() => changeFilter('recent')}
                  className={`px-4 py-2 text-sm rounded-full transition-colors ${
                    currentFilter === 'recent' 
                      ? 'bg-indigo-100 text-indigo-800 font-medium shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Recent
                  </button>
                <button 
                  onClick={() => changeFilter('trending')}
                  className={`px-4 py-2 text-sm rounded-full transition-colors ${
                    currentFilter === 'trending' 
                      ? 'bg-indigo-100 text-indigo-800 font-medium shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Trending
                </button>
                <button 
                  onClick={() => changeFilter('featured')}
                  className={`px-4 py-2 text-sm rounded-full transition-colors ${
                    currentFilter === 'featured' 
                      ? 'bg-indigo-100 text-indigo-800 font-medium shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Featured
                </button>
                {/* Mobile search button */}
                <div className="md:hidden ml-2">
                  <SearchComponent isMobile={true} />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500 mr-2">View:</div>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-indigo-100 text-indigo-800' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-indigo-100 text-indigo-800' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Display data loading indicator - with improved skeleton design */}
          {isLoading && articles.length === 0 && (
            <div className="animate-pulse space-y-6">
              {/* Skeleton for hero section */}
              <div className="bg-white rounded-xl p-8 shadow-sm mb-6">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="h-16 w-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex-shrink-0"></div>
                  <div className="space-y-4 w-full">
                    <div className="h-8 bg-gray-200 rounded-lg w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="flex gap-2 flex-wrap">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-8 bg-gray-200 rounded-full w-20"></div>
                      ))}
                    </div>
              </div>
            </div>
          </div>
          
              {/* Skeleton for filters */}
              <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 overflow-x-auto py-2 items-center">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} 
                        className={`h-9 w-24 rounded-full flex-shrink-0 bg-gray-200 animate-pulse-delay`} 
                        style={{animationDelay: `${i * 150}ms`}}
                      ></div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
              
              {/* Skeleton for articles in grid view */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                  <div 
                    key={i} 
                    className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse-delay"
                    style={{animationDelay: `${i * 100}ms`}}
                  >
                    <div className="h-48 bg-gradient-to-r from-gray-200 to-gray-300"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="flex justify-between pt-2">
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              
              {/* Add CSS for staggered animations in the component */}
              <style jsx>{`
                @keyframes pulseDelay {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
                .animate-pulse-delay {
                  animation: pulseDelay 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
              `}</style>
              </div>
          )}
          
          {/* Display client-side error state if needed - with improved UI */}
          {clientDataError && (
            <div className="bg-white rounded-xl p-8 shadow-sm mb-6 text-center">
              <div className="max-w-md mx-auto">
                <div className="text-red-500 mb-4">
                  <div className="bg-red-50 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="font-bold text-xl mb-2">Unable to load content</p>
                  <p className="text-gray-600 mb-6">We're having trouble loading articles for this topic. Please try again later.</p>
                  <button
                    onClick={() => window.location.reload()} 
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    Refresh Page
                  </button>
              </div>
              </div>
            </div>
          )}
          
          {/* No articles message - with enhanced design */}
          {!isLoading && articles.length === 0 && !clientDataError && (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="bg-indigo-50 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-4xl">📚</span>
                </div>
                <h2 className="text-xl font-bold mb-2">No articles found</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  We couldn't find any articles for this topic yet. Check back soon or explore other topics.
                </p>
                <Link href="/topics" className="inline-flex items-center bg-indigo-600 text-white px-5 py-2.5 rounded-lg transition-colors hover:bg-indigo-700 shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                  Browse All Topics
                </Link>
              </div>
            </div>
          )}
          
          {/* Articles Grid or List */}
          {!isLoading && articles.length > 0 && (
            <div className={`observe-me transition-all duration-500 transform ${animateContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "flex flex-col gap-4"
              }>
                {articles.map((article, index) => {
                  // Check if this is a newly loaded article for animation
                  const isNewlyLoaded = newlyLoadedArticles.includes(article.slug);
                  const animationDelay = `${index * 150}ms`;
                  
                  return viewMode === 'grid' 
                    ? (
                      <div 
                        key={article.slug} 
                        className={`transition-all duration-500 transform ${
                          animateContent 
                            ? 'translate-y-0 opacity-100' 
                            : 'translate-y-8 opacity-0'
                        }`}
                        style={{transitionDelay: animationDelay}}
                      >
                        <GridArticleCard article={article} isNewlyLoaded={isNewlyLoaded} />
                      </div>
                    )
                    : (
                      <div 
                        key={article.slug}
                        className={`transition-all duration-500 transform ${
                          animateContent 
                            ? 'translate-y-0 opacity-100' 
                            : 'translate-y-8 opacity-0'
                        }`}
                        style={{transitionDelay: animationDelay}}
                      >
                        <ListArticleCard article={article} isNewlyLoaded={isNewlyLoaded} />
                      </div>
                    );
                })}
              </div>
            </div>
          )}
          
          {/* Load More indicator and sentinel element for infinite scroll */}
          {hasMore && (
            <div className="mt-8 text-center observe-me" ref={loadMoreButtonRef}>
              {isLoading ? (
                <div className="py-6 flex flex-col items-center justify-center">
                  <div className="relative h-10 w-10 mb-2">
                    <div className="absolute top-0 left-0 h-10 w-10 rounded-full border-4 border-indigo-200"></div>
                    <div className="absolute top-0 left-0 h-10 w-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-700 font-medium">Loading more articles</span>
                    <span className="text-gray-500 text-sm">Please wait...</span>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleLoadMore}
                  className="bg-white border border-gray-300 px-6 py-3 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm hover:shadow group"
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Load More Articles
                  </span>
                </button>
              )}
            </div>
          )}
          
          {/* Related Topics with animations */}
          {relatedTopics && relatedTopics.length > 0 && (
            <div className="mt-16 observe-me transition-all duration-500 transform" id="related-topics">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Related Topics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedTopics.map((topic, index) => (
                  <div 
                    key={`related-topic-${topic.id || topic.slug || index}`} 
                    className={`col-span-1 transition-all duration-500 transform ${
                      animateContent 
                        ? 'translate-y-0 opacity-100' 
                        : 'translate-y-8 opacity-0'
                    }`}
                    style={{transitionDelay: `${index * 150}ms`}}
                  >
                    <RelatedTopicCard 
                      topic={topic} 
                      articles={topic.articles} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
        
        <Footer />
      </div>
    </>
  );
}

// Grid Article Card Component with enhanced display and category navigation
function GridArticleCard({ article, isNewlyLoaded = false }) {
  const router = useRouter();
  
  // Calculate if article is recent (less than 2 weeks old)
  const isRecent = article.date ? 
    (new Date().getTime() - new Date(article.date).getTime()) < 14 * 24 * 60 * 60 * 1000 : 
    false;

  // Format date in a more readable format
  const formattedDate = article.date ? 
    new Date(article.date).toLocaleDateString('en-US', {
      month: 'short', 
      day: 'numeric',
      year: new Date(article.date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    }) : 
    'No date';
    
  // --- START: Extract and deduplicate topics/categories ---
  const articleTopics = useMemo(() => {
    const topicsSet = new Map(); // Use Map to store slug -> name

    const addTopic = (item) => {
      if (!item) return;
      let name, slug;
      if (typeof item === 'string') {
        name = formatTopicName(item); // Get formatted name
        slug = createTopicSlug(item); // Create slug
      } else if (typeof item === 'object') {
        name = item.name || formatTopicName(item.id || item.slug || '');
        slug = item.slug || item.id || createTopicSlug(name);
      }
      if (slug && name && slug.length > 1) { // Ensure valid slug and name
        // Prefer shorter, canonical slugs if duplicates exist
        if (!topicsSet.has(slug) || slug.length < Array.from(topicsSet.keys()).find(k => topicsSet.get(k) === name)?.length) {
           topicsSet.set(slug, name);
        }
      }
    };

    // Process all potential topic sources
    if (article.topics && Array.isArray(article.topics)) {
      article.topics.forEach(addTopic);
    }
    if (article.categories && Array.isArray(article.categories)) {
      article.categories.forEach(addTopic);
    }
    addTopic(article.category); // Process main category

    // Convert Map back to array of objects
    return Array.from(topicsSet.entries()).map(([slug, name]) => ({ slug, name }));
  }, [article.topics, article.categories, article.category]);
  // --- END: Extract and deduplicate topics/categories ---
  
  // Handle navigating to an article's topic page
  const handleCategoryClick = (e, topicSlug) => { // Modified to accept slug directly
    e.preventDefault();
    e.stopPropagation(); // Prevent triggering card click
    
    router.push(`/topics/${topicSlug}`);
  };
  
  // Get reading time
  const readingTime = article.readingTime || article.readTime || (
    article.content ? Math.ceil(article.content.split(' ').length / 200) : 
    article.excerpt ? Math.ceil(article.excerpt.split(' ').length / 20) : 
    3
  );
  
  const hasImage = article.image || article.coverImage || article.thumbnail;
  const imageUrl = article.image || article.coverImage || article.thumbnail || 
    (article.title ? `https://placehold.co/600x400/6366f1/ffffff?text=${article.title.charAt(0)}` : "https://placehold.co/600x400/6366f1/ffffff?text=A");
  
  return (
    <div 
      className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 h-full flex flex-col group cursor-pointer 
        ${isNewlyLoaded ? 'animate-fadeSlideUp' : ''}`}
      onClick={() => router.push(`/posts/${article.slug}`)} // Main card click navigates to post
    >
      {/* Article image with hover effect */}
      <div className="relative overflow-hidden aspect-video">
        <img 
          src={imageUrl}
          alt={article.title}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://placehold.co/600x400/6366f1/ffffff?text=A";
          }}
        />
        
        {/* Recent badge */}
        {isRecent && (
          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-md shadow-md">
            New
          </div>
        )}
        
        {/* Display first category/topic pill on image */}
        {articleTopics.length > 0 && (
          <button // Changed to button for semantic clickability
            onClick={(e) => handleCategoryClick(e, articleTopics[0].slug)}
            className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-full hover:bg-indigo-700 transition-colors cursor-pointer z-10"
          >
            {articleTopics[0].name}
          </button>
        )}
      </div>
      
      {/* Article content with hover effects */}
      <div className="p-5 flex flex-col flex-1">
        {/* Display remaining categories/topics as pills */} 
        {articleTopics.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {articleTopics.slice(1, 6).map((topic) => ( // Show up to 5 more topics (changed from 4)
              <button 
                key={topic.slug}
                onClick={(e) => handleCategoryClick(e, topic.slug)}
                className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                {topic.name}
              </button>
            ))}
          </div>
        )}

        <h3 className="font-bold text-lg mb-2 text-gray-800 group-hover:text-indigo-700 transition-colors line-clamp-2">
          {article.title}
        </h3>
        
        {article.excerpt && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">
          {article.excerpt}
        </p>
        )}
        
        {/* Article metadata */}
        <div className="flex justify-between items-center pt-2 mt-auto text-xs text-gray-500 border-t border-gray-100">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formattedDate}
        </div>
          
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {readingTime} min read
      </div>
        </div>
      </div>
      
      {/* Add animation styles */}
      <style jsx>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeSlideUp {
          animation: fadeSlideUp 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// List Article Card Component with animation support and category navigation
function ListArticleCard({ article, isNewlyLoaded = false }) {
  const router = useRouter();
  
  // Calculate if article is recent (less than 2 weeks old)
  const isRecent = article.date ? 
    (new Date().getTime() - new Date(article.date).getTime()) < 14 * 24 * 60 * 60 * 1000 : 
    false;

  // Format date in a more readable format
  const formattedDate = article.date ? 
    new Date(article.date).toLocaleDateString('en-US', {
      month: 'short', 
      day: 'numeric',
      year: new Date(article.date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    }) : 
    'No date';
    
  // --- START: Extract and deduplicate topics/categories ---
  const articleTopics = useMemo(() => {
    const topicsSet = new Map(); // Use Map to store slug -> name

    const addTopic = (item) => {
      if (!item) return;
      let name, slug;
      if (typeof item === 'string') {
        name = formatTopicName(item);
        slug = createTopicSlug(item);
      } else if (typeof item === 'object') {
        name = item.name || formatTopicName(item.id || item.slug || '');
        slug = item.slug || item.id || createTopicSlug(name);
      }
      if (slug && name && slug.length > 1) {
        // Prefer shorter, canonical slugs if duplicates exist
        if (!topicsSet.has(slug) || slug.length < Array.from(topicsSet.keys()).find(k => topicsSet.get(k) === name)?.length) {
           topicsSet.set(slug, name);
        }
      }
    };

    // Process all potential topic sources
    if (article.topics && Array.isArray(article.topics)) {
      article.topics.forEach(addTopic);
    }
    if (article.categories && Array.isArray(article.categories)) {
      article.categories.forEach(addTopic);
    }
    addTopic(article.category);

    return Array.from(topicsSet.entries()).map(([slug, name]) => ({ slug, name }));
  }, [article.topics, article.categories, article.category]);
  // --- END: Extract and deduplicate topics/categories ---
  
  // Handle category click navigation
  const handleCategoryClick = (e, topicSlug) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent triggering link navigation
    router.push(`/topics/${topicSlug}`);
  };

  // Get reading time
  const readingTime = article.readingTime || article.readTime || (
    article.content ? Math.ceil(article.content.split(' ').length / 200) : 
    article.excerpt ? Math.ceil(article.excerpt.split(' ').length / 20) : 
    3
  );
  
  return (
    <Link 
      href={`/posts/${article.slug}`} 
      className={`flex bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer ${ 
        isNewlyLoaded ? 'animate-fadeIn' : ''
      }`}
    >
      {/* Image Container - Added aspect-video for consistent height */}
      <div className="relative w-32 sm:w-48 flex-shrink-0 aspect-video bg-gray-100"> 
        <Image
          src={article.image || `https://placehold.co/300x200/6366f1/ffffff?text=${article.title?.charAt(0)}`}
          alt={article.title}
          fill
          sizes="(max-width: 640px) 128px, 192px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
             e.target.onerror = null; // Prevent infinite loop
             e.target.src = `https://placehold.co/300x200/6366f1/ffffff?text=${article.title?.charAt(0)}`;
          }}
        />
        {/* Status badges */}
        {article.trending && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
            Trending
          </div>
        )}
        {isRecent && !article.trending && (
          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
            New
      </div>
        )}
        {/* Add first topic badge on image if available */}
        {articleTopics.length > 0 && (
          <button 
            onClick={(e) => handleCategoryClick(e, articleTopics[0].slug)}
            className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full hover:bg-indigo-700 transition-colors cursor-pointer z-10">
            {articleTopics[0].name}
          </button>
        )}
      </div> 
      
      {/* Content Container */}
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div> {/* Wrapper for top content */} 
          {/* Display remaining categories/topics as pills */}
          {articleTopics.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {articleTopics.slice(1, 6).map((topic) => ( // Show up to 5 more topics (changed from 4)
                <button 
                  key={topic.slug}
                  onClick={(e) => handleCategoryClick(e, topic.slug)}
                  className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  {topic.name}
                </button>
              ))}
            </div>
          )}
          
        <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {article.title}
        </h2>
          {article.excerpt && (
        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
          {article.excerpt}
        </p>
          )}
        </div>
        
        {/* Metadata at the bottom */} 
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
          <span className={`flex items-center ${isRecent ? 'text-green-600 font-medium' : ''}`}>
            {isRecent && <span className="mr-1 text-green-600">●</span>}
            {formattedDate}
          </span>
          <div className="flex items-center">
            <span className="mr-3">{readingTime} min read</span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {article.views || 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Drastically simplified getStaticProps function to avoid 500 errors
export async function getStaticProps({ params }) {
  try {
    const { slug } = params;
    
    console.log(`[Server] Fetching data for topic: ${slug}`);
    
    // Find topic metadata or generate default
    let topicMetadata = findTopicBySlug(slug);
    if (!topicMetadata) {
      console.log(`[Server] Topic not found in topicMap, generating default metadata for: ${slug}`);
      topicMetadata = getDefaultTopicMetadata(slug);
    }
    
    // Define our helper API fetch function
    const fetchFromAPI = async (url) => {
      try {
        // In server context, we need the full URL
        const baseUrl = process.env && process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL : 'http://localhost:3000';
        const response = await fetch(`${baseUrl}${url}`);
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`[Server] Error fetching from API: ${error.message}`);
        return null;
      }
    };
    
    // Try to fetch from our internal API first
    let apiUrl = `/api/articles/topic/${slug}?limit=30`;
    
    // Adjust minScore based on topic
    if (slug.toLowerCase().includes('machine learning') || slug.toLowerCase() === 'ml') {
      apiUrl += '&minScore=30'; // Higher threshold for ML
    } 
    else if (slug.toLowerCase() === 'ar' || 
             slug.toLowerCase().includes('augmented reality') || 
             slug.toLowerCase().includes('augmented-reality')) {
      apiUrl += '&minScore=15'; // Lower threshold for AR topics
    }
    else if (slug.toLowerCase().includes('user experience') || 
             slug.toLowerCase().includes('user-experience') ||
             (slug.includes('-') || slug.includes(' '))) {
      apiUrl += '&minScore=20'; // Lower threshold for multi-word topics
    }
    else if (slug.toLowerCase().includes('health') || slug.toLowerCase() === 'healthcare') {
      apiUrl += '&minScore=30'; // Higher threshold for healthcare
    }
    else {
      apiUrl += '&minScore=25'; // Default threshold
    }
    
    const apiData = await fetchFromAPI(apiUrl);
    
    let articlesData = [];
    
    if (apiData && apiData.articles && apiData.articles.length > 0) {
      console.log(`[Server] Successfully fetched ${apiData.articles.length} articles from API`);
      
      // For Healthcare topics, add an extra layer of filtering for AR content
      if (slug.toLowerCase() === 'healthcare' || slug.toLowerCase() === 'health') {
        articlesData = apiData.articles.filter(article => {
          // Filter out AR articles that don't have explicit health connection
          if (article.title && 
              (article.title.includes('AR') || 
               article.title.includes('Augmented Reality'))) {
            // Only include if title explicitly mentions health
            return article.title.toLowerCase().includes('health') || 
                   article.title.toLowerCase().includes('medical') ||
                   article.title.toLowerCase().includes('medicine');
          }
          return true;
        });
      } else {
        articlesData = apiData.articles;
      }
    } else {
      console.log(`[Server] API fetch failed or returned no articles, falling back to direct fetch`);
      
      // Get all posts
      const postsData = await getAllPosts();
      const allPosts = Array.isArray(postsData) ? postsData : (postsData.posts || []);
      
      // Calculate article relevance scores
      const articlesWithRelevance = allPosts.map(article => ({
        ...article,
        relevance: calculateArticleRelevance(article, slug)
      }));
      
      // Filter and sort by relevance
      articlesData = articlesWithRelevance
        .filter(article => article.relevance.score >= 30) // Increased threshold from 20 to 30
        .sort((a, b) => {
          // First by relevance score
          const scoreDiff = b.relevance.score - a.relevance.score;
          if (scoreDiff !== 0) return scoreDiff;
          
          // Then by date
          return new Date(b.date) - new Date(a.date);
        });
      
      console.log(`[Server] Direct fetch found ${articlesData.length} relevant articles`);
    }
    
    // Get related topics from the articles
    const relatedTopics = getRelatedTopicsFromArticles(articlesData, slug);
    
    // Ensure all article dates are serializable (null if invalid/undefined)
    const serializableArticlesData = articlesData.map(article => ({
      ...article,
      // Use IIFE for robust date sanitization
      date: (() => {
        if (!article.date) return null;
        try {
          const dateObj = new Date(article.date);
          // Check validity before converting
          return !isNaN(dateObj.getTime()) ? dateObj.toISOString() : null;
        } catch (e) {
          console.warn(`[getStaticProps topic slug] Error processing date: ${article.date}`, e);
          return null;
        }
      })()
    }));
    
    return {
      props: {
        topicMetadata,
        articlesData: serializableArticlesData, // Pass sanitized data
        relatedTopics,
        serverDataError: false
      },
      // Revalidate every hour (3600 seconds)
      revalidate: 3600,
    };
  } catch (error) {
    console.error('Error in getStaticProps for topic page:', error);
    
    return {
      props: {
        topicMetadata: null,
          articlesData: [],
        relatedTopics: [],
        serverDataError: true
      },
      // Revalidate more frequently if there was an error (10 minutes)
      revalidate: 600,
    };
  }
}

// Generate static paths based on topics with actual content
export async function getStaticPaths() {
  const MIN_ARTICLES_PER_TOPIC = 1; // Minimum articles required to generate a topic page
  const allTopicSlugs = new Set();

  try {
    // Fetch all articles (or at least their frontmatter)
    // Note: Ensure getAllArticles fetches efficiently, maybe only frontmatter
    const allPostsData = await getAllArticles({ paginate: false }); // Assuming this returns an array of articles
    const allPosts = Array.isArray(allPostsData) ? allPostsData : [];

    console.log(`[getStaticPaths] Found ${allPosts.length} total posts.`);

    const topicCounts = {};

    // Iterate over posts to count topic occurrences
    allPosts.forEach(post => {
      const topics = [];
      // Add primary category
      if (post.category) {
        topics.push(post.category);
      }
      // Add items from categories array
      if (Array.isArray(post.categories)) {
        post.categories.forEach(cat => topics.push(typeof cat === 'string' ? cat : cat.name));
      }
      // Add items from topics array
      if (Array.isArray(post.topics)) {
        post.topics.forEach(topic => topics.push(typeof topic === 'string' ? topic : topic.name));
      }
      // Add items from tags array
      if (Array.isArray(post.tags)) {
        post.tags.forEach(tag => topics.push(typeof tag === 'string' ? tag : tag.name));
      }

      // Process and count each topic/category/tag
      topics.forEach(rawTopic => {
        if (rawTopic && typeof rawTopic === 'string') {
          const slug = rawTopic.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          if (slug) {
            topicCounts[slug] = (topicCounts[slug] || 0) + 1;
          }
        }
      });
    });

    // Filter topics that meet the minimum article count
    for (const [slug, count] of Object.entries(topicCounts)) {
      if (count >= MIN_ARTICLES_PER_TOPIC) {
        allTopicSlugs.add(slug);
      }
    }

    console.log(`[getStaticPaths] Found ${allTopicSlugs.size} topics with >= ${MIN_ARTICLES_PER_TOPIC} articles.`);

  } catch (error) {
    console.error('[getStaticPaths] Error fetching posts or processing topics:', error);
    // Fallback to a minimal set of common topics if fetching fails
    const commonTopics = ['tech', 'ai', 'science', 'business', 'featured', 'trending'];
    commonTopics.forEach(topic => allTopicSlugs.add(topic));
    console.log(`[getStaticPaths] Falling back to ${allTopicSlugs.size} common topics due to error.`);
  }
  
  // Add essential hardcoded topics just in case
  ['featured', 'trending', 'latest', 'tech', 'ai', 'science'].forEach(t => allTopicSlugs.add(t));

  // Create paths object
  const paths = Array.from(allTopicSlugs).map(slug => ({ params: { slug } }));

  console.log(`[getStaticPaths] Generating ${paths.length} paths.`);

  return {
    paths,
    // fallback: 'blocking' // Use blocking to generate pages on demand if needed
    // Consider using fallback: true or false depending on whether you want 404s or on-demand generation for non-listed topics
    fallback: true // Allows for on-demand generation but might be slower initially
  };
}

// Helper function to create mock articles
function createMockArticles(topicSlug, filter) {
  const mockSlug = topicSlug || 'technology';
  const displayTopic = typeof mockSlug === 'string' ? 
    mockSlug.replace(/-/g, ' ') : 'technology';
  const capitalizedTopic = displayTopic
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Use image domains that are already in next.config.js
  const placeholderImages = [
    'https://placehold.co/800x600/3b82f6/FFFFFF?text=Technology',
    'https://placehold.co/800x600/059669/FFFFFF?text=Science',
    'https://placehold.co/800x600/7c3aed/FFFFFF?text=Innovation',
    'https://placehold.co/800x600/ef4444/FFFFFF?text=Trending',
    'https://placehold.co/800x600/f59e0b/FFFFFF?text=Featured',
    'https://placehold.co/800x600/10b981/FFFFFF?text=Latest'
  ];
  
  const getRandomImage = (index) => placeholderImages[index % placeholderImages.length];
  
  if (filter === 'trending') {
    return Array(6).fill().map((_, i) => ({
      slug: `trending-${mockSlug}-article-${i}`,
      title: `Trending: The Latest Developments in ${capitalizedTopic}`,
      excerpt: `Discover what's hot right now in the world of ${displayTopic}.`,
      date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
      readingTime: Math.floor(Math.random() * 10) + 3,
      image: getRandomImage(i),
      categories: [capitalizedTopic],
      topics: [capitalizedTopic],
      trending: true,
      views: Math.floor(Math.random() * 5000) + 1000
    }));
  } else if (filter === 'featured') {
    return Array(6).fill().map((_, i) => ({
      slug: `featured-${mockSlug}-article-${i}`,
      title: `Featured: Essential Guide to ${capitalizedTopic}`,
      excerpt: `Our editors' picks for the most important ${displayTopic} content.`,
      date: new Date(Date.now() - (i * 48 * 60 * 60 * 1000)).toISOString(),
      readingTime: Math.floor(Math.random() * 10) + 5,
      image: getRandomImage(i + 3),
      categories: [capitalizedTopic],
      topics: [capitalizedTopic],
      featured: true,
      views: Math.floor(Math.random() * 10000) + 5000
    }));
  } else {
    return Array(9).fill().map((_, i) => ({
      slug: `latest-${mockSlug}-article-${i}`,
      title: `${i % 3 === 0 ? 'How to Master' : i % 3 === 1 ? 'The Future of' : 'Understanding'} ${capitalizedTopic}`,
      excerpt: `${i % 2 === 0 ? 'Learn about the latest advancements' : 'Explore the fascinating world'} of ${displayTopic} and how it's transforming industries.`,
      date: new Date(Date.now() - (i * 36 * 60 * 60 * 1000)).toISOString(),
      readingTime: Math.floor(Math.random() * 12) + 3,
      image: getRandomImage(i),
      categories: [capitalizedTopic],
      topics: [capitalizedTopic],
      featured: i < 2,
      trending: i < 3,
      views: Math.floor(Math.random() * 3000) + 500
    }));
  }
} 

// Predefined mapping for known topic names (to avoid incorrect splitting)
const knownTopics = {
  'character': 'Character',
  'character-state': 'Character State',
  'character-state-vectors': 'Character State Vectors',
  'chara': 'Character',
  'c-hara': 'Character',
  'c-hara-cter': 'Character',
  'character-state': 'Character State',
  'cter': 'Character',
  'textrepresentation': 'Text Representation',
  'text-representation': 'Text Representation',
  'text-re': 'Text Representation',
  'text-re-pres': 'Text Representation',
  'text-re-pres-enta': 'Text Representation',
  'text-re-pres-enta-tion': 'Text Representation',
  'textrepresentation': 'Text Representation',
  'text representation': 'Text Representation',
  'representation': 'Representation',
  'embeddings': 'Embeddings',
  'wordemb': 'Word Embeddings',
  'wordembeddings': 'Word Embeddings',
  'word-embeddings': 'Word Embeddings',
  'word-emb': 'Word Embeddings',
  'word-em-bedd': 'Word Embeddings',
  'word-em-bedd-ings': 'Word Embeddings',
  'word em bedd ings': 'Word Embeddings',
  'em': 'Embeddings',
  'bedd': 'Embeddings',
  'ings': 'Embeddings',
  'naturallanguage': 'Natural Language',
  'natural-language': 'Natural Language',
  'natural-language-processing': 'Natural Language Processing',
  'naturallanguageprocessing': 'Natural Language Processing',
  'natural language processing': 'Natural Language Processing',
  'augmentedreality': 'AR',
  'augmented-reality': 'AR',
  'augmented reality': 'AR',
  'ar': 'AR'
};

// Function to create a proper URL slug from any topic name
function createTopicSlug(topicName) {
  if (!topicName) return '';
  
  // First check our known topics map for special cases
  const normalized = topicName.toLowerCase().trim();
  
  if (knownTopics[normalized]) {
    // Get the display name from known topics, then slugify it
    return knownTopics[normalized].toLowerCase().replace(/\s+/g, '-');
  }
  
  // Remove any special chars and normalize spaces
  return topicName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')  // Remove non-word chars except spaces and hyphens
    .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-');      // Replace multiple hyphens with single hyphen
}

// Function to get a proper display name from any topic slug or name
function getProperTopicName(topicSlug) {
  if (!topicSlug) return '';
  
  // Check if it's already a properly formatted topic name
  if (/^[A-Z]/.test(topicSlug) && topicSlug.includes(' ')) {
    return topicSlug; // Already properly formatted
  }
  
  // Normalize the slug
  const normalized = topicSlug.toLowerCase().trim();
  const normalizedWithoutHyphens = normalized.replace(/-/g, ' ');
  
  // Try to find in knownTopics with various formats
  if (knownTopics[normalized]) return knownTopics[normalized];
  if (knownTopics[normalizedWithoutHyphens]) return knownTopics[normalizedWithoutHyphens];
  if (knownTopics[normalized.replace(/\s+/g, '')]) return knownTopics[normalized.replace(/\s+/g, '')];
  
  // Special cases for common problematic topics
  if (normalized.includes('c') && normalized.includes('hara') && normalized.includes('cter')) {
    return 'Character';
  } else if (normalized.includes('text') && normalized.includes('re') && normalized.includes('pres')) {
    return 'Text Representation';
  } else if (normalized.includes('user') && normalized.includes('exper')) {
    return 'User Experience';
  } else if (normalized.includes('word') && normalized.includes('embed')) {
    return 'Word Embeddings';
  } else if (normalized === 'ar' || normalized.includes('augmented')) {
    return 'AR';
  }
  
  // Fall back to standard formatTopicName
  return formatTopicName(topicSlug);
}

// --- START: Re-add areTopicsRelated function ---
// Function to check if topics are related based on slugs
const areTopicsRelated = (topic1, topic2) => {
  if (!topic1 || !topic2) return false;

  // Direct match
  if (topic1 === topic2) return true;

  // Normalize by removing hyphens and compare
  const norm1 = topic1.replace(/-/g, '');
  const norm2 = topic2.replace(/-/g, '');
  if (norm1 === norm2 && norm1.length > 2) return true;

  // Check if one contains the other (for multi-word topics like web-development vs development)
  // Be stricter for short strings to avoid over-matching
  if (topic1.includes(topic2) || topic2.includes(topic1)) {
    if (Math.min(topic1.length, topic2.length) < 4) {
      return topic1 === topic2; // Require exact match for short strings
    }
    // Allow containment for longer strings if words overlap significantly
    const words1 = topic1.split('-');
    const words2 = topic2.split('-');
    const commonWords = words1.filter(word => words2.includes(word));
    if (commonWords.length / Math.min(words1.length, words2.length) > 0.5) {
          return true;
        }
      }
      
  return false;
};
// --- END: Re-add areTopicsRelated function ---

// Function to get related topics from articles - **ONLY uses categories now**
function getRelatedTopicsFromArticles(articles, currentSlug) {
  // --- START: Add definition for normalizedCurrentSlug ---
  const standardizeSlug = (text) => {
    if (!text) return '';
    return text.toLowerCase().trim().replace(/\s+/g, '-');
  };
  const normalizedCurrentSlug = standardizeSlug(currentSlug);
  // --- END: Add definition for normalizedCurrentSlug ---

  // ... (initial checks, slug normalization remain the same) ...

  const topicData = new Map(); // Combined map for frequency, articles, names, slugs
  const assignedArticleSlugs = new Set();

  // Process each article, only using categories
  articles.forEach(article => {
    const articleTopics = new Map(); // topicSlug -> { weight, name }

    // Helper to process topic arrays - simplified, only for categories
    const processTopicSource = (sourceArray, weight) => {
      if (!sourceArray || !Array.isArray(sourceArray)) return;
      sourceArray.forEach(item => {
        const text = typeof item === 'string' ? item : (item?.name || item?.title || item?.slug || '');
        if (!text) return;
        const topicSlug = standardizeSlug(text);
        if (topicSlug && !areTopicsRelated(topicSlug, normalizedCurrentSlug) && topicSlug.length > 2) {
          const existing = articleTopics.get(topicSlug);
          // Add or update weight, keeping the highest weight if seen multiple times
          // Weighting is less critical now but keep structure
          if (!existing || weight > existing.weight) {
            articleTopics.set(topicSlug, { weight: weight, name: formatTopicName(text) });
          }
        }
      });
    };

    // --- START: Only process Categories --- 
    processTopicSource(article.categories, 3); // Use weight 3 (or any consistent weight)
    // processTopicSource(article.topics, 2);     // REMOVED
    // processTopicSource(article.tags, 1);       // REMOVED
    // --- END: Only process Categories --- 

    // Update global topic data
    articleTopics.forEach(({ weight, name }, topicSlug) => {
      if (!topicData.has(topicSlug)) {
        topicData.set(topicSlug, { frequency: 0, weightSum: 0, articles: new Map(), name: name });
      }
      const currentTopic = topicData.get(topicSlug);
      currentTopic.frequency += 1;
      currentTopic.weightSum += weight; // Accumulate weight
      // Use Map for articles to easily prevent duplicates within a topic
      if (!currentTopic.articles.has(article.slug)) {
        currentTopic.articles.set(article.slug, article);
      }
    });
  });

  // Deduplicate similar topics (grouping)
  const topicGroups = new Map();
  for (const [topicSlug, data] of topicData.entries()) {
    let foundGroup = false;
    let groupToUpdate = null;
    let bestGroupKey = topicSlug; // Assume current is best initially

    for (const [groupKey, group] of topicGroups.entries()) {
      if (areTopicsRelated(topicSlug, groupKey)) {
        // Found a related group, decide which key/name is best
        const groupKeyIsCanonical = Object.values(topicMap).some(t => t.id === groupKey);
        const topicSlugIsCanonical = Object.values(topicMap).some(t => t.id === topicSlug);
        let useNewSlugAsKey = false;

        // Determine the best key/name to represent the group
        if (topicSlugIsCanonical && !groupKeyIsCanonical) {
          useNewSlugAsKey = true;
        } else if (!topicSlugIsCanonical && groupKeyIsCanonical) {
          useNewSlugAsKey = false;
        } else { // Neither or both are canonical, prefer longer
          useNewSlugAsKey = topicSlug.length > groupKey.length;
        }

        // Merge data into the chosen group key
        if (useNewSlugAsKey) {
          // Merge old group (groupKey) into new group (topicSlug)
          const newGroupData = topicGroups.get(topicSlug) || {
            slugs: [topicSlug], frequency: data.frequency, weightSum: data.weightSum,
            articles: new Map(data.articles.entries()), name: data.name
          };
          const oldGroupData = topicGroups.get(groupKey);
          if (oldGroupData) {
            oldGroupData.slugs.forEach(slug => { if (!newGroupData.slugs.includes(slug)) newGroupData.slugs.push(slug); });
            newGroupData.frequency += oldGroupData.frequency;
            newGroupData.weightSum += oldGroupData.weightSum;
            oldGroupData.articles.forEach((article, slug) => { if (!newGroupData.articles.has(slug)) newGroupData.articles.set(slug, article); });
            topicGroups.delete(groupKey);
          }
          topicGroups.set(topicSlug, newGroupData);
          bestGroupKey = topicSlug;
        } else {
          // Merge new data (topicSlug) into existing group (groupKey)
          const existingGroup = topicGroups.get(groupKey);
          if (existingGroup) {
             if (!existingGroup.slugs.includes(topicSlug)) existingGroup.slugs.push(topicSlug);
             existingGroup.frequency += data.frequency;
             existingGroup.weightSum += data.weightSum;
             data.articles.forEach((article, slug) => { if (!existingGroup.articles.has(slug)) existingGroup.articles.set(slug, article); });
             topicGroups.set(groupKey, existingGroup); // Re-set to update
          }
          bestGroupKey = groupKey;
        }

        foundGroup = true;
        break; // Found related group, stop inner loop
      }
    }

    // If no related group was found, add this as a new group
    if (!foundGroup) {
      topicGroups.set(topicSlug, {
        slugs: [topicSlug],
        frequency: data.frequency,
        weightSum: data.weightSum,
        articles: new Map(data.articles.entries()),
        name: data.name
      });
    }
  }

  // Convert groups to final topic objects
  const groupedTopicObjects = Array.from(topicGroups.entries()).map(([groupKey, group]) => {
    const articlesArray = Array.from(group.articles.values())
                               .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date
    return {
      id: groupKey,
      slug: groupKey,
      name: group.name,
      icon: getTopicIcon(groupKey),
      frequency: group.frequency,
      weightScore: group.weightSum / group.frequency,
      articleCount: articlesArray.length, // Keep track of total articles for this group
      articles: articlesArray.slice(0, 5) // Still limit display per card to 5
    };
  });

  // Keep all topics found, regardless of article count
  const relevantTopics = groupedTopicObjects; 

  // Sort topics: prioritize by frequency, then weight score
  const sortedTopics = relevantTopics.sort((a, b) => {
     if (b.frequency !== a.frequency) {
      return b.frequency - a.frequency; // Higher frequency first
    }
    if (b.weightScore !== a.weightScore) {
      return b.weightScore - a.weightScore; // Higher weight first
    }
    return b.articleCount - a.articleCount; // More articles first
  });

  // Get top 6 topics
  let topTopics = sortedTopics.slice(0, 6);

  // --- START: Re-introduce Cross-Topic Article Deduplication ---
  const finalArticleSlugsUsed = new Set();
  topTopics.forEach(topic => {
    // Filter articles within this topic based on global usage
    topic.articles = topic.articles.filter(article => {
      if (!article || !article.slug || finalArticleSlugsUsed.has(article.slug)) {
        return false; // Skip if no slug or already used
      }
      // Mark as used and keep it for this topic
      finalArticleSlugsUsed.add(article.slug);
          return true;
    });
    // Ensure we still limit to 5 articles *after* deduplication for this specific card
    topic.articles = topic.articles.slice(0, 5); 
  });

  // Filter out topics that might have become empty after deduplication
  let resultTopics = topTopics.filter(topic => topic.articles.length > 0);
  // --- END: Re-introduce Cross-Topic Article Deduplication ---

  // REMOVED Default Topic Fallback

  // Return final list, max 6
  return resultTopics.slice(0, 6);
}

// Function to get appropriate icon for a topic
function getTopicIconFromName(topic) {
  // Handle non-string topics
  if (!topic) return 'bookmark';
  
  // Ensure topic is a string
  const topicStr = typeof topic === 'string'
    ? topic
    : (typeof topic === 'object' && topic !== null
       ? (topic.name || topic.slug || String(topic))
       : String(topic));
       
  // Convert topic to lowercase for matching
  const normalizedTopic = topicStr.toLowerCase();
  
  // Topic-icon mapping
  const iconMap = {
    'ai': 'robot',
    'artificial-intelligence': 'robot',
    'machine-learning': 'brain',
    'data-science': 'chart-line',
    'cybersecurity': 'shield-alt',
    'security': 'shield-alt',
    'blockchain': 'link',
    'cloud': 'cloud',
    'cloud-computing': 'cloud',
    'programming': 'code',
    'code': 'code',
    'web': 'globe',
    'web-development': 'globe',
    'mobile': 'mobile-alt',
    'mobile-development': 'mobile-alt',
    'ui': 'palette',
    'ux': 'palette',
    'design': 'palette',
    'database': 'database',
    'devops': 'server',
    'iot': 'microchip',
    'ar': 'vr-cardboard',
    'vr': 'vr-cardboard',
    'augmented-reality': 'vr-cardboard',
    'virtual-reality': 'vr-cardboard',
    'game': 'gamepad',
    'gaming': 'gamepad',
    'hardware': 'microchip',
    'software': 'laptop-code',
    'business': 'briefcase',
    'finance': 'chart-line',
    'tech': 'cogs',
    'technology': 'cogs',
    'quantum': 'atom',
    'quantum-computing': 'atom',
    'health': 'heartbeat',
    'healthcare': 'heartbeat',
    'education': 'graduation-cap',
    'environment': 'leaf',
    'crypto': 'bitcoin',
    'cryptocurrency': 'bitcoin',
    'ethics': 'balance-scale',
    'privacy': 'user-shield',
    'research': 'flask'
  };
  
  // Check for direct matches first
  if (iconMap[normalizedTopic]) {
    return iconMap[normalizedTopic];
  }
  
  // Check for partial matches
  for (const [key, icon] of Object.entries(iconMap)) {
    if (normalizedTopic.includes(key)) {
      return icon;
    }
  }
  
  // Default icon if no match found
  return 'bookmark';
} 

// SearchComponent for real-time search with autocompletion
const SearchComponent = ({ isMobile }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [searchCategory, setSearchCategory] = useState('all'); // 'all', 'topics', 'articles'
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  
  // Early return for server-side rendering
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Check for SpeechRecognition API on component mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      
      speechRecognitionRef.current = recognition;
    }
  }, []);
  
  // Load recent searches from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSearches = localStorage.getItem('recentSearches');
      if (savedSearches) {
        try {
          setRecentSearches(JSON.parse(savedSearches).slice(0, 5));
        } catch (e) {
          console.error('Error parsing recent searches:', e);
        }
      }
      
      // Check if browser supports speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        setVoiceSupported(true);
        
        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognitionRef.current = new SpeechRecognition();
        speechRecognitionRef.current.continuous = false;
        speechRecognitionRef.current.interimResults = false;
        
        speechRecognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setSearchQuery(transcript);
          performSearch(transcript);
          setIsListening(false);
        };
        
        speechRecognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };
        
        speechRecognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);
  
  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    // Only add event listener on client-side
    if (typeof window !== 'undefined') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, []);
  
  // Focus input when search is opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);
  
  // Handle search input changes with debounce - NOW RELIES ONLY ON API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSelectedIndex(-1);
      return;
    }
    
    const timer = setTimeout(() => {
      performSearch(searchQuery); // Trigger API search
    }, 250); // 250ms debounce
    
    return () => clearTimeout(timer);
  }, [searchQuery, searchCategory]); // Removed allArticles, allTopics dependencies
  
  // Track selected item when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);
  
  // Perform search - **REWRITTEN to ONLY use API**
  const performSearch = async (query) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setSearchResults([]); // Clear previous results
    setSelectedIndex(-1);

    try {
      const normalizedQuery = query.toLowerCase().trim();
      // Determine API endpoint based on category
      let apiUrl = `/api/search?q=${encodeURIComponent(normalizedQuery)}&limit=10`; // Limit to 10 total results
      if (searchCategory === 'topics') {
        apiUrl += '&type=topic';
      } else if (searchCategory === 'articles') {
        apiUrl += '&type=article';
      }

      console.log(`Searching API: ${apiUrl}`);
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API search failed with status ${response.status}`);
      }

      const data = await response.json();
      const combinedResults = [];

      // Process topics from API response
      if (data.topics && Array.isArray(data.topics)) {
        data.topics.forEach(topic => combinedResults.push({ 
          type: 'topic', 
          ...topic, 
          // Ensure icon exists or provide default
          icon: topic.icon || '📚' 
        }));
      }

      // Process articles from API response
      if (data.articles && Array.isArray(data.articles)) {
        data.articles.forEach(article => {
          const titleInitial = article.title ? article.title.charAt(0).toUpperCase() : 'A';
          combinedResults.push({ 
            type: 'article', 
            ...article,
            // Provide fallback image logic
            imageFallback: `https://placehold.co/200x200/6366f1/ffffff?text=${titleInitial}` 
          });
        });
      }

      console.log(`API search returned ${combinedResults.length} results`);
      setSearchResults(combinedResults);

      // Log search analytics
      if (typeof window !== 'undefined' && normalizedQuery.length > 2) {
        logSearchAnalytics(normalizedQuery, combinedResults.length);
      }

    } catch (err) {
      console.error('API Search error:', err);
      setSearchResults([]); // Clear results on error
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate relevance score for search results - CAN BE REMOVED if API handles scoring
  // const calculateSearchRelevance = (item, query, type) => { ... };
  
  // Log search analytics
  const logSearchAnalytics = (query, resultCount) => {
    try {
      // Add to recent searches
      const updatedSearches = [
        { query, timestamp: new Date().toISOString() },
        ...recentSearches.filter(item => item.query !== query)
      ].slice(0, 5);
      
      setRecentSearches(updatedSearches);
      localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
      
      // Send analytics event if available
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'search', {
          search_term: query,
          result_count: resultCount
        });
      }
    } catch (e) {
      console.error('Error logging search analytics:', e);
    }
  };
  
  // Start voice search
  const startVoiceSearch = () => {
    if (!speechRecognitionRef.current) return;
    
    try {
      setIsListening(true);
      speechRecognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
    }
  };
  
  // Stop voice search
  const stopVoiceSearch = () => {
    if (!speechRecognitionRef.current) return;
    
    try {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  };
  
  // Handle clicking a search result
  const handleResultClick = (result) => {
    setIsOpen(false);
    setSearchQuery('');
    
    // Safely check if router is available
    if (router && typeof window !== 'undefined') {
      if (result.type === 'topic') {
        router.push(`/topics/${encodeURIComponent(result.slug)}`);
      } else if (result.type === 'article') {
        router.push(`/posts/${encodeURIComponent(result.slug)}`);
      }
    }
  };
  
  // Handle selecting recent search
  const handleRecentSearchClick = (query) => {
    setSearchQuery(query);
    performSearch(query); // Trigger API search
  };
  
  // Handle clearing recent searches
  const clearRecentSearches = (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const resultCount = searchResults.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < resultCount - 1) ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0) ? prev - 1 : 0);
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < resultCount) {
          handleResultClick(searchResults[selectedIndex]);
        } else if (searchQuery.trim() && resultCount === 0 && router) {
          // Add router check here to avoid reference errors
          router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };
  
  // Highlight matching text in search results
  const highlightMatches = (text, query) => {
    if (!query.trim() || !text) return text;
    
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark class="bg-yellow-200 text-gray-900 rounded-sm px-0.5">$1</mark>');
    } catch (e) {
      return text;
    }
  };
  
  // Don't render anything during server-side rendering to avoid router issues
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Enhance search results display with better visuals
  const renderSearchResults = () => {
    // Group results by type (assuming API returns structured data)
    const topicResults = searchResults.filter(r => r.type === 'topic');
    const articleResults = searchResults.filter(r => r.type === 'article');
    
    return (
      <>
        {/* ... (rendering logic for topicResults) ... */}
        {/* ... (rendering logic for articleResults, using result.imageFallback) ... */}
      </>
    );
  };
  
  return (
    <div className="relative" ref={searchRef}>
      {/* Search button/icon to open search */}
      {isMobile ? (
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 text-sm rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center"
          aria-label="Open search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="hover:text-indigo-200 transition-colors flex items-center"
          aria-label="Open search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </button>
      )}
      
      {/* Enhanced search overlay with better visibility and features */}
      {isOpen && (
        <div 
          className={`
            fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 sm:pt-24
            ${isMobile ? 'md:absolute md:inset-auto md:pt-0' : 'md:absolute md:inset-auto md:pt-0'}
          `}
        >
          {/* Semi-transparent backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* Search container */}
          <div className={`
            relative bg-white rounded-xl shadow-2xl overflow-hidden w-full 
            max-w-lg animate-slideDown md:animate-none md:absolute md:right-0 md:top-full md:mt-2
            ${isMobile ? 'mx-auto' : 'md:w-96'}
          `}>
            {/* Search header with filters */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4">
              <div className="relative flex items-center mb-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search topics & articles..."
                  className="pl-10 pr-20 py-3 w-full border border-white/30 rounded-lg bg-white/10 
                    text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:outline-none
                    backdrop-blur-sm"
                  autoComplete="off"
                  aria-label="Search"
                />
                
                {/* Voice search button */}
                {voiceSupported && (
                  <button 
                    className={`absolute right-12 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center 
                      rounded-full transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-white/20 hover:bg-white/30'}`}
                    onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                    aria-label={isListening ? "Stop voice search" : "Start voice search"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                )}
                
                {/* Clear search button */}
                {searchQuery && (
                  <button 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center 
                      rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Search filters */}
              <div className="flex items-center justify-start space-x-2 text-sm text-white/90">
                <button 
                  className={`px-3 py-1 rounded-full transition-colors ${searchCategory === 'all' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  onClick={() => setSearchCategory('all')}
                >
                  All
                </button>
                <button 
                  className={`px-3 py-1 rounded-full transition-colors ${searchCategory === 'topics' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  onClick={() => setSearchCategory('topics')}
                >
                  Topics
                </button>
                <button 
                  className={`px-3 py-1 rounded-full transition-colors ${searchCategory === 'articles' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  onClick={() => setSearchCategory('articles')}
                >
                  Articles
                </button>
              </div>
            </div>
            
            {/* Search results with better organization */}
            <div className="max-h-[60vh] overflow-y-auto" ref={resultsRef}>
              {/* Display recent searches when no query and we have recent searches */}
              {!searchQuery && recentSearches.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider flex justify-between">
                    <span>Recent Searches</span>
                    <button 
                      className="text-indigo-500 hover:text-indigo-700" 
                      onClick={clearRecentSearches}
                    >
                      Clear
                    </button>
                  </div>
                  <div>
                    {recentSearches.map((item, index) => (
                      <div 
                        key={`recent-${index}`}
                        onClick={() => handleRecentSearchClick(item.query)}
                        className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                      >
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-gray-800">{item.query}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Loading state */}
              {loading && searchQuery.trim() !== '' && (
                <div className="p-4 space-y-4">
                  {/* Skeleton for topics section */}
                  <div className="mb-4">
                    <div className="h-6 bg-gray-100 w-16 mb-2 rounded"></div>
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex items-center py-3 border-b border-gray-100">
                        <div className="h-8 w-8 bg-gray-100 rounded-full mr-3"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-100 rounded w-32"></div>
                          <div className="h-3 bg-gray-100 rounded w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Skeleton for articles section */}
                  <div>
                    <div className="h-6 bg-gray-100 w-16 mb-2 rounded"></div>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="py-3 border-b border-gray-100 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* No results found */}
              {!loading && searchQuery.trim() !== '' && searchResults.length === 0 && (
                <div className="p-8 text-center">
                  <div className="inline-block p-3 bg-gray-100 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No results found</p>
                  <p className="text-gray-500 text-sm mb-4">We couldn't find anything for "{searchQuery}"</p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    <button 
                      onClick={() => setSearchCategory('all')}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    >
                      Search All Content
                    </button>
                    <button 
                      onClick={() => {
                        // Clear and close search 
                        setSearchQuery('');
                        setIsOpen(false);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                      Browse Topics
                    </button>
                  </div>
                </div>
              )}
              
              {/* Search results - Now using renderSearchResults */} 
              {!loading && searchResults.length > 0 && ( 
                <div> 
                  {renderSearchResults()} 
                </div> 
              )} 
            </div>
            
            {/* Footer with keyboard shortcuts and hints */}
            <div className="p-3 bg-gray-50 text-center text-xs text-gray-500 border-t">
              <div className="flex justify-center items-center flex-wrap gap-x-3 gap-y-2">
                {/* Keyboard navigation hints */}
                <div className="flex items-center">
                  <div className="flex mx-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono ml-1">↓</kbd>
                  </div>
                  <span className="ml-1.5">to navigate</span>
                </div>
                
                <div className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono">Enter</kbd>
                  <span className="ml-1.5">to select</span>
                </div>
                
                <div className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono">Esc</kbd>
                  <span className="ml-1.5">to close</span>
                </div>
              </div>
              
              {/* Add animations for the search panel */}
              <style jsx>{`
                @keyframes slideDown {
                  from { transform: translateY(-10px); opacity: 0; }
                  to { transform: translateY(0); opacity: 1; }
                }
                .animate-slideDown {
                  animation: slideDown 0.2s ease-out;
                }
              `}</style>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Use dynamic import with ssr: false to ensure router is only used client-side
const ClientSideWrapper = dynamic(() => Promise.resolve(ClientSideContent), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      <TopicNav className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-6" />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
        <div className="animate-pulse">
          <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
            <div className="h-48 bg-gradient-to-r from-indigo-700/50 to-purple-700/50"></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded-full w-24"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  ),
});

// Main component that doesn't use router directly
export default function TopicPage(props) {
  const { topic, articlesData, relatedTopics, topicMetadata, serverDataError } = props;
  
  // We're only passing data down, no direct router usage here
  return <ClientSideWrapper initialData={props} />;
} 