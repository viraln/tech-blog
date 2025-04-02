import Link from 'next/link'
import { useState } from 'react'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  return (
    <header className="bg-black/5 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center group"
              onClick={(e) => {
                // Force direct navigation by replacing the URL with / 
                // This bypasses any history manipulation issues
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                  e.preventDefault();
                }
              }}
            >
              <div className="relative">
                <span className="text-3xl font-black bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent group-hover:opacity-0 transition-opacity duration-200">
                Trendiingz
                </span>
                <span className="text-3xl font-black bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 transform hover:scale-110">
                Trendiingz
                </span>
              </div>
              <div className="ml-2 hidden sm:block">
                <span className="text-xs uppercase tracking-widest text-gray-600 font-medium">
                  Future • Now
                </span>
              </div>
            </Link>
          </div>
          
          {/* Desktop menu
          <div className="hidden md:flex items-center space-x-1">
            <Link 
              href="/topics/latest" 
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-full hover:bg-white/50 transition-all duration-200"
            >
              Latest
            </Link>
            
            <Link 
              href="/all-topics" 
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-full hover:bg-white/50 transition-all duration-200"
            >
              All Topics
            </Link>
            <a 
              href="/topics/latest" 
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/30 transition-all duration-200"
            >
              🔥
            </a>
          </div> */}
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-white/50 focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded="false"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              <svg
                className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Icon when menu is open */}
              <svg
                className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
      
      {/* Mobile menu, show/hide based on menu state */}
      <div className={`md:hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`} id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 bg-white/80 backdrop-blur-lg shadow-lg">
          <Link 
            href="/"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-white hover:text-indigo-600"
          >
            Home
          </Link>
          <Link 
            href="/topics/latest"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-white hover:text-indigo-600"
          >
            Latest
          </Link>
          <Link 
            href="/all-topics"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-white hover:text-indigo-600"
          >
            All Topics
          </Link>
        </div>
      </div>
    </header>
  )
} 