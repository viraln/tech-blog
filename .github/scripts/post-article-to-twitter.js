const fs = require('fs');
const path = require('path');
const { TwitterApi } = require('twitter-api-v2');

// Configure Twitter client
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// The tweeting client
const rwClient = client.readWrite;

// Base URL for the website
const BASE_URL = 'https://trendiingz.com/posts/';

async function main() {
  try {
    // Path to articles directory
    const articlesDir = path.join(process.cwd(), 'content', 'articles');
    
    // Get all article files
    const articleFiles = fs.readdirSync(articlesDir).filter(file => file.endsWith('.md'));
    
    if (articleFiles.length === 0) {
      console.log('No article files found');
      return;
    }
    
    // Select a random article
    const randomArticle = articleFiles[Math.floor(Math.random() * articleFiles.length)];
    
    // Read the article file
    const articleContent = fs.readFileSync(path.join(articlesDir, randomArticle), 'utf8');
    
    // Extract title from the frontmatter
    const titleMatch = articleContent.match(/title: ["'](.+)["']/);
    let title = 'Check out our latest article';
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1];
    }
    
    // Create slug from filename (remove date and extension)
    const slug = randomArticle.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-/, '').replace(/\.md$/, '');
    
    // Construct the post URL
    const postUrl = `${BASE_URL}${slug}`;
    
    // Construct the tweet
    const tweet = `${title} ${postUrl}`;
    
    console.log(`Posting to Twitter: ${tweet}`);
    
    // Post to Twitter
    const response = await rwClient.v2.tweet(tweet);
    
    console.log('Tweet posted successfully:', response);
  } catch (error) {
    console.error('Error posting to Twitter:', error);
    process.exit(1);
  }
}

main(); 