import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import Header from '../../components/Header'
import Footer from '../../components/layout/Footer'
import { topicCategories } from '../../data/topics'
import TopicNav from '../../components/home/TopicNav'

// Get article data
import { getAllPosts } from '../../utils/mdx'

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

// Helper function to normalize strings for consistent matching
function normalizeString(str) {
  if (!str) return '';
  
  // First, create a version with special chars replaced by spaces, then normalized
  const spacedVersion = str.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Second, create a version with special chars simply removed
  const compactVersion = str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  // Store both versions for later comparison
  return {
    spaced: spacedVersion,
    compact: compactVersion,
    original: str.toLowerCase().trim()
  };
}

// A more comprehensive matching function
function isTopicMatch(topicA, topicB) {
  if (!topicA || !topicB) return false;
  
  // Normalize both topics
  const normalizedA = typeof topicA === 'string' ? normalizeString(topicA) : topicA;
  const normalizedB = typeof topicB === 'string' ? normalizeString(topicB) : topicB;
  
  // Convert single string to normalized object if needed
  const a = typeof normalizedA === 'string' ? normalizeString(normalizedA) : normalizedA;
  const b = typeof normalizedB === 'string' ? normalizeString(normalizedB) : normalizedB;
  
  // Different matching strategies
  const exactMatch = a.compact === b.compact;
  const spacedMatch = a.spaced === b.spaced;
  const containsMatch = a.compact.includes(b.compact) || b.compact.includes(a.compact);
  const wordsMatch = a.spaced.split(' ').some(word => b.spaced.split(' ').includes(word) && word.length > 2);
  
  // For hyphenated topics, also check the un-hyphenated version
  const hyphenMatch = a.original.replace(/-/g, '') === b.original.replace(/-/g, '') && 
                     a.original.length > 3;
                     
  // For topics with spaces, also check the hyphenated version
  const spaceToHyphenMatch = a.original.replace(/\s+/g, '-') === b.original || 
                            b.original.replace(/\s+/g, '-') === a.original;
                            
  return exactMatch || spacedMatch || containsMatch || wordsMatch || hyphenMatch || spaceToHyphenMatch;
}

