import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const TopicExplorer = ({ 
  title = "Explore Topics", 
  subtitle = "Discover content by topic", 
  limit = 12, 
  featuredOnly = true 
}) => {
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/articles/topic?featured=${featuredOnly}&limit=${limit}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch topics');
        }
        
        const data = await response.json();
        setTopics(data.topics || []);
      } catch (err) {
        console.error('Error fetching topics:', err);
        setError('Failed to load topics. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTopics();
  }, [featuredOnly, limit]);
  
  // Helper to determine background style based on article count
  const getBackgroundStyle = (count, recencyScore) => {
    // Base on both count and recency
    const intensity = Math.min(100, Math.max(0, (count * 5) + (recencyScore * 0.3)));
    
    // Generate a gradient based on the intensity
    return {
      background: `linear-gradient(135deg, rgba(64, 93, 230, ${0.2 + (intensity * 0.005)}) 0%, rgba(88, 81, 219, ${0.2 + (intensity * 0.005)}) 100%)`,
      boxShadow: `0 4px 12px rgba(0, 0, 0, ${0.05 + (intensity * 0.001)})`,
    };
  };
  
  // Add a visual indicator for recent content
  const getRecencyIndicator = (recencyScore) => {
    if (recencyScore >= 90) {
      return <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">New</span>;
    } else if (recencyScore >= 70) {
      return <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Recent</span>;
    }
    return null;
  };
  
  return (
    <div className="my-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-gray-600">{subtitle}</p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="loader"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : topics.length === 0 ? (
        <div className="text-center text-gray-500">No topics found</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {topics.map((topic) => (
            <Link 
              key={topic.slug} 
              href={`/topics/${topic.slug}`}
              className="relative block p-4 rounded-lg transition transform hover:scale-105 hover:shadow-lg"
              style={getBackgroundStyle(topic.articleCount, topic.recencyScore)}
            >
              {getRecencyIndicator(topic.recencyScore)}
              
              <div className="flex flex-col items-center text-center">
                <div className="text-3xl mb-2">{topic.icon}</div>
                <h3 className="font-bold mb-1">{topic.name}</h3>
                <p className="text-sm text-gray-700">
                  {topic.articleCount} {topic.articleCount === 1 ? 'article' : 'articles'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      <style jsx>{`
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TopicExplorer; 