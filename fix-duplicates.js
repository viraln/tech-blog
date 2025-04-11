const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'pages', 'topics', '[slug].js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the handleLoadMore function to properly track duplicates using a set
content = content.replace(
  /const handleLoadMore = \(\) => \{[\s\S]*?setIsLoadingMore\(true\);[\s\S]*?const nextStartIndex[\s\S]*?const nextEndIndex[\s\S]*?const nextPageArticles[\s\S]*?setArticles[\s\S]*?setHasMore[\s\S]*?setTimeout[\s\S]*?\);[\s\S]*?\};/,
  `const handleLoadMore = () => {
    setIsLoadingMore(true);
    
    // Calculate next page of articles from filteredArticles
    const nextStartIndex = articles.length;
    const nextEndIndex = nextStartIndex + articlesPerPage;
    
    // Get next batch but ENSURE no duplicates with existing articles
    const existingSlugs = new Set(articles.map(article => article.slug));
    const nextPageArticles = filteredArticles
      .slice(nextStartIndex, nextEndIndex)
      .filter(article => !existingSlugs.has(article.slug));
    
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

// Fix the filteredArticles useMemo to deduplicate articles properly
content = content.replace(
  /const filteredArticles = useMemo\(\(\) => \{[\s\S]*?if \(!allArticles[\s\S]*?return \[\];[\s\S]*?let filtered = \[\.\.\.(allArticles|articles)\];[\s\S]*?return filtered;[\s\S]*?\}, \[(allArticles|articles), currentFilter, slug\]\);/,
  `const filteredArticles = useMemo(() => {
    if (!allArticles || allArticles.length === 0) return [];
  
    // First deduplicate all articles by slug
    const uniqueArticles = [];
    const slugSet = new Set();
    
    for (const article of allArticles) {
      if (!article.slug) continue;
      if (slugSet.has(article.slug)) continue;
      
      slugSet.add(article.slug);
      uniqueArticles.push(article);
    }
    
    console.log(\`Deduplicated \${allArticles.length} articles to \${uniqueArticles.length} unique articles\`);
    
    // Then apply filters
    let filtered = [...uniqueArticles];
  
    if (currentFilter === 'trending') {
      filtered = filtered.filter(article => article.trending === true);
    } else if (currentFilter === 'featured') {
      filtered = filtered.filter(article => article.featured === true);
    }
  
    // Sort by date (latest first)
    filtered.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });
  
    return filtered;
  }, [allArticles, currentFilter, slug]);`
);

// Fix the main API fetch method to deduplicate articles
content = content.replace(
  /return articles;/g,
  `// Deduplicate before returning
    const uniqueArticles = [];
    const uniqueSlugs = new Set();
    
    for (const article of articles) {
      if (!article.slug || uniqueSlugs.has(article.slug)) continue;
      uniqueSlugs.add(article.slug);
      uniqueArticles.push(article);
    }
    
    console.log(\`Deduplicated \${articles.length} articles to \${uniqueArticles.length} unique articles\`);
    return uniqueArticles;`
);

// Write the updated file
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed issues with duplicate articles'); 