// Function to extract related topics from a given set of articles
function getRelatedTopicsFromArticles(articlesList, currentSlug) {
  const currentSlugNormalized = normalizeString(currentSlug)
  console.log(`[Topic Page] Generating related topics for: ${currentSlug}`)
  
  // Use a map where the keys are normalized versions of the topics
  // This helps eliminate duplicates with different casing/formatting
  const relatedTopicsMap = new Map();
  const topicNameToNormalized = new Map(); // Track original names
  
  // First collect all topics and categories from the articles
  articlesList.forEach(article => {
    // Process topics array if it exists
    if (article.topics && Array.isArray(article.topics)) {
      article.topics.forEach(topic => {
        const topicName = typeof topic === 'string' ? topic : topic?.name || '';
        if (!topicName) return; // Skip empty topics
        
        const normalizedTopicName = normalizeString(topicName).compact;
        // Skip if it's the same as our current topic
        if (!normalizedTopicName || isTopicMatch(topicName, currentSlug)) return;
        
        // Track topics and their frequency using normalized names as keys
        relatedTopicsMap.set(normalizedTopicName, (relatedTopicsMap.get(normalizedTopicName) || 0) + 1);
        // Keep track of the best display name for this normalized topic
        if (!topicNameToNormalized.has(normalizedTopicName) || 
            topicName.length < topicNameToNormalized.get(normalizedTopicName).length) {
          topicNameToNormalized.set(normalizedTopicName, topicName);
        }
      });
    }
    
    // Also process categories array for more related topics
    if (article.categories && Array.isArray(article.categories)) {
      article.categories.forEach(category => {
        const categoryName = typeof category === 'string' ? category : category?.name || '';
        if (!categoryName) return; // Skip empty categories
        
        const normalizedCategoryName = normalizeString(categoryName).compact;
        // Skip if it's the same as our current topic
        if (!normalizedCategoryName || isTopicMatch(categoryName, currentSlug)) return;
        
        // Track categories as related topics using normalized names
        relatedTopicsMap.set(normalizedCategoryName, (relatedTopicsMap.get(normalizedCategoryName) || 0) + 1);
        // Keep track of the best display name
        if (!topicNameToNormalized.has(normalizedCategoryName) || 
            categoryName.length < topicNameToNormalized.get(normalizedCategoryName).length) {
          topicNameToNormalized.set(normalizedCategoryName, categoryName);
        }
      });
    }
    
    // Extract tags if available
    if (article.tags && Array.isArray(article.tags)) {
      article.tags.forEach(tag => {
        const tagName = typeof tag === 'string' ? tag : tag?.name || '';
        if (!tagName) return; // Skip empty tags
        
        const normalizedTagName = normalizeString(tagName).compact;
        // Skip if it's the same as our current topic
        if (!normalizedTagName || isTopicMatch(tagName, currentSlug)) return;
        
        // Track tags as related topics using normalized names
        relatedTopicsMap.set(normalizedTagName, (relatedTopicsMap.get(normalizedTagName) || 0) + 1);
        // Keep track of the best display name
        if (!topicNameToNormalized.has(normalizedTagName) || 
            tagName.length < topicNameToNormalized.get(normalizedTagName).length) {
          topicNameToNormalized.set(normalizedTagName, tagName);
        }
      });
    }
    
    // Also check the main category if it exists
    if (article.category) {
      const categoryName = typeof article.category === 'string' ? article.category : article.category?.name || '';
      if (!categoryName) return; // Skip empty categories
      
      const normalizedCategoryName = normalizeString(categoryName).compact;
      // Skip if it's the same as our current topic
      if (!normalizedCategoryName || isTopicMatch(categoryName, currentSlug)) return;
      
      // Track main category with higher weight
      relatedTopicsMap.set(normalizedCategoryName, (relatedTopicsMap.get(normalizedCategoryName) || 0) + 3); // Give main categories more weight
      // Keep track of the best display name
      if (!topicNameToNormalized.has(normalizedCategoryName) || 
          categoryName.length < topicNameToNormalized.get(normalizedCategoryName).length) {
        topicNameToNormalized.set(normalizedCategoryName, categoryName);
      }
    }
  });
  
  // Remove any empty keys
  relatedTopicsMap.delete('');
  relatedTopicsMap.delete(undefined);
  relatedTopicsMap.delete(null);
  
  console.log(`[Topic Page] Found ${relatedTopicsMap.size} unique related topics (after normalization)`);
  
  // Get the top related topics by frequency
  const sortedRelatedTopics = [...relatedTopicsMap.entries()]
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .slice(0, 12) // Get more than we need to allow for deduplication
    .map(([normalizedTopic, count]) => {
      // Use the original topic name for display
      const originalName = topicNameToNormalized.get(normalizedTopic) || '';
      
      // Try to map to a canonical topic
      const mappedTopic = topicMap[normalizedTopic];
      if (mappedTopic) {
        console.log(`[Topic Page] Mapped "${originalName}" to canonical "${mappedTopic.name}"`);
        return { 
          ...mappedTopic, 
          count // Keep count for debugging
        };
      }
      
      // Format the topic name and ID if it's not in our map
      const formattedName = originalName.charAt(0).toUpperCase() + originalName.slice(1);
      const topicId = normalizeString(originalName).original.replace(/\s+/g, '-');
      
      console.log(`[Topic Page] Using custom topic: "${formattedName}" (${topicId})`);
      return { 
        id: topicId, 
        name: formattedName, 
        icon: '📚', // Default icon
        count // Keep count for debugging
      };
    });
  
  // Remove duplicate mapped topics (keep the highest count instance)
  const uniqueTopics = [];
  const seenIds = new Set();
  
  for (const topic of sortedRelatedTopics) {
    if (!seenIds.has(topic.id)) {
      seenIds.add(topic.id);
      uniqueTopics.push(topic);
    }
  }
  
  // Get the top 6 after deduplication
  const finalTopics = uniqueTopics.slice(0, 6);
  
  // If we don't have enough related topics, add some default ones
  const defaultTopics = [
    { id: 'tech', name: 'Technology', icon: '💻' },
    { id: 'ai', name: 'AI', icon: '🤖' },
    { id: 'innovation', name: 'Innovation', icon: '💡' },
    { id: 'science', name: 'Science', icon: '🔬' },
    { id: 'business', name: 'Business', icon: '💼' },
    { id: 'environment', name: 'Environment', icon: '🌿' },
  ].filter(topic => !isTopicMatch(topic.id, currentSlug));
  
  const result = finalTopics.length > 0 
    ? finalTopics 
    : defaultTopics.slice(0, 6);
  
  console.log(`[Topic Page] Final related topics (after deduplication): ${result.map(t => t.name).join(', ')}`);
  return result;
}

