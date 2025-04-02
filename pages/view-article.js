import React from 'react';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import dynamic from 'next/dynamic';
import Head from 'next/head';

// Dynamically import components with SSR disabled
const ArticleViewer = dynamic(() => import('../components/ArticleViewer'), {
  ssr: false,
});

export default function ViewArticle({ article }) {
  if (!article) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">No article found</h1>
        <p>Unable to load the article. Please try again or check if articles exist.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Head>
        <title>{article.frontMatter.title}</title>
        <meta name="description" content={article.frontMatter.excerpt} />
      </Head>

      <h1 className="text-3xl font-bold mb-2">{article.frontMatter.title}</h1>
      <p className="text-gray-600 mb-4">Published: {new Date(article.frontMatter.date).toLocaleDateString()}</p>
      
      {article.frontMatter.image && (
        <div className="my-6">
          <img 
            src={article.frontMatter.image} 
            alt={article.frontMatter.imageAlt || article.frontMatter.title} 
            className="w-full h-auto rounded-lg"
          />
          {article.frontMatter.imageCredit && (
            <p className="text-sm text-gray-500 mt-1" dangerouslySetInnerHTML={{ __html: article.frontMatter.imageCredit
              .replace(/\*/g, '')
              .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
                // Add UTM parameters to Unsplash links
                if (url.includes('unsplash.com')) {
                  // Separate the URL from any query parameters that might already exist
                  const [baseUrl, existingQuery] = url.split('?');
                  const separator = existingQuery ? '&' : '?';
                  const utmParams = `utm_source=trendiingz&utm_medium=referral`;
                  return `<a href="${baseUrl}${separator}${utmParams}" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:text-indigo-700 transition-colors">${text}</a>`;
                }
                // Return normal links unchanged
                return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:text-indigo-700 transition-colors">${text}</a>`;
              })
            }} />
          )}
        </div>
      )}

      <div className="my-8">
        <ArticleViewer content={article.content} />
      </div>
    </div>
  );
}

export async function getStaticProps() {
  try {
    // Get all files from the articles directory
    const articlesDirectory = path.join(process.cwd(), 'content/articles');
    const filenames = fs.readdirSync(articlesDirectory);
    
    // Sort files by date to get the most recent one
    const sortedFiles = filenames.sort().reverse();
    
    if (sortedFiles.length === 0) {
      console.log('No articles found');
      return { props: { article: null } };
    }
    
    // Get the most recent article file
    const mostRecentFile = sortedFiles[0];
    const filePath = path.join(articlesDirectory, mostRecentFile);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    
    // Parse the frontmatter and content
    const { data: frontMatter, content } = matter(fileContents);
    
    console.log(`Loading article: ${frontMatter.title}`);
    
    return {
      props: {
        article: {
          frontMatter,
          content
        }
      }
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return { props: { article: null } };
  }
} 