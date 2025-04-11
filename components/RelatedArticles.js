import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const RelatedArticles = ({ 
  topic, 
  title = "Related Articles", 
  limit = 3, 
  minScore = 40,
  showRelevanceScore = false
}) => {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchArticles = async () => {
      if (!topic) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/articles/topic/${topic}?limit=${limit}&minScore=${minScore}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch articles');
        }
        
        const data = await response.json();
        setArticles(data.articles || []);
      } catch (err) {
        console.error(`Error fetching articles for topic ${topic}:`, err);
        setError('Failed to load related articles. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchArticles();
  }, [topic, limit, minScore]);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).format(date);
  };
  
  return (
    <div className="my-6">
      {title && (
        <h3 className="text-xl font-bold mb-4">{title}</h3>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[100px]">
          <div className="loader"></div>
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : articles.length === 0 ? (
        <div className="text-gray-500">No related articles found</div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <Link 
              key={article.slug} 
              href={`/articles/${article.slug}`}
              className="block p-4 rounded-lg shadow-sm hover:shadow-md transition bg-white border border-gray-100"
            >
              <div className="flex items-start gap-4">
                {article.image && (
                  <div className="hidden sm:block flex-shrink-0 w-20 h-20 relative overflow-hidden rounded">
                    <Image 
                      src={article.image} 
                      alt={article.title} 
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="flex-1">
                  <h4 className="font-medium text-lg mb-1">{article.title}</h4>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <span>{formatDate(article.date)}</span>
                    {article.readingTime && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{article.readingTime} min read</span>
                      </>
                    )}
                    {showRelevanceScore && article.relevance && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="text-blue-600">
                          {article.relevance.score}% match
                        </span>
                      </>
                    )}
                  </div>
                  
                  {article.excerpt && (
                    <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      <style jsx>{`
        .loader {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          width: 24px;
          height: 24px;
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

export default RelatedArticles; 