export default function TopicPage({ topic, articlesData, relatedTopics: initialRelatedTopics }) {
  const router = useRouter()
  const { slug, subSlug } = router.query
  
  // Add loading state for fallback pages
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
            
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded-full w-24"></div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }
  
  const articlesPerPage = 9 // Adjust based on your design
  const [allArticles, setAllArticles] = useState(articlesData || [])
  const [articles, setArticles] = useState((articlesData || []).slice(0, articlesPerPage))
  const [isLoading, setIsLoading] = useState(false)
  const [navLoading, setNavLoading] = useState(false)
  const [currentFilter, setCurrentFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [page, setPage] = useState(0) // Start at page 0 since we're showing first page initially
  const [hasMore, setHasMore] = useState(articlesData?.length > articlesPerPage)
  const [relatedTopics, setRelatedTopics] = useState(initialRelatedTopics || [])
  
  // Add router change event listeners for loading state
  useEffect(() => {
    const handleStart = (url) => {
      // Only show loading state when navigating to a different topic
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
  }, [router]);
  
  // Set default filter to 'latest' on first load
  useEffect(() => {
    if (articlesData && articlesData.length > 0) {
      // The articles are already sorted by date from getStaticProps
      // Just use them directly for the latest filter
      setCurrentFilter('latest')
      setAllArticles(articlesData)
      setArticles(articlesData.slice(0, articlesPerPage))
      setPage(0)
      setHasMore(articlesData.length > articlesPerPage)
      
      // Update related topics based on all articles
      const updatedRelatedTopics = getRelatedTopicsFromArticles(articlesData, slug)
      setRelatedTopics(updatedRelatedTopics)
    }
  }, [articlesData, articlesPerPage, slug]) // Depend on articlesData so it updates when props change
  
  // Update content when slug changes (for navigating between topic pages)
  useEffect(() => {
    if (router.isReady && slug) {
      console.log(`[Topic Page] URL changed to topic: ${slug}, updating content`);
      
      // Reset states for the new topic
      setCurrentFilter('latest');
      setPage(0);
      
      if (articlesData && articlesData.length > 0) {
        // Articles are already sorted in getStaticProps
        setAllArticles(articlesData);
        setArticles(articlesData.slice(0, articlesPerPage));
        setHasMore(articlesData.length > articlesPerPage);
        
        // Update the related topics for the new content
        const updatedRelatedTopics = getRelatedTopicsFromArticles(articlesData, slug);
        setRelatedTopics(updatedRelatedTopics);
      }
    }
  }, [router.isReady, slug, articlesData, articlesPerPage, router]);
  
  // Determine if we're viewing a main topic or subtopic
  const isSubTopic = !!subSlug
  const displayName = subSlug || slug
  const formattedName = displayName?.replace(/-/g, ' ')
  const capitalizedName = formattedName?.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  
  const topicIcon = getTopicIcon(slug)
  const topicDescription = getTopicDescription(slug)
  
  // Get possible subtopics for this main topic
  const subtopics = getSubtopics(slug)
  
  // Filter options for articles
  const filterOptions = [
    { id: 'all', name: 'All Articles' },
    { id: 'trending', name: 'Trending' },
    { id: 'latest', name: 'Latest' },
    { id: 'popular', name: 'Most Read' }
  ]
  
  // Check if we have any trending articles
  const hasTrendingArticles = useMemo(() => {
    return articlesData.some(article => article.trending === true)
  }, [articlesData])
  
  // Get relevant main topics if we're on a subtopic page
  const mainTopics = getMainTopicsForSubtopic(subSlug)
  
  // Handle filter change
  const handleFilterChange = (filterId) => {
    // Skip if trying to filter by trending with no trending articles
    if (filterId === 'trending' && !hasTrendingArticles) {
      return;
    }
    
    setCurrentFilter(filterId)
    setIsLoading(true); // Show loading state during filtering
    
    // Small delay to allow the UI to update with loading state
    setTimeout(() => {
      // Filter the articles based on the selected filter
      let filteredArticles = [...articlesData]
      
      if (filterId === 'trending') {
        // Filter to show only trending articles
        filteredArticles = filteredArticles.filter(article => article.trending === true)
        console.log(`[Topic Page] Filtering to trending articles, found: ${filteredArticles.length}`)
      } else if (filterId === 'latest') {
        // Articles are already sorted by date from getStaticProps
        // No additional sorting needed
        console.log(`[Topic Page] Using latest date sorting from server`)
      } else if (filterId === 'popular') {
        // Sort by views, highest first
        filteredArticles.sort((a, b) => (b.views || 0) - (a.views || 0))
        console.log(`[Topic Page] Sorting by most views`)
      } else {
        // Default (all) - keep the sort from getStaticProps
        console.log(`[Topic Page] Using default sorting`)
      }
      
      setAllArticles(filteredArticles)
      setArticles(filteredArticles.slice(0, articlesPerPage))
      setPage(0) // Reset to first page when filter changes
      setHasMore(filteredArticles.length > articlesPerPage)
      
      // Update related topics based on filtered articles
      const updatedRelatedTopics = getRelatedTopicsFromArticles(filteredArticles, slug)
      setRelatedTopics(updatedRelatedTopics)
      
      setIsLoading(false); // Hide loading state
    }, 300); // Short delay for better visual feedback
  }
  
  // Switch between grid and list view modes
  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid')
  }
  
  // Handle loading more articles
  const loadMoreArticles = async () => {
    try {
      setIsLoading(true)
      
      // In a real implementation with an API, you would do:
      // const response = await fetch(`/api/articles?topic=${slug}&page=${page + 1}&limit=${articlesPerPage}`)
      // const newArticles = await response.json()
      
      // For this implementation using static data, we'll simulate pagination
      const nextPage = page + 1
      const startIndex = nextPage * articlesPerPage
      const endIndex = startIndex + articlesPerPage
      const nextPageArticles = allArticles.slice(startIndex, endIndex)
      
      if (nextPageArticles.length === 0) {
        setHasMore(false)
      } else {
        setArticles([...articles, ...nextPageArticles])
        setPage(nextPage)
        setHasMore(endIndex < allArticles.length)
        
        // Note: We don't update related topics here since we're just loading more
        // of the same filtered articles, not changing the filter criteria
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading more articles:', error)
      setIsLoading(false)
    }
  }
  
  return (
    <>
      <Head>
        <title>{capitalizedName || 'Topic'} Articles - Trendiingz</title>
        <meta name="description" content={`Explore the latest ${formattedName} articles, news, insights, and trends. Stay updated with our expert coverage on ${formattedName} developments.`} />
        <meta name="keywords" content={`${formattedName}, ${slug}, technology, trends, news, articles`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${capitalizedName} - Trendiingz`} />
        <meta property="og:description" content={`Explore the latest ${formattedName} articles, news, insights, and trends. Stay updated with our expert coverage on ${formattedName} developments.`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://trendiingz.com/images/Trendiingz-logo.jpg" />
        <meta property="og:site_name" content="Trendiingz" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${capitalizedName} - Trendiingz`} />
        <meta name="twitter:description" content={`Explore the latest ${formattedName} articles, news, insights, and trends. Stay updated with our expert coverage on ${formattedName} developments.`} />
        <meta name="twitter:image" content="https://trendiingz.com/images/Trendiingz-logo.jpg" />
      </Head>

      <div className="bg-gray-50 min-h-screen">
        <Header />
        <TopicNav className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-6" />
        
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
          {/* Loading Overlay */}
          {navLoading && (
            <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
                <div className="animate-spin h-12 w-12 border-4 border-indigo-500 rounded-full border-t-transparent mb-4"></div>
                <p className="text-gray-700 font-medium">Loading topic content...</p>
              </div>
            </div>
          )}
          
          {/* Topic Header Section */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
            <div className="relative bg-gradient-to-r from-indigo-700 to-purple-700 h-32 sm:h-48">
              {/* Decorative Pattern */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`
              }}></div>
              
              {/* Topic Info */}
              <div className="absolute bottom-0 left-0 p-4 sm:p-6 text-white">
                <div className="flex items-center">
                  {isSubTopic && (
                    <Link href={`/topics/${slug}`} className="text-white/80 hover:text-white mr-2 font-medium text-sm sm:text-base">
                      {slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')}
                    </Link>
                  )}
                  {isSubTopic && <span className="text-white/60 mx-2">/</span>}
                  <h1 className="text-xl sm:text-3xl font-bold">{capitalizedName}</h1>
                </div>
                <p className="text-white/80 text-sm sm:text-base mt-1 max-w-2xl">
                  {topicDescription}
                </p>
              </div>
              
              {/* Icon */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center text-2xl sm:text-4xl">
                {topicIcon}
              </div>
            </div>
            
            {/* Subtopics Navigation (only show on main topic pages) */}
            {!isSubTopic && subtopics && subtopics.length > 0 && (
              <div className="py-3 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
                <div className="flex space-x-2">
                  {subtopics.map((subtopic) => (
                    <Link
                      key={subtopic.id}
                      href={`/topics/${slug}/${subtopic.id}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 whitespace-nowrap transition-colors"
                    >
                      <span className="mr-1.5">{subtopic.icon}</span>
                      {subtopic.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Related Main Topics (only show on subtopic pages) */}
            {isSubTopic && mainTopics && mainTopics.length > 0 && (
              <div className="py-3 px-4 sm:px-6 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 pt-1.5">Related:</span>
                  {mainTopics.map((topic) => (
                    <Link
                      key={topic.id}
                      href={`/topics/${topic.id}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <span className="mr-1.5">{topic.icon}</span>
                      {topic.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Filters and View Mode Controls */}
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Filter Options */}
              <div className="flex flex-wrap gap-2 sm:gap-0">
                {filterOptions.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => {
                      // Only change filter if not disabled
                      if (filter.id !== 'trending' || hasTrendingArticles) {
                        handleFilterChange(filter.id)
                      }
                    }}
                    disabled={filter.id === 'trending' && !hasTrendingArticles}
                    className={`
                      px-3 py-1.5 text-sm font-medium rounded-full sm:rounded-md
                      transition-colors flex items-center
                      ${currentFilter === filter.id 
                        ? 'bg-indigo-600 text-white shadow-md transform scale-105' 
                        : filter.id === 'trending' && !hasTrendingArticles
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'}
                      mx-1
                    `}
                  >
                    {filter.id === 'trending' && <span className="mr-1.5">🔥</span>}
                    {filter.id === 'latest' && <span className="mr-1.5">🆕</span>}
                    {filter.id === 'popular' && <span className="mr-1.5">👀</span>}
                    {filter.id === 'all' && <span className="mr-1.5">📚</span>}
                    {filter.name}
                    {currentFilter === filter.id && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center p-1 bg-gray-100 rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                  aria-label="Grid view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                  aria-label="List view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Articles Section */}
          {isLoading ? (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                      <div className="h-48 bg-gray-200"></div>
                      <div className="p-4">
                        <div className="h-6 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="flex justify-between">
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : articles.length > 0 ? (
            <>
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-6'
              }>
                {articles.map((article) => (
                  viewMode === 'grid' 
                    ? <GridArticleCard key={article.slug} article={article} /> 
                    : <ListArticleCard key={article.slug} article={article} />
                ))}
              </div>
              
              {/* Load More Button */}
              <div className="mt-8 text-center">
                {hasMore ? (
                  <button
                    onClick={loadMoreArticles}
                    disabled={isLoading}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      'Load More Articles'
                    )}
                  </button>
                ) : (
                  <p className="text-gray-500">No more articles to load</p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="mx-auto max-w-md">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No articles found</h3>
                <p className="text-gray-600 mb-6">
                  We couldn't find any articles for this topic yet. Check back soon as we're constantly adding new content.
                </p>
                <Link href="/" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Back to Home
                </Link>
              </div>
            </div>
          )}
          
          {/* Related Topics Section */}
          {relatedTopics && relatedTopics.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Related Topics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {relatedTopics.map((topic) => (
                  <Link
                    key={topic.id}
                    href={`/topics/${encodeURIComponent(topic.id)}`}
                    prefetch={false}
                    className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-center group"
                  >
                    <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{topic.icon}</span>
                    <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{topic.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>
        
        <Footer />
      </div>
    </>
  )
}

// Grid Article Card Component
function GridArticleCard({ article }) {
  return (
    <Link href={`/posts/${article.slug}`} className="flex flex-col bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative h-48">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {article.trending && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
            Trending
          </div>
        )}
      </div>
      <div className="p-4 flex-grow">
        <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {article.title}
        </h2>
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-2 border-t border-gray-100">
          <span>{article.date ? new Date(article.date).toLocaleDateString() : 'No date'}</span>
          <span>{article.readingTime} min read</span>
        </div>
      </div>
    </Link>
  )
}

// List Article Card Component
function ListArticleCard({ article }) {
  return (
    <Link href={`/posts/${article.slug}`} className="flex bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative w-32 sm:w-48">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes="(max-width: 640px) 128px, 192px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {article.trending && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
            Trending
          </div>
        )}
      </div>
      <div className="p-4 flex-grow">
        <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {article.title}
        </h2>
        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{article.date ? new Date(article.date).toLocaleDateString() : 'No date'}</span>
          <div className="flex items-center">
            <span className="mr-3">{article.readingTime} min read</span>
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
  )
}

// Helper functions
function getTopicIcon(slug) {
  const iconMap = {
    'tech': '💻',
    'ai': '🤖',
    'science': '🔬',
    'climate': '🌍',
    'business': '💼',
    'innovation': '💡',
    'gaming': '🎮',
    'lifestyle': '✨',
    'food': '🍳',
    'politics': '🏛️',
    'entertainment': '🎭',
    'history': '📜',
    'art': '🎨',
    'music': '🎵',
    'literature': '📚',
    'philosophy': '🧠',
    'sports': '⚽',
    'travel': '✈️',
    'health': '🩺',
    'education': '📚',
    'environment': '🌿',
    'space': '🚀',
    'robotics': '🦾',
  }
  
  return iconMap[slug] || '📚'
}

function getTopicDescription(slug) {
  const descriptionMap = {
    'tech': 'Explore the latest in technology trends, innovations, and insights from leading tech companies and startups.',
    'ai': 'Discover breakthroughs in artificial intelligence, machine learning, deep learning, and neural networks.',
    'science': 'Stay updated with the newest scientific discoveries, research findings, and advancements across disciplines.',
    'climate': 'Follow climate change developments, environmental policies, sustainability initiatives, and green technologies.',
    'business': 'Track business trends, market movements, entrepreneurship stories, and corporate innovations.',
    'innovation': 'Learn about groundbreaking ideas, disruptive technologies, and creative solutions changing our world.',
    'gaming': 'Get the latest on video games, esports, gaming hardware, and industry developments.',
    'lifestyle': 'Find inspiration for better living through wellness, personal development, home, and relationships.',
    'history': 'Delve into the past with articles on historical events, civilizations, archaeological discoveries, and cultural heritage.',
    'art': 'Explore artistic movements, creators, exhibitions, and the evolution of visual expression throughout time.',
    'music': 'Discover new artists, genres, instruments, and the cultural impact of musical expression.',
    'literature': 'Explore written works, authors, literary movements, and the evolution of storytelling.',
    'health': 'Learn about medical breakthroughs, wellness strategies, disease prevention, and healthcare innovations.',
    'sports': 'Follow sporting events, athletes, fitness trends, and the science behind athletic performance.',
    'travel': 'Discover destinations, cultures, travel tips, and adventures from around the world.',
    'environment': 'Learn about ecosystem conservation, biodiversity, sustainability practices, and environmental challenges.',
    'food': 'Explore culinary traditions, recipes, food science, and dining experiences from around the world.',
    'politics': 'Stay informed on political developments, policies, elections, and governance issues.',
    'entertainment': 'Get updates on movies, TV shows, celebrities, and trends in popular culture.',
  }
  
  return descriptionMap[slug] || `Explore our latest articles and insights about ${slug.replace(/-/g, ' ')}.`
}

function getSubtopics(slug) {
  // This would typically come from the data source
  const subtopicsMap = {
    'tech': [
      { id: 'web-development', name: 'Web Development', icon: '🌐' },
      { id: 'mobile', name: 'Mobile', icon: '📱' },
      { id: 'cloud', name: 'Cloud Computing', icon: '☁️' },
      { id: 'security', name: 'Cybersecurity', icon: '🔒' },
      { id: 'data-science', name: 'Data Science', icon: '📊' },
    ],
    'ai': [
      { id: 'machine-learning', name: 'Machine Learning', icon: '🧠' },
      { id: 'generative-ai', name: 'Generative AI', icon: '🎨' },
      { id: 'nlp', name: 'Natural Language Processing', icon: '💬' },
      { id: 'computer-vision', name: 'Computer Vision', icon: '👁️' },
      { id: 'ai-ethics', name: 'AI Ethics', icon: '⚖️' },
    ],
    'science': [
      { id: 'physics', name: 'Physics', icon: '⚛️' },
      { id: 'astronomy', name: 'Astronomy', icon: '🔭' },
      { id: 'biology', name: 'Biology', icon: '🧬' },
      { id: 'quantum', name: 'Quantum Science', icon: '🔄' },
      { id: 'medicine', name: 'Medicine', icon: '🩺' },
    ],
  }
  
  return subtopicsMap[slug] || []
}

function getMainTopicsForSubtopic(subSlug) {
  // In a real implementation, this would come from a database or API
  // For now, we'll return some example related topics
  return [
    { id: 'tech', name: 'Technology', icon: '💻' },
    { id: 'ai', name: 'AI & ML', icon: '🤖' },
    { id: 'innovation', name: 'Innovation', icon: '💡' },
    { id: 'business', name: 'Business', icon: '💼' },
  ]
}

// Server-side data fetching
export async function getStaticProps({ params }) {
  const { slug } = params
  const normalizedQuerySlug = normalizeString(slug)
  
  try {
    // Get all posts from MDX utility
    const allPostsResponse = await getAllPosts()
    
    // Extract the posts array from the response
    const allPosts = allPostsResponse.posts || allPostsResponse || []
    
    console.log(`[Topic Page] Looking for topic: ${slug}, found ${allPosts.length} total posts`)
    
    if (!allPosts || allPosts.length === 0) {
      console.log('[Topic Page] No posts found')
      return {
        props: {
          topic: slug,
          articlesData: [],
          relatedTopics: []
        },
        revalidate: 3600 // Revalidate every hour
      }
    }
    
    // Add "digital" to our topicMap if it's missing
    if (slug === 'digital' && !topicMap['digital']) {
      console.log('[Topic Page] Adding digital to topicMap dynamically');
      topicMap['digital'] = { id: 'digital', name: 'Digital', icon: '💻' };
    }
    
    console.log(`[Topic Page] Checking for articles with topic "${slug}" using normalized: ${JSON.stringify(normalizedQuerySlug)}`);
    
    // More accurate filtering using the enhanced matching function
    const filteredArticles = allPosts.filter(post => {
      // For comprehensive debugging - log each post's category information
      const postInfo = {
        slug: post.slug,
        category: post.category,
        categories: post.categories ? 
          post.categories.map(c => typeof c === 'string' ? c : c.name || 'unknown').join(', ') : 
          'none',
        topics: post.topics ? 
          post.topics.map(t => typeof t === 'string' ? t : t.name || 'unknown').join(', ') : 
          'none'
      };
      
      // Special case for "digital" topic - more explicit checking
      if (slug === 'digital') {
        // Check direct category match first
        if (post.category === 'Digital' || post.category === 'digital') {
          console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - exact match on main category`);
          return true;
        }
        
        // Check categories array for exact matches
        if (post.categories && Array.isArray(post.categories)) {
          for (const cat of post.categories) {
            const catName = typeof cat === 'string' ? cat : cat.name || '';
            if (catName === 'Digital' || catName === 'digital' || 
                catName.toLowerCase() === 'digital') {
              console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - exact match in categories array`);
              return true;
            }
          }
        }
      }
      
      // Check if this post has the topic in its topics array (most accurate)
      if (post.topics && Array.isArray(post.topics)) {
        const hasMatchingTopic = post.topics.some(topic => {
          const topicName = typeof topic === 'string' ? topic : (topic?.name || '');
          if (!topicName) return false;
          
          const isMatch = isTopicMatch(topicName, slug);
          
          if (isMatch) {
            console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - match in topics array for: ${topicName}`);
            return true;
          }
          
          return false;
        });
        
        if (hasMatchingTopic) return true;
      }
      
      // Check categories
      if (post.categories && Array.isArray(post.categories)) {
        const hasMatchingCategory = post.categories.some(category => {
          // Handle both string categories and object categories with name field
          const categoryName = typeof category === 'string' 
            ? category 
            : category.name || '';
            
          if (!categoryName) return false;
          
          const isMatch = isTopicMatch(categoryName, slug);
          
          if (isMatch) {
            console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - match in categories for: ${categoryName}`);
            return true;
          }
          
          return false;
        });
        
        if (hasMatchingCategory) return true;
      }
      
      // Check main category
      if (post.category) {
        const categoryName = typeof post.category === 'string'
          ? post.category
          : post.category.name || '';
          
        if (!categoryName) return false;
        
        const isMatch = isTopicMatch(categoryName, slug);
        
        if (isMatch) {
          console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - match in main category for: ${categoryName}`);
          return true;
        }
      }
      
      // Also check if the title or excerpt contains the topic as a fallback
      if (post.title) {
        // Check for both exact and word-boundary matches
        const titleWords = post.title.toLowerCase().split(/\W+/);
        const slugWords = slug.toLowerCase().replace(/-/g, ' ').split(/\W+/);
        
        const titleContainsMatch = titleWords.some(word => 
          slugWords.some(slugWord => isTopicMatch(word, slugWord))
        );
        
        if (titleContainsMatch) {
          console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - match in title`);
          return true;
        }
      }
      
      if (post.excerpt) {
        // Check for both exact and word-boundary matches
        const excerptWords = post.excerpt.toLowerCase().split(/\W+/);
        const slugWords = slug.toLowerCase().replace(/-/g, ' ').split(/\W+/);
        
        const excerptContainsMatch = excerptWords.some(word => 
          slugWords.some(slugWord => isTopicMatch(word, slugWord))
        );
        
        if (excerptContainsMatch) {
          console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - match in excerpt`);
          return true;
        }
      }
      
      // Check in tags if available
      if (post.tags && Array.isArray(post.tags)) {
        const hasMatchingTag = post.tags.some(tag => {
          const tagName = typeof tag === 'string' ? tag : (tag?.name || '');
          if (!tagName) return false;
          
          const isMatch = isTopicMatch(tagName, slug);
          
          if (isMatch) {
            console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - match in tags for: ${tagName}`);
            return true;
          }
          
          return false;
        });
        
        if (hasMatchingTag) return true;
      }
      
      // Check in content if available (careful with performance)
      if (post.content) {
        // For content, first check if the slug appears directly
        const directMatch = post.content.toLowerCase().includes(slug.toLowerCase());
        
        // Then check individual words
        const contentWords = post.content.toLowerCase().split(/\W+/);
        const slugWords = slug.toLowerCase().replace(/-/g, ' ').split(/\W+/);
        
        const contentContainsMatch = contentWords.some(word => 
          slugWords.some(slugWord => word === slugWord && slugWord.length > 3)
        );
        
        if (directMatch || contentContainsMatch) {
          console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - match in content`);
          return true;
        }
      }
      
      // Check if we're looking for a topic with aliases and check those
      if (topicAliases[slug]) {
        const aliases = topicAliases[slug];
        
        // Check if any alias appears in title
        if (post.title && aliases.some(alias => post.title.toLowerCase().includes(alias))) {
          console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - match via alias in title`);
          return true;
        }
        
        // Check if any alias appears in excerpt
        if (post.excerpt && aliases.some(alias => post.excerpt.toLowerCase().includes(alias))) {
          console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - match via alias in excerpt`);
          return true;
        }
        
        // Check if any alias appears in content
        if (post.content && aliases.some(alias => post.content.toLowerCase().includes(alias))) {
          console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - match via alias in content`);
          return true;
        }
      }
      
      // If we're looking for "digital" topic, check for special digital terms
      if (slug === 'digital') {
        const digitalKeywords = ['digital', 'online', 'electronic', 'virtual', 'cyber', 'tech'];
        
        // Extra checks specifically for digital content
        if (post.title && digitalKeywords.some(kw => post.title.toLowerCase().includes(kw))) {
          console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - digital keyword in title`);
          return true;
        }
        
        if (post.excerpt && digitalKeywords.some(kw => post.excerpt.toLowerCase().includes(kw))) {
          console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - digital keyword in excerpt`);
          return true;
        }
        
        if (post.content && digitalKeywords.some(kw => 
          post.content.toLowerCase().includes(kw) && 
          post.content.toLowerCase().split(kw).length > 3 // Appears multiple times
        )) {
          console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - multiple digital keywords in content`);
          return true;
        }
      }
      
      console.log(`[Topic Page] ❌ EXCLUDED "${post.slug}" - no match found for topic: ${slug}`);
      return false;
    });
    
    console.log(`[Topic Page] Found ${filteredArticles.length} posts for topic: ${slug}`);
    
    // If we still don't have any articles for this topic, as a last resort,
    // check if we can find articles with partial matches
    if (filteredArticles.length === 0) {
      console.log(`[Topic Page] No exact matches found, trying partial matching for: ${slug}`);
      
      // Get articles with partial topic matches as a fallback
      const partialMatches = allPosts.filter(post => {
        // Check if any string field partially contains our topic
        const checkField = (field) => {
          if (!field) return false;
          const fieldStr = typeof field === 'string' ? field : JSON.stringify(field);
          return fieldStr.toLowerCase().includes(slug.toLowerCase());
        };
        
        const matches = (
          checkField(post.title) || 
          checkField(post.excerpt) || 
          checkField(post.content) ||
          checkField(post.topics) ||
          checkField(post.categories) ||
          checkField(post.tags)
        );
        
        if (matches) {
          console.log(`[Topic Page] ✅ INCLUDED "${post.slug}" - partial match fallback`);
        }
        
        return matches;
      });
      
      if (partialMatches.length > 0) {
        console.log(`[Topic Page] Found ${partialMatches.length} partial matches for topic: ${slug}`);
        filteredArticles.push(...partialMatches);
      }
    }
    
    // For "digital" specifically - do a final check of all posts to ensure nothing was missed
    if (slug === 'digital' && filteredArticles.length < 5) {
      console.log('[Topic Page] Performing extra check for digital articles');
      
      // Look for any article with "digital" in title, content or category
      const digitalArticles = allPosts.filter(post => {
        if (filteredArticles.some(a => a.slug === post.slug)) {
          return false; // Skip already included articles
        }
        
        const hasDigitalInTitle = post.title && post.title.toLowerCase().includes('digital');
        const hasDigitalInExcerpt = post.excerpt && post.excerpt.toLowerCase().includes('digital');
        const hasDigitalInCategories = post.categories && 
          JSON.stringify(post.categories).toLowerCase().includes('digital');
        const hasDigitalCategory = post.category && 
          post.category.toString().toLowerCase() === 'digital';
          
        const shouldInclude = hasDigitalInTitle || hasDigitalInExcerpt || 
                             hasDigitalInCategories || hasDigitalCategory;
                             
        if (shouldInclude) {
          console.log(`[Topic Page] ✅ FORCE INCLUDED "${post.slug}" - matches digital topic`);
        }
        
        return shouldInclude;
      });
      
      if (digitalArticles.length > 0) {
        console.log(`[Topic Page] Adding ${digitalArticles.length} more digital articles`);
        filteredArticles.push(...digitalArticles);
      }
    }
    
    // Ensure unique articles by slug
    const uniqueArticles = [...new Map(filteredArticles.map(a => [a.slug, a])).values()];
    
    // Helper function to check if a date is valid
    const isValidDate = (dateStr) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    };
    
    // Helper function to get a default date when missing
    const getDefaultDate = (slug) => {
      // Extract date from slug if possible (common pattern is yyyy-mm-dd-slug-title)
      const dateMatch = slug.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const extractedDate = new Date(dateMatch[1]);
        if (!isNaN(extractedDate.getTime())) {
          return extractedDate.toISOString();
        }
      }
      
      // Fallback to a recent date so newer articles without dates still appear near the top
      // Use a consistent approach but make them slightly older than articles with real dates
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      return oneMonthAgo.toISOString();
    };
    
    // Sort the articles by date, newest first, handling missing dates
    const sortedArticles = [...uniqueArticles].sort((a, b) => {
      // Get dates, falling back to defaults for missing/invalid dates
      const dateA = isValidDate(a.date) ? new Date(a.date) : new Date(getDefaultDate(a.slug));
      const dateB = isValidDate(b.date) ? new Date(b.date) : new Date(getDefaultDate(b.slug));
      
      // Sort newest first
      return dateB - dateA;
    });
    
    console.log(`[Topic Page] Sorted ${sortedArticles.length} articles by date (newest first)`);
    // Log the slugs to help with debugging
    console.log(`[Topic Page] Article slugs: ${sortedArticles.map(a => a.slug).join(', ')}`);
    
    // Check if specific article is included for digital topic
    if (slug === 'digital') {
      const digitalSabbathArticle = sortedArticles.find(a => 
        a.slug === 'what-makes-digital-sabbath-so-important-in-2025');
      
      if (digitalSabbathArticle) {
        console.log('[Topic Page] ✅ Digital Sabbath article IS included in results');
      } else {
        console.log('[Topic Page] ❌ WARNING: Digital Sabbath article is NOT in results');
        // Try to find it in the original articles
        const inOriginal = allPosts.find(a => 
          a.slug === 'what-makes-digital-sabbath-so-important-in-2025');
        
        if (inOriginal) {
          console.log('[Topic Page] Found Digital Sabbath in original articles, adding it');
          // Force add it to the results
          sortedArticles.push({...inOriginal, force_added: true});
        }
      }
    }
    
    // Get related topics from the filtered articles
    const relatedTopics = getRelatedTopicsFromArticles(sortedArticles, slug);
    
    return {
      props: {
        topic: slug,
        articlesData: sortedArticles.map(post => ({
          slug: post.slug,
          title: post.title || 'Untitled Article',
          excerpt: post.excerpt || 'No excerpt available',
          date: isValidDate(post.date) ? post.date : getDefaultDate(post.slug),
          image: post.image || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60',
          readingTime: post.readingTime || Math.ceil(((post.content || '').length / 1500) || 3),
          category: post.category || 'General',
          categories: post.categories || [], // Pass categories for UI display
          trending: post.trending === true || 
                   post.metadata?.trending === true || 
                   post.status === 'trending' || 
                   false,
          views: post.views || Math.floor(Math.random() * 1000) + 100,
        })),
        relatedTopics
      },
      revalidate: 3600 // Revalidate every hour
    }
  } catch (error) {
    console.error('Error in getStaticProps for topic page:', error)
    
    return {
      props: {
        topic: slug,
        articlesData: [],
        relatedTopics: []
      },
      revalidate: 300 // Retry sooner on error
    }
  }
}

// Generate static paths for common topics
export async function getStaticPaths() {
  const commonTopics = [
    // Core topics
    'tech', 'ai', 'science', 'business', 'innovation', 'gaming', 'climate', 'lifestyle',
    'featured', 'trending', 'latest', 'politics', 'food', 'entertainment',
    
    // Academic/Educational topics
    'history', 'art', 'literature', 'philosophy', 'psychology', 'education',
    'medicine', 'health', 'biology', 'physics', 'chemistry', 'mathematics',
    
    // Technology subtopics
    'web-development', 'mobile', 'cloud-computing', 'cybersecurity', 'data-science',
    'machine-learning', 'blockchain', 'cryptocurrency', 'virtual-reality', 
    'augmented-reality', 'internet-of-things', 'robotics', 'software',
    
    // Science subtopics
    'astronomy', 'quantum', 'genetics', 'neuroscience', 'ecology', 'environment',
    
    // Cultural/Social topics
    'travel', 'music', 'movies', 'fashion', 'sports', 'books', 'celebrities',
    'social-media', 'design', 'architecture', 'photography',
    
    // Business subtopics
    'finance', 'investing', 'entrepreneurship', 'startups', 'marketing',
    'e-commerce', 'real-estate', 'careers', 'leadership',
    
    // Specialized topics
    'adaptive', 'engineering', 'bio-inspired-design', 'soft-robotics',
    'sustainability', 'space', 'nutrition', 'fitness', 'mental-health'
  ]
  
  const paths = commonTopics.map(topic => ({
    params: { slug: topic.toLowerCase().replace(/\s+/g, '-') }
  }))
  
  return {
    paths,
    fallback: true // Dynamic topics will be built on-demand
  }
} 