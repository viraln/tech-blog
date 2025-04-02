export default function CommunitySection() {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl p-6 text-white text-center relative overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='20' height='20' fill='none'/%3E%3Crect width='1' height='20' fill='white' fill-opacity='0.1'/%3E%3Crect width='20' height='1' fill='white' fill-opacity='0.1'/%3E%3C/svg%3E")`,
        opacity: 0.1
      }}></div>
      <div className="relative">
        <h3 className="text-xl font-bold mb-2">Join Our Community</h3>
        <p className="text-blue-100 mb-4">Connect with trend enthusiasts</p>
        
        <div className="bg-white/10 rounded-lg p-4 mb-4">
          <p className="font-medium">Community Benefits</p>
          <ul className="text-sm text-left text-blue-200 mt-2 space-y-1">
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Exclusive discussions
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Early access to content
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Connect with experts
            </li>
          </ul>
        </div>
        
        <a href="https://twitter.com/intent/follow?screen_name=trendiingz" target="_blank" className="w-full bg-white text-blue-600 rounded-lg px-4 py-2 font-medium hover:bg-blue-50 transition-all duration-200 transform hover:scale-105">
          Join Now →
        </a>
        <p className="text-xs mt-2 text-blue-200">50,000+ active members</p>
      </div>
    </div>
  )
}
