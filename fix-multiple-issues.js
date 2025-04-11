const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'pages', 'topics', '[slug].js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. More aggressive deduplication in allArticles state setter
content = content.replace(
  /setAllArticles\(articlesData\);/g,
  `// Ensure no duplicates in allArticles
  const uniqueArticles = [];
  const uniqueArticleSlugs = new Set();
  const uniqueArticleTitles = new Set();
  
  for (const article of articlesData) {
    // Skip if no slug or title
    if (!article.slug || !article.title) continue;
    
    // Skip if we've seen this slug or title before
    if (uniqueArticleSlugs.has(article.slug) || uniqueArticleTitles.has(article.title)) continue;
    
    uniqueArticleSlugs.add(article.slug);
    uniqueArticleTitles.add(article.title);
    uniqueArticles.push(article);
  }
  
  console.log(\`Deduplicated allArticles from \${articlesData.length} to \${uniqueArticles.length}\`);
  setAllArticles(uniqueArticles);`
);

// 2. Fix the capitalization of topic names and add spacing for multi-word topics
content = content.replace(
  /function getDefaultTopicMetadata\(slug\) \{[\s\S]*?(return \{[\s\S]*?name:)[\s\S]*?(icon)[\s\S]*?\}/,
  function(match, beforeName, afterName) {
    return `function getDefaultTopicMetadata(slug) {
  if (!slug) return null;
  
  // Format the display name properly with correct capitalization and spacing
  let displayName = formatTopicName(slug);
  
  ${beforeName} displayName,
      ${afterName}: getTopicIcon(slug),
      slug: slug
    }`;
  }
);

// 3. Add a new helper function to properly format topic names
content = content.replace(
  /function isTopicMatch\(topicA, topicB\) \{/,
  `// Format topic names with proper capitalization and spacing
function formatTopicName(topicSlug) {
  if (!topicSlug) return '';
  
  // Normalize the slug first
  const normalized = typeof topicSlug === 'string' ? 
    topicSlug.toLowerCase().trim() : 
    String(topicSlug).toLowerCase().trim();
  
  // Special cases for acronyms and common terms
  const acronyms = {
    'ai': 'AI',
    'ml': 'ML',
    'ar': 'AR',
    'vr': 'VR',
    'ui': 'UI',
    'ux': 'UX',
    'api': 'API',
    'seo': 'SEO',
    'ceo': 'CEO',
    'cto': 'CTO',
    'nft': 'NFT',
    'dao': 'DAO',
    'saas': 'SaaS',
    'paas': 'PaaS',
    'iaas': 'IaaS',
    'iot': 'IoT',
    'nlp': 'NLP',
    'cms': 'CMS',
    'crm': 'CRM',
    'erp': 'ERP'
  };
  
  // Handle multi-word slugs with hyphens
  if (normalized.includes('-')) {
    return normalized.split('-')
      .map(word => {
        // Check if it's an acronym first
        if (acronyms[word]) return acronyms[word];
        // Otherwise capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }
  
  // Handle concatenated multi-word slugs (no hyphens)
  // Common prefixes to check for
  const prefixes = [
    'deep', 'machine', 'reinforcement', 'neural', 'artificial', 
    'quantum', 'cyber', 'block', 'crypto', 'meta', 'virtual',
    'augmented', 'mixed', 'extended', 'digital', 'cloud', 'edge',
    'fog', 'serverless', 'micro', 'nano', 'bio', 'neuro', 'cognitive',
    'computational', 'distributed', 'federated', 'transfer', 'unsupervised',
    'supervised', 'semi'
  ];
  
  let displayName = normalized;
  
  // Try to identify and separate words in concatenated slugs
  for (const prefix of prefixes) {
    if (displayName.startsWith(prefix) && displayName.length > prefix.length) {
      // Split after the prefix
      displayName = prefix + ' ' + displayName.slice(prefix.length);
      break;
    }
    
    if (displayName.includes(prefix) && !displayName.startsWith(prefix)) {
      // Split before the prefix
      const index = displayName.indexOf(prefix);
      displayName = displayName.slice(0, index) + ' ' + displayName.slice(index);
      break;
    }
  }
  
  // Check for acronyms
  if (acronyms[normalized]) {
    return acronyms[normalized];
  }
  
  // Standard capitalization for single words
  return displayName.split(' ')
    .map(word => {
      if (acronyms[word]) return acronyms[word];
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function isTopicMatch(topicA, topicB) {`
);

// 4. Fix the Related Topic card to use the formatting function
content = content.replace(
  /function RelatedTopicCard\(\{ topic \}\) \{[\s\S]*?const handleClick = \(e\) => \{[\s\S]*?const navigationSlug = topic\.name\.toLowerCase\(\)\.replace\(\/\\s\+\/g, '-'\);/,
  `function RelatedTopicCard({ topic }) {
  const router = useRouter();
  
  const handleClick = (e) => {
    e.preventDefault();
    
    // Get display name for proper formatting
    const displayName = formatTopicName(topic.name);
    
    // Use correctly formatted slug for navigation
    const navigationSlug = topic.name.toLowerCase().replace(/\\s+/g, '-');`
);

// 5. Fix how related topics are displayed in the related topics card
content = content.replace(
  /<h3 className="font-bold text-gray-900">\{topic\.name\}<\/h3>/,
  `<h3 className="font-bold text-gray-900">{formatTopicName(topic.name)}</h3>`
);

// 6. Fix the capitalization in the page title and breadcrumbs
content = content.replace(
  /<title>\{topicMetadata\?\.name \|\| 'Topic'\} Articles \| Tech Blog<\/title>/,
  `<title>{topicMetadata?.name ? formatTopicName(topicMetadata.name) : 'Topic'} Articles | Tech Blog</title>`
);

content = content.replace(
  /<span className="font-medium">\{topicMetadata\?\.name \|\| slug\}<\/span>/,
  `<span className="font-medium">{topicMetadata?.name ? formatTopicName(topicMetadata.name) : (slug ? formatTopicName(slug) : 'Topic')}</span>`
);

// 7. Extra deduplication in the API fetch function to catch any other duplicates
content = content.replace(
  /const loadClientData = async \(\) => \{/,
  `// Helper function for aggressive deduplication
  const deduplicateArticles = (articlesArray) => {
    if (!articlesArray || !Array.isArray(articlesArray)) return [];
    
    const uniqueArticles = [];
    const slugSet = new Set();
    const titleSet = new Set();
    
    for (const article of articlesArray) {
      if (!article.slug || !article.title) continue;
      if (slugSet.has(article.slug) || titleSet.has(article.title)) continue;
      
      slugSet.add(article.slug);
      titleSet.add(article.title);
      uniqueArticles.push(article);
    }
    
    return uniqueArticles;
  };

  const loadClientData = async () => {`
);

content = content.replace(
  /const articlesData = await fetchArticleData\(slug\);/,
  `let articlesData = await fetchArticleData(slug);
            
  // Apply aggressive deduplication
  articlesData = deduplicateArticles(articlesData);`
);

// 8. Fix the use of deduplicateArticles in handleLoadMore
content = content.replace(
  /const handleLoadMore = \(\) => \{[\s\S]*?setIsLoadingMore\(true\);[\s\S]*?const nextStartIndex = articles\.length;[\s\S]*?const nextEndIndex[\s\S]*?const nextPageArticles[\s\S]*?setArticles[\s\S]*?setHasMore[\s\S]*?setTimeout[\s\S]*?\);[\s\S]*?\};/,
  `const handleLoadMore = () => {
    setIsLoadingMore(true);
    
    // Calculate next page of articles from filteredArticles
    const nextStartIndex = articles.length;
    const nextEndIndex = nextStartIndex + articlesPerPage;
    
    // Get next batch but with vigorous deduplication
    const existingSlugs = new Set(articles.map(article => article.slug));
    const existingTitles = new Set(articles.map(article => article.title));
    
    const nextPageArticles = filteredArticles
      .slice(nextStartIndex, nextEndIndex)
      .filter(article => !existingSlugs.has(article.slug) && !existingTitles.has(article.title));
    
    console.log(\`Loading more articles: Found \${nextPageArticles.length} new unique articles\`);
    
    // Only append if we have new articles
    if (nextPageArticles.length > 0) {
      setArticles(currentArticles => [...currentArticles, ...nextPageArticles]);
    }
    
    // Check if we have more articles to load
    const totalLoaded = articles.length + nextPageArticles.length;
    setHasMore(totalLoaded < filteredArticles.length);
    
    // Reset the loading state after a short delay
    setTimeout(() => {
      setIsLoadingMore(false);
    }, 200);
  };`
);

// Write the updated file
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed issues with duplicates, capitalization, and topic formatting'); 