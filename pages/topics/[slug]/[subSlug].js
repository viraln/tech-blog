import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import Header from '../../../components/Header'
import Footer from '../../../components/layout/Footer'
import TopicNav from '../../../components/home/TopicNav'

// Get article data
import { getAllPosts } from '../../../utils/mdx'

export default function SubTopicPage({ subtopic, mainTopic, articlesData, relatedTopics }) {
  const router = useRouter()
  const { slug, subSlug } = router.query
  
  const [articles, setArticles] = useState(articlesData || [])
  const [isLoading, setIsLoading] = useState(false)
  const [currentFilter, setCurrentFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  
  // Format the subtopic name for display
  const formattedName = subSlug?.replace(/-/g, ' ') || ''
  const capitalizedName = formattedName?.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  
  // Format the main topic name
  const formattedMainName = slug?.replace(/-/g, ' ') || ''
  const capitalizedMainName = formattedMainName?.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  
  // Get subtopic icon and description
  const subtopicIcon = getSubtopicIcon(subSlug, slug)
  const subtopicDescription = getSubtopicDescription(subSlug, slug)
  
  // Filter options for articles
  const filterOptions = [
    { id: 'all', name: 'All Articles' },
    { id: 'trending', name: 'Trending' },
    { id: 'latest', name: 'Latest' },
    { id: 'popular', name: 'Most Read' }
  ]
  
  // Handle filter change
  const handleFilterChange = (filterId) => {
    setCurrentFilter(filterId)
    
    // Filter the articles based on the selected filter
    let filteredArticles = [...articlesData]
    
    if (filterId === 'trending') {
      filteredArticles = filteredArticles.filter(article => article.trending)
    } else if (filterId === 'latest') {
      filteredArticles.sort((a, b) => new Date(b.date) - new Date(a.date))
    } else if (filterId === 'popular') {
      filteredArticles.sort((a, b) => (b.views || 0) - (a.views || 0))
    }
    
    setArticles(filteredArticles)
  }
  
  // Switch between grid and list view modes
  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid')
  }
  
  // Handle loading more articles
  const loadMoreArticles = async () => {
    try {
      setIsLoading(true)
      // In a real implementation, this would fetch more articles from an API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // For now, just simulate by duplicating current articles
      // In a real app, you'd fetch the next page of articles
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading more articles:', error)
      setIsLoading(false)
    }
  }
  
  return (
    <>
      <Head>
        <title>{capitalizedName} {capitalizedMainName} Articles - Trendiingz</title>
        <meta name="description" content={`Explore the latest ${formattedName} articles within ${formattedMainName}. Stay updated with our expert coverage on ${formattedName} developments.`} />
        <meta name="keywords" content={`${formattedName}, ${formattedMainName}, ${slug}, ${subSlug}, technology, trends, news, articles`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${capitalizedName} - ${capitalizedMainName} - Trendiingz`} />
        <meta property="og:description" content={`Explore the latest ${formattedName} articles within ${formattedMainName}. Stay updated with our expert coverage on ${formattedName} developments.`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://trendiingz.com/images/Trendiingz-logo.jpg" />
        <meta property="og:site_name" content="Trendiingz" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${capitalizedName} - ${capitalizedMainName} - Trendiingz`} />
        <meta name="twitter:description" content={`Explore the latest ${formattedName} articles within ${formattedMainName}. Stay updated with our expert coverage on ${formattedName} developments.`} />
        <meta name="twitter:image" content="https://trendiingz.com/images/Trendiingz-logo.jpg" />
      </Head>

      <div className="bg-gray-50 min-h-screen">
        <Header />
        <TopicNav className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-6" />
        
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
          {/* SubTopic Header Section */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
            <div className="relative bg-gradient-to-r from-indigo-600 to-blue-600 h-32 sm:h-48">
              {/* Decorative Pattern */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`
              }}></div>
              
              {/* Breadcrumb Navigation */}
              <div className="absolute top-4 left-4 sm:top-5 sm:left-6 flex items-center text-white/90">
                <Link href="/" className="hover:text-white">Home</Link>
                <span className="mx-2 text-white/60">/</span>
                <Link href={`/topics/${slug}`} className="hover:text-white">{capitalizedMainName}</Link>
                <span className="mx-2 text-white/60">/</span>
                <span>{capitalizedName}</span>
              </div>
              
              {/* Topic Info */}
              <div className="absolute bottom-0 left-0 p-4 sm:p-6 text-white">
                <h1 className="text-xl sm:text-3xl font-bold flex items-center">
                  {capitalizedName}
                  <span className="ml-2 text-white/80 text-base font-normal hidden sm:inline">
                    in {capitalizedMainName}
                  </span>
                </h1>
                <p className="text-white/80 text-sm sm:text-base mt-1 max-w-2xl">
                  {subtopicDescription}
                </p>
              </div>
              
              {/* Icon */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center text-2xl sm:text-4xl">
                {subtopicIcon}
              </div>
            </div>
            
            {/* Related Subtopics */}
            <div className="py-3 px-4 sm:px-6 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 pt-1.5">Related Subtopics:</span>
                {getRelatedSubtopics(slug, subSlug).map((subtopic) => (
                  <Link
                    key={subtopic.id}
                    href={`/topics/${slug}/${subtopic.id}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <span className="mr-1.5">{subtopic.icon}</span>
                    {subtopic.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          
          {/* Filters and View Mode Controls */}
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Filter Options */}
              <div className="flex flex-wrap gap-2 sm:gap-0">
                {filterOptions.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterChange(filter.id)}
                    className={`
                      px-3 py-1.5 text-sm font-medium rounded-full sm:rounded-none
                      transition-colors
                      ${currentFilter === filter.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                      ${filter.id !== filterOptions[filterOptions.length - 1].id 
                        ? 'sm:rounded-l-md' 
                        : ''}
                      ${filter.id !== filterOptions[0].id 
                        ? 'sm:rounded-r-md' 
                        : ''}
                    `}
                  >
                    {filter.name}
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
          {articles.length > 0 ? (
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
                <button
                  onClick={loadMoreArticles}
                  disabled={isLoading}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70"
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
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="mx-auto max-w-md">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No articles found</h3>
                <p className="text-gray-600 mb-6">
                  We couldn't find any articles for {capitalizedName} within {capitalizedMainName} yet. Check back soon as we're constantly adding new content.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href={`/topics/${slug}`} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Browse {capitalizedMainName}
                  </Link>
                  <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          )}
          
          {/* Related Topics Section */}
          {relatedTopics && relatedTopics.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Explore Other Topics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {relatedTopics.map((topic) => (
                  <Link
                    key={topic.id}
                    href={`/topics/${topic.id}`}
                    className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-center"
                  >
                    <span className="text-3xl mb-2">{topic.icon}</span>
                    <span className="text-sm font-medium text-gray-900">{topic.name}</span>
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
        <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
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
        <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
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

// Helper functions for subtopics
function getSubtopicIcon(subSlug, mainTopic) {
  const iconMap = {
    'tech': {
      'web-development': '🌐',
      'mobile': '📱',
      'cloud': '☁️',
      'security': '🔒',
      'data-science': '📊',
    },
    'ai': {
      'machine-learning': '🧠',
      'generative-ai': '🎨',
      'nlp': '💬',
      'computer-vision': '👁️',
      'ai-ethics': '⚖️',
    },
    'science': {
      'physics': '⚛️',
      'astronomy': '🔭',
      'biology': '🧬',
      'quantum': '🔄',
      'medicine': '🩺',
    },
  }
  
  return iconMap[mainTopic]?.[subSlug] || '📚'
}

function getSubtopicDescription(subSlug, mainTopic) {
  const descriptionMap = {
    'tech': {
      'web-development': 'Stay updated with the latest in frontend and backend web development, frameworks, libraries, and best practices.',
      'mobile': 'Explore mobile app development trends, frameworks, UI/UX design, and cross-platform solutions.',
      'cloud': 'Discover the latest in cloud computing technologies, services, architecture, and implementation strategies.',
      'security': 'Learn about cybersecurity best practices, emerging threats, defense strategies, and security tools.',
      'data-science': 'Dive into data analysis, visualization, big data technologies, and practical applications.',
    },
    'ai': {
      'machine-learning': 'Explore machine learning algorithms, neural networks, deep learning, and practical applications.',
      'generative-ai': 'Discover the latest in text-to-image models, creative AI, and generated content technologies.',
      'nlp': 'Learn about natural language processing advancements, language models, and conversational AI.',
      'computer-vision': 'Stay updated with image recognition, object detection, and visual AI technologies.',
      'ai-ethics': 'Explore ethical considerations, responsible AI deployment, and governance frameworks.',
    },
    'science': {
      'physics': 'Discover breakthroughs in physics, from particle physics to theoretical models.',
      'astronomy': 'Explore space discoveries, astrophysics, and our understanding of the universe.',
      'biology': 'Stay updated with advances in biology, genetics, and life sciences.',
      'quantum': 'Learn about quantum computing, quantum mechanics, and cutting-edge research.',
      'medicine': 'Follow medical breakthroughs, healthcare innovations, and treatment advances.',
    },
  }
  
  // Default description if specific one isn't found
  return descriptionMap[mainTopic]?.[subSlug] || 
    `Explore our latest articles and insights about ${subSlug.replace(/-/g, ' ')} within the ${mainTopic.replace(/-/g, ' ')} category.`
}

function getRelatedSubtopics(mainTopic, currentSubtopic) {
  // Map of related subtopics for each main topic
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
      { id: 'nlp', name: 'NLP', icon: '💬' },
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
  
  // Return all subtopics except the current one
  return (subtopicsMap[mainTopic] || []).filter(subtopic => subtopic.id !== currentSubtopic)
}

// Server-side data fetching
export async function getStaticProps({ params }) {
  const { slug, subSlug } = params
  
  try {
    // Get all posts from MDX utility
    const allPostsResponse = await getAllPosts()
    
    // Extract the posts array from the response (since getAllPosts returns {posts, pagination})
    const allPosts = allPostsResponse.posts || allPostsResponse || []
    
    if (!allPosts || allPosts.length === 0) {
      return {
        props: {
          subtopic: subSlug,
          mainTopic: slug,
          articlesData: [],
          relatedTopics: []
        },
        revalidate: 3600 // Revalidate every hour
      }
    }
    
    // More accurate filtering for subtopics
    const filteredArticles = allPosts.filter(post => {
      // First check if this post has the subtopic in its subtopics array (most accurate)
      if (post.subtopics && Array.isArray(post.subtopics)) {
        return post.subtopics.some(subtopic => 
          subtopic.toLowerCase() === subSlug.toLowerCase() || 
          subtopic.toLowerCase().includes(subSlug.toLowerCase())
        );
      }
      
      // Check if post belongs to the main topic
      const belongsToMainTopic = post.topics && Array.isArray(post.topics) && 
        post.topics.some(topic => topic.toLowerCase() === slug.toLowerCase());
      
      // Check if post content matches subtopic
      if (belongsToMainTopic) {
        // Check categories for subtopic match
        if (post.categories && Array.isArray(post.categories)) {
          const hasMatchingCategory = post.categories.some(category =>
            category.toLowerCase().includes(subSlug.toLowerCase())
          );
          
          if (hasMatchingCategory) return true;
        }
        
        // Check title and excerpt for subtopic keywords
        const subtopicKeywords = subSlug.replace(/-/g, ' ').split(' ');
        
        const titleMatch = post.title && subtopicKeywords.some(keyword => 
          post.title.toLowerCase().includes(keyword.toLowerCase())
        );
        
        const excerptMatch = post.excerpt && subtopicKeywords.some(keyword => 
          post.excerpt.toLowerCase().includes(keyword.toLowerCase())
        );
        
        return titleMatch || excerptMatch;
      }
      
      return false;
    });
    
    // Get related main topics that aren't the current main topic
    const relatedTopics = [
      { id: 'tech', name: 'Technology', icon: '💻' },
      { id: 'ai', name: 'AI', icon: '🤖' },
      { id: 'innovation', name: 'Innovation', icon: '💡' },
      { id: 'science', name: 'Science', icon: '🔬' },
      { id: 'business', name: 'Business', icon: '💼' },
      { id: 'climate', name: 'Climate', icon: '🌍' },
    ].filter(topic => topic.id !== slug);
    
    return {
      props: {
        subtopic: subSlug,
        mainTopic: slug,
        articlesData: filteredArticles.map(post => ({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          date: post.date,
          image: post.image || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60',
          readingTime: post.readingTime || 3,
          category: post.category || 'General',
          trending: post.metadata?.trending || Math.random() > 0.7, // Use metadata if available, otherwise random
          views: Math.floor(Math.random() * 1000) + 100, // Random view count for demo
        })),
        relatedTopics: relatedTopics.slice(0, 6) // Limit to 6 related topics
      },
      revalidate: 3600 // Revalidate every hour
    }
  } catch (error) {
    console.error('Error in getStaticProps for subtopic page:', error)
    
    return {
      props: {
        subtopic: subSlug,
        mainTopic: slug,
        articlesData: [],
        relatedTopics: []
      },
      revalidate: 300 // Retry sooner on error
    }
  }
}

// Generate static paths for common subtopics
export async function getStaticPaths() {
  // Define some common topic+subtopic combinations
  const commonPaths = [
    { params: { slug: 'tech', subSlug: 'web-development' } },
    { params: { slug: 'tech', subSlug: 'mobile' } },
    { params: { slug: 'ai', subSlug: 'machine-learning' } },
    { params: { slug: 'ai', subSlug: 'generative-ai' } },
    { params: { slug: 'science', subSlug: 'physics' } },
  ]
  
  return {
    paths: commonPaths,
    fallback: 'blocking' // Generate other subtopic pages on-demand
  }
} 