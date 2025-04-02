import Link from 'next/link'
import Image from 'next/image'
import ShimmerImage from '../ShimmerImage'
import { useState, useMemo } from 'react'

// Utility function to generate stable random-like numbers based on input string
function getStableNumber(str, min, max) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % (max - min) + min;
}

export function HotTakeSection({ posts }) {
  // Posts are already pre-sliced from the parent component
  
  return (
    <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🔥</span>
          <h2 className="text-xl font-bold text-white">Hot Takes</h2>
          <span className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full">
            Controversial
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {posts.map((post, index) => {
          const reactions = getStableNumber(post.slug + '-reactions', 50, 150);
          const comments = getStableNumber(post.slug + '-comments', 5, 25);
          
          return (
            <Link 
              key={`hot-${post.slug}`}
              href={`/posts/${post.slug}`}
              className="block bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-white/20 transition-all group"
            >
              <div className="flex items-stretch min-w-0">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <ShimmerImage
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start space-x-2 min-w-0">
                    <div className="text-2xl flex-shrink-0">
                      {['🤯', '💭', '⚡️'][index]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold group-hover:text-orange-200 transition-colors line-clamp-2 text-sm">
                        {post.title}
                      </h3>
                      <div className="mt-2 flex items-center text-white/70 text-xs">
                        <span>{reactions} reactions</span>
                        <span className="mx-2 hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{comments} comments</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  )
}

export function DailyDigestSection({ posts }) {
  // Posts are already pre-sliced from the parent component
  
  return (
    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📚</span>
          <h2 className="text-xl font-bold text-white">Daily Digest</h2>
        </div>
        <span className="text-xs text-white/80">
          {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
        </span>
      </div>
      <div className="space-y-3">
        {posts.map((post, index) => (
          <Link 
            key={`digest-${post.slug}`}
            href={`/posts/${post.slug}`}
            className="flex items-center space-x-3 group bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-white/20 transition-all"
          >
            <div className="relative w-16 h-16 flex-shrink-0">
              <ShimmerImage
                src={post.image}
                alt={post.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
            <div className="flex-1 py-2 pr-4 min-w-0">
              <div className="flex items-center space-x-3">
                <span className="text-white/80 font-mono text-sm flex-shrink-0">0{index + 1}</span>
                <h3 className="text-white group-hover:text-emerald-200 transition-colors line-clamp-2 text-sm">
                  {post.title}
                </h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function MindblownSection({ posts }) {
  // Posts are already pre-sliced from the parent component
  const [activeIndex, setActiveIndex] = useState(0)
  
  // Use useMemo to optimize rendering
  const carouselItems = useMemo(() => {
    return posts.map((post, index) => (
      <div 
        key={`mindblown-${post.slug}`}
        className={`absolute inset-0 transition-all duration-500 ${
          index === activeIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 pointer-events-none'
        }`}
      >
        <Link href={`/posts/${post.slug}`} className="block h-full">
          <div className="relative h-[220px] rounded-lg overflow-hidden mb-4">
            <ShimmerImage
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-white font-semibold mb-2 hover:text-purple-200 transition-colors line-clamp-2">
                {post.title}
              </h3>
              <div className="flex items-center text-white/70 text-sm">
                <span>Blow your mind in {post.readingTime} minutes</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    ));
  }, [posts, activeIndex]);
  
  const indicators = useMemo(() => {
    return posts.map((_, index) => (
      <button
        key={index}
        onClick={() => setActiveIndex(index)}
        className={`w-2 h-2 rounded-full transition-all ${
          index === activeIndex ? 'bg-white w-6' : 'bg-white/40'
        }`}
      />
    ));
  }, [posts.length, activeIndex]);
  
  return (
    <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <span className="text-2xl">🤯</span>
        <h2 className="text-xl font-bold text-white">Mind = Blown</h2>
      </div>
      <div className="relative h-[300px]">
        {carouselItems}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center space-x-2">
          {indicators}
        </div>
      </div>
    </div>
  )
}

export function QuickBitesSection({ posts }) {
  // Posts are already pre-sliced from the parent component
  
  return (
    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <span className="text-2xl">⚡️</span>
        <h2 className="text-xl font-bold text-white">Quick Bites</h2>
        <span className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full">
          1-min reads
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {posts.map((post) => (
          <Link 
            key={`quick-${post.slug}`}
            href={`/posts/${post.slug}`}
            className="block bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-white/20 transition-all group"
          >
            <div className="relative h-32">
              <ShimmerImage
                src={post.image}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </div>
            <div className="p-3">
              <h3 className="text-white font-semibold line-clamp-2 group-hover:text-yellow-200 transition-colors text-sm">
                {post.title}
              </h3>
              <div className="mt-2 flex items-center text-white/70 text-xs">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>1 min read</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function TrendingDebatesSection({ posts }) {
  // Posts are already pre-sliced from the parent component
  const colors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-pink-400']
  const initials = ['JD', 'AS', 'MK', 'RB']
  
  return (
    <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <span className="text-2xl">🗣️</span>
        <h2 className="text-xl font-bold text-white">Trending Debates</h2>
        <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">
          LIVE
        </span>
      </div>
      <div className="space-y-3">
        {posts.map((post, index) => {
          const debaters = getStableNumber(post.slug + '-debaters', 20, 120);
          const extraUsers = getStableNumber(post.slug + '-extra', 10, 99);
          
          return (
            <Link 
              key={`debate-${post.slug}-${index}`}
              href={`/posts/${post.slug}`}
              className="block bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-white/20 transition-all group"
            >
              <div className="flex items-stretch min-w-0">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <ShimmerImage
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
                <div className="flex-1 p-4 min-w-0">
                  <h3 className="text-white font-semibold group-hover:text-blue-200 transition-colors line-clamp-2 mb-2">
                    {post.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex -space-x-2">
                      {[...Array(4)].map((_, i) => (
                        <div 
                          key={`${post.slug}-avatar-${i}`}
                          className={`w-6 h-6 rounded-full ${colors[i]} border-2 border-blue-600 flex items-center justify-center text-[10px] font-medium text-white`}
                        >
                          {initials[i]}
                        </div>
                      ))}
                      <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-blue-600 flex items-center justify-center text-xs text-blue-600 font-medium">
                        +{extraUsers}
                      </div>
                    </div>
                    <span className="text-white/70 hidden sm:inline">
                      {debaters} debating
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  )
}

export function TechInsightsSection({ posts }) {
  // The posts are already pre-sliced from the parent component
  const tags = ['Hardware', 'Software', 'Web3', 'Gadgets']
  
  // Memoize content to reduce re-renders
  const techContent = useMemo(() => {
    return posts.map((post, index) => {
      const upvotes = getStableNumber(post.slug + '-upvotes', 300, 1200);
      const randomTag = tags[getStableNumber(post.slug, 0, tags.length)];
      
      return (
        <Link 
          key={`tech-${post.slug}`}
          href={`/posts/${post.slug}`}
          className="block bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-white/10 transition-all group border border-slate-700"
        >
          <div className="flex items-stretch min-w-0">
            <div className="flex items-center justify-center w-16 flex-shrink-0 bg-gradient-to-b from-slate-700 to-slate-800 text-center p-4">
              <div className="text-center">
                <div className="flex flex-col items-center">
                  <svg className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white text-xs font-medium mt-1">{upvotes}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/30 text-indigo-200">
                  {randomTag}
                </span>
                <span className="text-white/50 text-xs">{post.readingTime} min read</span>
              </div>
              <h3 className="text-white font-semibold group-hover:text-indigo-300 transition-colors line-clamp-2 mt-2 text-sm">
                {post.title}
              </h3>
              <div className="mt-2 flex items-center text-slate-400 text-xs">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {getStableNumber(post.slug + '-comments', 10, 80)} comments
                </span>
              </div>
            </div>
          </div>
        </Link>
      );
    });
  }, [posts, tags]);
  
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6">
      <div className="flex items-center space-x-1 sm:space-x-2 mb-6">
        <span className="text-xl sm:text-2xl">💻</span>
        <h2 className="text-lg sm:text-xl font-bold text-white">Tech Insights</h2>
        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white/20 backdrop-blur-sm text-white text-[10px] sm:text-xs rounded-full whitespace-nowrap">
          <span className="hidden xs:inline">Expert </span>Analysis
        </span>
      </div>
      <div className="space-y-3">
        {techContent}
      </div>
    </div>
  )
}

export function AIFrontierSection({ posts }) {
  // Posts are already pre-sliced from the parent component
  
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🤖</span>
          <h2 className="text-xl font-bold text-white">AI Corner</h2>
        </div>
      </div>
      <div className="space-y-3">
        {posts.map((post, index) => {
          // Generating unique stable IDs for each post
          const uniqueId = `ai-frontier-${post.slug}-${index}`;
          const readingTime = getStableNumber(uniqueId + '-reading', 3, 12);
          
          return (
            <Link 
              key={uniqueId}
              href={`/posts/${post.slug}`}
              className="block"
            >
              <div className="overflow-hidden rounded-xl relative bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
                <div className="relative h-24 sm:h-32 md:h-40">
                  <ShimmerImage
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <h4 className="text-white font-medium text-sm line-clamp-2">
                    {post.title}
                  </h4>
                  <div className="flex items-center mt-2 text-xs text-white/70">
                    <span>{readingTime} min read</span>
                    <span className="mx-2">•</span>
                    <span>AI Focus</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  )
}

export function NicheTopicsSection({ posts }) {
  // Posts are already pre-sliced from the parent component
  
  return (
    <div className="bg-gradient-to-r from-pink-700 to-pink-900 rounded-xl p-6 shadow-lg relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-pink-500/20 blur-xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-rose-500/20 blur-xl"></div>
      
      <div className="flex items-center justify-between mb-6 relative">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🔍</span>
          <h2 className="text-xl font-bold text-white">Niche Topics</h2>
          <span className="px-2 py-1 bg-pink-500/30 backdrop-blur-sm text-pink-100 text-xs rounded-full border border-pink-400/30">
            Discover More
          </span>
        </div>
      </div>
      
      <div className="space-y-3 relative">
        {posts.map((post, index) => {
          // Generating unique stable IDs for each post
          const uniqueId = `niche-topic-${post.slug}-${index}`;
          
          return (
            <Link 
              key={uniqueId}
              href={`/posts/${post.slug}`}
              className="block bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-pink-600/20 transition-all group border border-pink-500/20 hover:border-pink-400/40"
            >
              <div className="p-4 relative">
                {/* Left accent line */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-400/40 via-pink-300/60 to-pink-400/40"></div>
                
                <div className="flex items-center space-x-3 mb-2 ml-2">
                  <span className="text-xl text-white flex-shrink-0">{['🧠', '🌱', '🔭', '💎'][index % 4]}</span>
                  <h4 className="text-white font-semibold text-sm group-hover:text-pink-200 transition-colors">
                    {post.title}
                  </h4>
                </div>
                <div className="ml-9">
                  <p className="text-pink-100/70 text-xs line-clamp-2 group-hover:text-pink-100 transition-colors">
                    {post.excerpt || "Discover unique insights on trending niche topics that are reshaping our digital landscape."}
                  </p>
                  
                  <div className="flex justify-end mt-2">
                    <span className="text-pink-300 text-xs group-hover:text-pink-200 transition-colors">
                      Read More →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  )
}

export function KnowledgeHubSection({ posts }) {
  const knowledgePosts = posts.slice(27, 30)
  
  return (
    <div className="bg-gradient-to-br from-amber-800 to-yellow-900 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <span className="text-2xl">📖</span>
        <h2 className="text-xl font-bold text-white">Knowledge Hub</h2>
        <span className="px-2 py-1 bg-amber-500/30 text-white text-xs rounded-full">
          Learn & Grow
        </span>
      </div>
      <div className="space-y-4">
        {knowledgePosts.map((post, index) => {
          const difficulty = ['Beginner', 'Intermediate', 'Advanced'][getStableNumber(post.slug, 0, 3)];
          const difficultyColor = {
            'Beginner': 'bg-green-500/30 text-green-200', 
            'Intermediate': 'bg-yellow-500/30 text-yellow-200',
            'Advanced': 'bg-red-500/30 text-red-200'
          };
          
          return (
            <div key={`knowledge-${post.slug}`} className="bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden group">
              <div className="border-l-4 border-amber-500">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${difficultyColor[difficulty]}`}>
                      {difficulty}
                    </span>
                    <span className="text-amber-200/70 text-xs">{post.readingTime} min read</span>
                  </div>
                  <Link href={`/posts/${post.slug}`}>
                    <h3 className="text-white font-semibold group-hover:text-amber-200 transition-colors line-clamp-2 mb-2 text-sm">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-white/70 text-xs line-clamp-2 mb-3">
                    {post.excerpt || "Learn the fundamentals and advanced concepts to master this topic."}
                  </p>
                  <div className="flex justify-between items-center">
                    <Link 
                      href={`/posts/${post.slug}`}
                      className="inline-flex items-center text-amber-300 text-xs group-hover:text-amber-200"
                    >
                      <span>Read full article</span>
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-amber-200/70 hover:text-amber-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                      <button className="p-1 text-amber-200/70 hover:text-amber-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
} 