const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'pages', 'topics', '[slug].js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix RelatedTopicCard component
content = content.replace(
  /function RelatedTopicCard\(\{ topic \}\) \{[\s\S]*?const handleClick = \(e\) => \{[\s\S]*?router\.push\(`\/topics\/\${encodeURIComponent\(navigationSlug\)}`\);[\s\S]*?\};/,
  `function RelatedTopicCard({ topic }) {
  const router = useRouter();
  
  const handleClick = (e) => {
    e.preventDefault();
    
    // Simple and reliable navigation using topic name
    const navigationSlug = topic.name.toLowerCase().replace(/\\s+/g, '-');
    
    console.log(\`Navigating to topic: \${navigationSlug}\`);
    router.push(\`/topics/\${encodeURIComponent(navigationSlug)}\`);
  };`
);

// Fix handleLoadMore to not hide articles during loading
content = content.replace(
  /const handleLoadMore = \(\) => \{[\s\S]*?setIsLoadingMore\(true\);[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?setArticles\([\s\S]*?\);[\s\S]*?setIsLoadingMore\(false\);[\s\S]*?\}, 600\);/,
  `const handleLoadMore = () => {
  setIsLoadingMore(true);
  
  // Calculate next page of articles from filteredArticles
  const nextStartIndex = articles.length;
  const nextEndIndex = nextStartIndex + articlesPerPage;
  const nextPageArticles = filteredArticles.slice(nextStartIndex, nextEndIndex);
  
  console.log(\`Loading more articles: \${nextStartIndex} to \${nextEndIndex}\`);
  
  // Directly append articles without hiding existing ones
  setArticles(current => [...current, ...nextPageArticles]);
  setHasMore(articles.length + nextPageArticles.length < filteredArticles.length);
  
  // Short delay to finish loading state
  setTimeout(() => {
    setIsLoadingMore(false);
  }, 200);`
);

// Add ML content filtering to fetchArticleData
content = content.replace(
  /const fetchArticleData = useCallback\(async \(topicSlug\) => \{[\s\S]*?let apiUrl = [\s\S]*?\/api\/articles\/topic\/[\s\S]*?limit=50&page=1[\s\S]*?\`;/,
  `const fetchArticleData = useCallback(async (topicSlug) => {
  try {
    console.log(\`Fetching articles for topic: \${topicSlug}\`);
    
    // Use the proven API endpoints that were working before
    let apiUrl = \`/api/articles/topic/\${encodeURIComponent(topicSlug)}?limit=50&page=1\`;
    
    // Add higher relevance threshold for Machine Learning to exclude AR content
    if (topicSlug.toLowerCase().includes('machine learning')) {
      apiUrl += '&minScore=35';
    }`
);

// Write the updated file
fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated RelatedTopicCard and handleLoadMore functions'); 