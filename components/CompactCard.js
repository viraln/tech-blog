import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ShimmerImage from './ShimmerImage'
import { getRelativeTime } from '../utils/dateUtils'

export default function CompactCard({ post, index }) {
  const [isHovered, setIsHovered] = useState(false)
  const [views, setViews] = useState(null)
  const [relativeTime, setRelativeTime] = useState('')
  
  useEffect(() => {
    setViews(post.views || Math.floor(Math.random() * 1000) + 100)
  }, [post.views])

  useEffect(() => {
    // Update relative time initially and every minute
    const updateRelativeTime = () => {
      setRelativeTime(getRelativeTime(post.date))
    }
    updateRelativeTime()
    const interval = setInterval(updateRelativeTime, 60000)
    return () => clearInterval(interval)
  }, [post.date])

  return (
    <Link 
      href={`/posts/${post.slug}`} 
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <article className="flex items-center space-x-4 p-4 bg-white rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" itemScope itemType="https://schema.org/Article">
        <div className="relative flex-shrink-0">
          <div className="relative w-24 h-24">
            <ShimmerImage
              src={post.image}
              alt={post.title}
              fill
              sizes="96px"
              className="object-cover rounded-lg"
              itemProp="image"
            />
            {isHovered && (
              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">Read More →</span>
              </div>
            )}
          </div>
          {index < 3 && (
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {index + 1}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <p className="text-sm font-medium text-indigo-600" itemProp="articleSection">
              {post.category || 'Tech'}
            </p>
            {post.isNew && (
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">New</span>
            )}
            {post.trending && (
              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">Trending</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors duration-200 line-clamp-2" itemProp="headline">
            {post.title}
          </h3>
          <div className="flex items-center mt-2 space-x-4">
            <time 
              dateTime={post.date} 
              className="text-sm text-gray-500 flex items-center"
              itemProp="datePublished"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {relativeTime}
            </time>
            <span className="text-gray-500">•</span>
            <span className="text-sm text-gray-500 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {post.readingTime} min read
            </span>
            {views !== null && (
              <div className="flex items-center space-x-1 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-sm">{views}</span>
              </div>
            )}
          </div>
          <meta itemProp="description" content={post.excerpt} />
        </div>
      </article>
    </Link>
  )
}
