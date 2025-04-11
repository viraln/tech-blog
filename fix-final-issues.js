const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'pages', 'topics', '[slug].js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the Healthcare topic filtering to aggressively filter out AR articles
content = content.replace(
  /function processFetchedArticles\(articles, topicSlug\) \{[\s\S]*?if \(isMLTopic\) \{[\s\S]*?\}/,
  `function processFetchedArticles(articles, topicSlug) {
    // Return mock data if no articles
    if (!articles || articles.length === 0) {
      console.warn(\`No articles found for topic: \${topicSlug}, using fallback data\`);
      return createMockArticles(topicSlug, currentFilter);
    }
    
    // Deduplicate by slug to avoid duplicate key warnings and duplicate content
    const uniqueArticles = [];
    const slugSet = new Set();
    const titleSet = new Set();
    
    // Apply a more aggressive filter for certain topics
    const isMLTopic = topicSlug.toLowerCase().includes('machine learning');
    const isHealthcareTopic = topicSlug.toLowerCase().includes('health') || 
                             topicSlug.toLowerCase() === 'healthcare' ||
                             topicSlug.toLowerCase() === 'medical';
    
    console.log(\`Processing \${articles.length} articles for topic: \${topicSlug} (Healthcare: \${isHealthcareTopic}, ML: \${isMLTopic})\`);
    
    articles.forEach(article => {
      // Skip if we already have this article
      if (slugSet.has(article.slug) || titleSet.has(article.title)) {
        console.log(\`Skipping duplicate article: \${article.title}\`);
        return;
      }
      
      // Special filtering for Healthcare topics
      if (isHealthcareTopic) {
        // Check article for AR/VR content
        const hasARTerms = /\\b(augmented reality|AR glasses|AR headset|AR technology)\\b/i.test(article.title || '') || 
                          /\\b(augmented reality|AR glasses|AR headset|AR technology)\\b/i.test(article.excerpt || '');
        
        // Check for healthcare-related terms 
        const hasHealthTerms = /\\b(health|medical|medicine|patient|doctor|hospital|therapy|treatment|clinical|wellness)\\b/i.test(article.title || '') ||
                              /\\b(health|medical|medicine|patient|doctor|hospital|therapy|treatment|clinical|wellness)\\b/i.test(article.excerpt || '');
        
        // If it has AR terms but no health terms in the title, it's not relevant
        if (hasARTerms && !hasHealthTerms) {
          console.log(\`Healthcare topic: Filtering out AR article: \${article.title}\`);
          return;
        }
        
        // Calculate relevance score for additional filtering
        const relevance = calculateArticleRelevance(article, topicSlug);
        if (relevance < 40) { // Higher threshold for healthcare
          console.log(\`Healthcare topic: Low relevance article filtered out: \${article.title} (score: \${relevance})\`);
          return;
        }
      }
      
      // Machine Learning filtering
      if (isMLTopic) {
        const relevance = calculateArticleRelevance(article, topicSlug);
        
        // Check for AR terms that shouldn't be in Machine Learning content
        const hasARTerms = /\\b(augmented reality|AR glasses|AR headset)\\b/i.test(article.title || '') || 
                         /\\b(augmented reality|AR glasses|AR headset)\\b/i.test(article.excerpt || '');
                         
        const hasMLTerms = /\\b(machine learning|ML|algorithm|neural network|AI model|training data)\\b/i.test(article.title || '') ||
                         /\\b(machine learning|ML|algorithm|neural network|AI model|training data)\\b/i.test(article.excerpt || '');
        
        // Skip AR content that doesn't explicitly mention ML terms
        if (hasARTerms && !hasMLTerms) {
          console.log(\`Filtering out AR article from ML page: \${article.title}\`);
          return;
        }
        
        // Skip low relevance content
        if (relevance < 35) {
          console.log(\`Filtering out low relevance article: \${article.title} (score: \${relevance})\`);
          return;
        }
      }
      
      slugSet.add(article.slug);
      titleSet.add(article.title);
      uniqueArticles.push(article);
    });
    
    return uniqueArticles;
  }`
);

// 2. Fix the article relevance calculation for Healthcare topics
content = content.replace(
  /function calculateArticleRelevance\(article, topicSlug\) \{[\s\S]*?const normalizedTopicSlug = topicSlug\.toLowerCase\(\);[\s\S]*?const isMachineLearning[\s\S]*?if \(isMachineLearning\)/,
  `function calculateArticleRelevance(article, topicSlug) {
  if (!article || !topicSlug) {
    return 0;
  }
  
  // Normalize the topic slug
  const normalizedTopicSlug = topicSlug.toLowerCase();
  
  // Special case for Machine Learning topic
  const isMachineLearning = normalizedTopicSlug.includes('machine learning') || 
                           normalizedTopicSlug === 'ml';
                           
  // Special case for Healthcare topics
  const isHealthcare = normalizedTopicSlug.includes('health') || 
                      normalizedTopicSlug === 'healthcare' ||
                      normalizedTopicSlug === 'medical' ||
                      normalizedTopicSlug.includes('medicine');
  
  // Start with a base score
  let score = 0;
  
  // Healthcare topics need special handling to filter out AR content
  if (isHealthcare) {
    // Require explicit health terms in title or excerpt
    const hasHealthTermsInTitle = /\\b(health|medical|medicine|patient|doctor|hospital|therapy|treatment|clinical|wellness)\\b/i.test(article.title || '');
    const hasHealthTermsInExcerpt = /\\b(health|medical|medicine|patient|doctor|hospital|therapy|treatment|clinical|wellness)\\b/i.test(article.excerpt || '');
    
    // Check for conflicting AR terminology
    const hasArTerms = /\\b(augmented reality|ar glasses|ar headset)\\b/i.test(article.title || '') || 
                      /\\b(augmented reality|ar glasses|ar headset)\\b/i.test(article.excerpt || '');
    
    // If it has AR terms but no health terms, it's probably not relevant
    if (hasArTerms && !hasHealthTermsInTitle) {
      return 10; // Very low score
    }
    
    // Boost score for explicit health mentions
    if (hasHealthTermsInTitle) score += 50;
    if (hasHealthTermsInExcerpt) score += 30;
    
    // Direct match with the term "healthcare" is highly relevant
    if (article.title && article.title.toLowerCase().includes('healthcare')) {
      score += 40;
    }
    
    // If we have some health relevance, return the score
    if (score > 0) return score;
  }
  
  if (isMachineLearning)`
);

// 3. Fix handleLoadMore to more thoroughly check for duplicates
content = content.replace(
  /const handleLoadMore[\s\S]*?setIsLoadingMore\(true\);[\s\S]*?nextPageArticles[\s\S]*?setArticles[\s\S]*?setHasMore[\s\S]*?setTimeout[\s\S]*?setIsLoadingMore\(false\)/,
  `const handleLoadMore = () => {
    console.log('Loading more articles...');
    setIsLoadingMore(true);
    
    // Calculate next page of articles from filteredArticles
    const nextStartIndex = articles.length;
    const nextEndIndex = nextStartIndex + articlesPerPage;
    
    // Get next batch with aggressive deduplication
    const existingSlugs = new Set(articles.map(article => article.slug));
    const existingTitles = new Set(articles.map(article => article.title));
    const existingContent = new Set(articles.map(article => article.excerpt));
    
    const nextPageArticles = filteredArticles
      .slice(nextStartIndex, nextEndIndex)
      .filter(article => {
        // Skip if no slug, title, or we've seen this before
        if (!article.slug || !article.title) return false;
        if (existingSlugs.has(article.slug)) return false;
        if (existingTitles.has(article.title)) return false;
        
        // Also check excerpt similarity for additional deduplication
        if (article.excerpt && existingContent.has(article.excerpt)) return false;
        
        return true;
      });
    
    console.log(\`Loading more articles: Found \${nextPageArticles.length} new unique articles\`);
    
    // Only append if we have new articles
    if (nextPageArticles.length > 0) {
      setArticles(currentArticles => {
        console.log(\`Adding \${nextPageArticles.length} articles to existing \${currentArticles.length}\`);
        return [...currentArticles, ...nextPageArticles];
      });
    } else {
      console.log('No new unique articles to load');
    }
    
    // Check if we have more articles to load
    const hasMoreArticles = (articles.length + nextPageArticles.length) < filteredArticles.length;
    console.log(\`Has more articles: \${hasMoreArticles} (loaded: \${articles.length + nextPageArticles.length}, total: \${filteredArticles.length})\`);
    setHasMore(hasMoreArticles);
    
    // Reset the loading state after a short delay
    setTimeout(() => {
      setIsLoadingMore(false)
    }, 200);`
);

// 4. Improve how we process topic names for better spacing in the RelatedTopicCard
content = content.replace(
  /function formatTopicName\(topicSlug\) \{[\s\S]*?let displayName = normalized;/,
  `function formatTopicName(topicSlug) {
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
    'erp': 'ERP',
    '3d': '3D',
    'ui/ux': 'UI/UX'
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
  
  // Multi-word detection patterns
  // Common word boundaries in CamelCase or concatenated words
  const wordBoundaries = [
    // CamelCase detection
    /([a-z])([A-Z])/g,
    
    // Common tech terms that often get concatenated
    /(machine)(learning)/gi,
    /(deep)(learning)/gi,
    /(artificial)(intelligence)/gi,
    /(augmented)(reality)/gi,
    /(virtual)(reality)/gi,
    /(mixed)(reality)/gi,
    /(blockchain)(technology)/gi,
    /(data)(science)/gi,
    /(cyber)(security)/gi,
    /(neural)(network)/gi,
    /(natural)(language)/gi,
    /(computer)(vision)/gi,
    /(cloud)(computing)/gi,
    /(internet)(of)(things)/gi,
    /(big)(data)/gi,
    /(quantum)(computing)/gi,
    /(edge)(computing)/gi,
    /(web)(development)/gi,
    /(mobile)(development)/gi,
    /(front)(end)/gi,
    /(back)(end)/gi,
    /(full)(stack)/gi,
    /(user)(experience)/gi,
    /(user)(interface)/gi,
    /(product)(design)/gi,
    /(machine)(vision)/gi,
    /(reinforcement)(learning)/gi
  ];
  
  // Apply all boundary patterns to insert spaces
  let displayName = normalized;
  for (const pattern of wordBoundaries) {
    if (pattern === /([a-z])([A-Z])/g) {
      // Special handling for CamelCase
      displayName = displayName.replace(pattern, '$1 $2');
    } else {
      // For other patterns, check if they apply
      const match = displayName.match(pattern);
      if (match) {
        // Insert a space between the matched groups
        const parts = pattern.toString().match(/\\(([^)]+)\\)/g);
        if (parts && parts.length >= 2) {
          const term1 = parts[0].replace(/[()]/g, '');
          const term2 = parts[1].replace(/[()]/g, '');
          const regex = new RegExp(\`(\${term1})(\${term2})\`, 'i');
          displayName = displayName.replace(regex, '$1 $2');
        }
      }
    }
  }`
);

// 5. Explicitly enforce the use of formatTopicName in the RelatedTopicCard
content = content.replace(
  /<h3 className="font-bold text-gray-900">\{formatTopicName\(topic\.name\)\}<\/h3>/,
  `<h3 className="font-bold text-gray-900">{formatTopicName(topic.name)}</h3>`
);

// 6. Make getRelatedTopicsFromArticles use formatTopicName for better displayed names
content = content.replace(
  /dedupedTopics\.push\(\{[\s\S]*?id: `topic-\${slug}-\${i}`,[\s\S]*?name: metadata\.name[^,]*,/,
  `dedupedTopics.push({
      ...metadata,
      // Generate a truly unique ID to avoid React key warnings
      id: \`topic-\${slug}-\${i}\`,
      // Use formatTopicName to ensure proper spacing and capitalization
      name: formatTopicName(metadata.name || 'Unknown Topic'),`
);

// Write the updated file
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed remaining issues with duplicates, Healthcare filtering, and topic name formatting'); 