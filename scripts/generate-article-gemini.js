require('dotenv').config();
/**
 * Gemini Article Generator
 * 
 * This script generates high-quality, viral, SEO-optimized articles using Google's Gemini API.
 * 
 * Fixed issues:
 * - Updated the API endpoint from v1beta to v1 to match current Gemini API requirements
 * - Fixed the model name to use gemini-1.5-flash for better content generation
 * - Improved content parsing with more flexible regex patterns to handle various response formats
 * - Enhanced error handling for API responses
 * - Used proper request structure with role:'user' in the content object
 * - Added support for multiple API keys with fallback mechanism
 * 
 * Usage:
 * - Generate article on specific topic: node scripts/generate-article-gemini.js "Topic"
 * - Generate trending article in category: node scripts/generate-article-gemini.js "" "Category"
 * - Generate random trending article: node scripts/generate-article-gemini.js
 */
const fetch = require("node-fetch");
const fs = require("fs").promises;
const path = require("path");
const apiKeyManager = require('./utils/api-key-manager');

// Constants
const UNSPLASH_API_URL = 'https://api.unsplash.com';
const GEMINI_MODEL = 'gemini-1.5-flash';
// const GEMINI_MODEL = 'gemini-2.0-flash';
// 'gemini-1.5-flash'; // Using Gemini 1.5 Flash for better content generation

// Logging System
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  SUCCESS: 2,
  WARN: 3,
  ERROR: 4
};

// Set current log level (change to DEBUG for more verbose logs)
const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL] : LOG_LEVELS.INFO;

// ANSI color codes for nicer terminal output
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m"
};

// Performance tracking
const perfTimers = {};

// Initialize logger with section support
const logger = {
  currentSection: null,
  
  // Start timing a specific operation
  startTimer: (label) => {
    perfTimers[label] = Date.now();
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.cyan}⏱ Started timer: ${label}${COLORS.reset}`);
    }
  },
  
  // End timing and log the duration
  endTimer: (label) => {
    if (!perfTimers[label]) {
      logger.warn(`Timer "${label}" doesn't exist`);
      return;
    }
    
    const duration = Date.now() - perfTimers[label];
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.cyan}⏱ ${label}: ${formatDuration(duration)}${COLORS.reset}`);
    }
    delete perfTimers[label];
    return duration;
  },
  
  // Start a new logging section (for better organization)
  startSection: (sectionName) => {
    logger.currentSection = sectionName;
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log(`\n${COLORS.bgBlue}${COLORS.white}${COLORS.bright} START: ${sectionName} ${COLORS.reset}\n`);
    }
  },
  
  // End a logging section
  endSection: () => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO && logger.currentSection) {
      console.log(`\n${COLORS.bgBlue}${COLORS.white}${COLORS.bright} END: ${logger.currentSection} ${COLORS.reset}\n`);
    }
    logger.currentSection = null;
  },
  
  // Log a debug message
  debug: (message) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.dim}${message}${COLORS.reset}`);
    }
  },
  
  // Log info message
  info: (message) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.blue}ℹ ${message}${COLORS.reset}`);
    }
  },
  
  // Log success message
  success: (message) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.SUCCESS) {
      console.log(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.green}✓ ${message}${COLORS.reset}`);
    }
  },
  
  // Log warning message
  warn: (message) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.log(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.yellow}⚠ ${message}${COLORS.reset}`);
    }
  },
  
  // Log error message
  error: (message, error = null) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.red}✖ ${message}${COLORS.reset}`);
      if (error && error.stack) {
        console.error(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.red}${error.stack}${COLORS.reset}`);
      } else if (error) {
        console.error(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.red}${error}${COLORS.reset}`);
      }
    }
  },
  
  // Log API request
  apiRequest: (endpoint, method = 'GET') => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.magenta}→ API ${method}: ${endpoint}${COLORS.reset}`);
    }
  },
  
  // Log API response
  apiResponse: (endpoint, status, size = null) => {
    const sizeText = size ? `(${formatSize(size)})` : '';
    if (status >= 200 && status < 300) {
      if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
        console.log(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.green}← API ${status}: ${endpoint} ${sizeText}${COLORS.reset}`);
      }
    } else {
      if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
        console.log(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.red}← API ${status}: ${endpoint} ${sizeText}${COLORS.reset}`);
      }
    }
  },
  
  // Progress indicator
  progress: (current, total, message = '') => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      const percent = Math.floor((current / total) * 100);
      const progressBar = '█'.repeat(Math.floor(percent / 2)) + '▒'.repeat(50 - Math.floor(percent / 2));
      process.stdout.write(`${COLORS.dim}[${new Date().toISOString()}]${COLORS.reset} ${COLORS.blue}${progressBar} ${percent}% ${message}${COLORS.reset}\r`);
      
      if (current === total) {
        process.stdout.write('\n');
      }
    }
  }
};

// Format file size in a human-readable way
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  const mb = kb / 1024;
  return mb.toFixed(1) + ' MB';
}

// Format duration in a human-readable way
function formatDuration(ms) {
  if (ms < 1000) return ms + 'ms';
  const sec = ms / 1000;
  if (sec < 60) return sec.toFixed(1) + 's';
  const min = sec / 60;
  return min.toFixed(1) + 'm';
}

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retry = async (fn, retries = 5, initialDelay = 1000, operationName = "operation") => {
    logger.debug(`Starting ${operationName} with up to ${retries} retries`);
    
    for (let i = 0; i < retries; i++) {
        try {
            logger.debug(`${operationName}: Attempt ${i + 1}/${retries}`);
            const result = await fn();
            if (i > 0) {
                logger.success(`${operationName} succeeded after ${i + 1} attempts`);
            } else {
                logger.debug(`${operationName} succeeded on first attempt`);
            }
            return result;
        } catch (error) {
            const isLastAttempt = i === retries - 1;
            const delay = initialDelay * Math.pow(2, i);
            
            if (isLastAttempt) {
                logger.error(`${operationName} failed after ${retries} attempts`, error);
                throw error;
            } else {
                logger.warn(`${operationName}: Attempt ${i + 1}/${retries} failed, retrying in ${delay/1000} seconds...`);
                logger.debug(`Error details: ${error.message}`);
                await sleep(delay);
            }
        }
    }
};

const sanitizeTitle = (text) => {
    // First, convert to lowercase and replace special characters
    const sanitized = text
        .toLowerCase()
        // Replace special characters with empty string
        .replace(/[^\w\s-]/g, '')
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Remove consecutive hyphens
        .replace(/-+/g, '-')
        .trim();
    
    // If title is still very long, trim it but preserve words
    if (sanitized.length > 100) {
        // Find the last hyphen within the first 100 chars
        const lastHyphenPos = sanitized.substring(0, 100).lastIndexOf('-');
        
        // If we found a hyphen, cut at that position, otherwise use 100 chars
        return lastHyphenPos > 50 ? sanitized.substring(0, lastHyphenPos) : sanitized.substring(0, 100);
    }
    
    return sanitized;
};

// Add multiple prompt templates function after the sanitizeTitle function
// This will give us variety in article styles and formats
function getRandomPromptTemplate(topic, title, seoKeywords) {
    // Default fallbacks if params are undefined
    const sanitizedTopic = topic || 'technology';
    const sanitizedTitle = title || `Guide to ${sanitizedTopic}`;
    
    // Handle seoKeywords properly
    let keywordsString = '';
    if (Array.isArray(seoKeywords) && seoKeywords.length > 0) {
        keywordsString = seoKeywords.join(', ');
    } else {
        // Fallback to a default set of keywords based on the topic
        keywordsString = `${sanitizedTopic}, ${sanitizedTopic} guide, ${sanitizedTopic} tutorial, ${sanitizedTopic} best practices`;
    }
    
    const promptTemplates = [
        // Templates 1-3 remain for reference but won't be used
        
        // TEMPLATE 4 - COMPREHENSIVE GUIDE WITH RICH VISUALS - THE PREFERRED TEMPLATE
        `You are an expert content writer specializing in creating highly engaging, comprehensive articles.

TOPIC: ${sanitizedTopic}

TITLE: ${sanitizedTitle}

Your task is to write an in-depth, SEO-optimized, long-form article on this topic. Make it extremely comprehensive, engaging, and valuable to readers. This article should be THE definitive guide on this subject.

KEY REQUIREMENTS:
- Begin with a compelling introduction that hooks the reader immediately
- Structure the article with clear, properly formatted ## section headings
- Include at least 5-7 distinct sections covering different aspects of the topic
- Create a practical, actionable guide that delivers real value
- Incorporate current data, trends, and industry insights where relevant
- Write in a conversational yet authoritative tone that connects with readers
- Aim for approximately 2000-2500 words of highly informative content
- Focus on unique insights not commonly found in other articles
- Optimize for SEO with the following keywords: ${keywordsString}
- Include at least 4-5 places where images should be inserted using [IMAGE] markers
- The Year now is 2025
- Make sure to not include any financial advice or investment recommendations

EXPECTED STRUCTURE:
1. Title (use exactly "${sanitizedTitle}")
2. Compelling introduction with clear value proposition
3. 5-7 main sections with descriptive ## headings
4. Practical examples, case studies, or applications
5. Latest trends or developments section
6. Common challenges and solutions
7. Expert tips and recommendations
8. Actionable conclusion with next steps

IMPORTANT FORMATTING GUIDELINES:
- Use proper Markdown formatting throughout for consistent rendering
- Structure content with a logical progression of ideas
- Use clean ## headings with descriptive titles for easy navigation
- Keep paragraphs concise and readable (3-5 sentences max)
- Never repeat content or ideas unnecessarily
- Ensure smooth transitions between sections for natural flow
- DO NOT include FAQ sections unless specifically relevant to the topic

SOCIAL_SNIPPET: Write a 1-2 sentence shareable quote from the article that would perform exceptionally well on social media – something genuinely thought-provoking or surprising.

ADVANCED FORMATTING (Make the article structure more impressive):
- Create custom callout boxes using > for important notes (e.g., "> **EXPERT TIP:** This is important...")
- Use advanced bullet formatting with emojis or symbols (e.g., "🔑", "⚡", "✅") for key points
- Include numbered steps with clear formatting when providing instructions (e.g., "**Step 1:** First...")
- Add "did you know" sections with fascinating facts that surprise readers
- Format comparisons as clear tables using markdown table syntax when appropriate
- Create visually distinct pros/cons sections with clear formatting
- Include a dedicated "Key Takeaways" or "Implementation Guide" section near the end
- End with a powerful conclusion and compelling call-to-action
- Ensure excellent readability with varied sentence structures, transitions, and flow`
    ];
    
    // Always return template 4 (which is the only template now)
    return promptTemplates[0];
}

// Viral headline patterns based on research
const viralHeadlinePatterns = [
    "X Ways to [Achieve Desired Outcome]",
    "How to [Solve Problem] in [Timeframe]",
    "The Ultimate Guide to [Topic]",
    "Why [Conventional Wisdom] Is Wrong About [Topic]",
    "X Secrets [Authority] Doesn't Want You to Know About [Topic]",
    "What Nobody Tells You About [Topic]",
    "X [Topic] Trends to Watch in [Year]",
    "The Future of [Topic]: X Predictions for [Year]",
    "X Things You Need to Know About [Recent Development]",
    "How [Person/Company] Achieved [Impressive Result] Using [Method]"
];

// Adding defaultImages constant for fallback images
const defaultImages = [
  {
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
    credit: { name: 'NASA', link: 'https://unsplash.com/@nasa' }
  },
  {
    url: 'https://images.unsplash.com/photo-1484417894907-623942c8ee29',
    credit: { name: 'NASA', link: 'https://unsplash.com/@nasa' }
  },
  {
    url: 'https://images.unsplash.com/photo-1517976487492-5750f3195933',
    credit: { name: 'NASA', link: 'https://unsplash.com/@nasa' }
  }
];

// Adding placeholders for different topic categories
const placeholders = {
  // Technology
  'AI': defaultImages,
  'Technology': defaultImages,
  'Blockchain': defaultImages,
  'Machine Learning': defaultImages,
  
  // Generic fallbacks for other categories
  'Business': defaultImages,
  'Science': defaultImages,
  'Health': defaultImages,
  'Education': defaultImages
};

// Trending topics by category for better relevance
const trendingTopics = {
  'Technology': ['AI Ethics', 'Web3', 'Metaverse', 'Machine Learning', 'Edge Computing', 'Quantum Computing'],
  'Business': ['Remote Work', 'Digital Transformation', 'Sustainable Business', 'Startup Culture', 'Economic Trends'],
  'Health': ['Biohacking', 'Mental Health Tech', 'Telemedicine', 'Personalized Medicine', 'Wellness Apps'],
  'Finance': ['Cryptocurrency', 'Decentralized Finance', 'ESG Investing', 'Fintech Revolution', 'Financial Independence'],
  'Entertainment': ['Streaming Wars', 'Creator Economy', 'Virtual Events', 'NFTs in Media', 'Social Audio'],
  'Science': ['Space Exploration', 'Climate Technologies', 'Genomics', 'Renewable Energy', 'Nanotechnology'],
  'Lifestyle': ['Digital Minimalism', 'Sustainable Living', 'Plant-Based Diets', 'Travel Technology', 'Smart Homes']
};

function getMultipleImages(topic, count = 3) {
  // Try to get real images from Unsplash first
  return searchUnsplashImages(topic, count)
    .then(images => {
      if (images && images.length > 0) {
        logger.success(`Successfully retrieved ${images.length} Unsplash images for topic: ${topic}`);
        // Just return the URLs from the image objects
        return images.map(image => getOptimizedImageUrl(image.url));
      } else {
        // Fall back to placeholder images if Unsplash fails
        logger.warn(`Failed to get Unsplash images for ${topic}, using placeholder images instead`);
        const categoryImages = placeholders[topic] || defaultImages;
        // Return URLs from placeholder image objects
        return categoryImages.slice(0, count).map(img => getOptimizedImageUrl(img.url || img));
      }
    })
    .catch(error => {
      logger.error(`Error fetching images: ${error.message}`);
      // Return placeholder images in case of error
      const categoryImages = placeholders[topic] || defaultImages;
      return categoryImages.slice(0, count).map(img => getOptimizedImageUrl(img.url || img));
    });
}

// Modify the searchUnsplashImages function to use the API key manager
async function searchUnsplashImages(query, count = 1) {
  if (!query) {
    logger.warn('Unsplash search query is empty');
    return [];
    }

    try {
    logger.debug(`Searching Unsplash for: "${query}", count: ${count}`);
    
    // Use the API key manager for the request instead of direct API key
    const searchEndpoint = `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}`;
    
    // Use API key manager to make the request with automatic key rotation and fallback
    const response = await apiKeyManager.makeUnsplashRequest(searchEndpoint);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      logger.debug(`Found ${data.results.length} images on Unsplash for query: "${query}"`);
      
      // Format the results into a more usable structure
      return data.results.map(image => ({
        id: image.id,
        url: image.urls.regular,
        thumb: image.urls.thumb,
        description: image.description || image.alt_description || query,
            credit: {
          name: image.user.name,
          username: image.user.username,
          link: image.user.links.html
            }
        }));
    } else {
      logger.warn(`No images found on Unsplash for query: "${query}"`);
      return [];
    }
    } catch (error) {
    logger.error(`Unsplash search error for query "${query}":`, error);
    return [];
    }
}

// Helper function to optimize image URLs
function getOptimizedImageUrl(url) {
    if (!url) return '';
    
    // Parse the URL to handle both regular and already-optimized URLs
    const baseUrl = url.split('?')[0];
    
    // Add Unsplash optimization parameters
    const params = new URLSearchParams({
        'q': '85',          // Quality (85% is a good balance)
        'w': '1200',        // Max width
        'fit': 'max',       // Maintain aspect ratio
        'fm': 'webp',       // Use WebP format for better compression
        'auto': 'compress'  // Enable automatic compression
    });
    
    return `${baseUrl}?${params.toString()}`;
}

// Generate a title from a topic when one can't be extracted from Gemini's response
function generateTitle(topic) {
    console.log('Generating a title for:', topic);
    
    // Clean up topic formatting
    const cleanTopic = topic.replace(/^\w+:\s*/, '').trim();
    
    // Create engaging title patterns with the topic - now with more variety and fewer numbered lists
    const titleTemplates = [
        // Direct titles that preserve the user's topic
        `${cleanTopic}`,
        `${cleanTopic}: A Comprehensive Analysis`,
        `Understanding ${cleanTopic} in Today's World`,
        
        // Question-based titles
        `What Makes ${cleanTopic} So Important in 2025?`,
        `Is ${cleanTopic} Right for You? The Complete Guide`,
        `How Does ${cleanTopic} Impact Our Future?`,
        
        // Statement titles
        `The Essential Guide to ${cleanTopic}`,
        `Why ${cleanTopic} Matters More Than Ever`,
        `${cleanTopic}: Myths vs. Reality`,
        `${cleanTopic} Explained: Everything You Need to Know`,
        
        // "How" titles
        `How ${cleanTopic} Is Reshaping Our World`,
        `How to Master ${cleanTopic}: Expert Strategies`,
        `How ${cleanTopic} Will Change in the Next Decade`,
        
        // Numbered lists (now less frequent in the mix)
        `5 Things You Should Know About ${cleanTopic}`,
        `3 Revolutionary Aspects of ${cleanTopic}`,
        `4 Ways ${cleanTopic} Is Transforming Industries`
    ];
    
    // Select a random title template with preference for direct titles
    // If the topic itself is already a good title (30-70 chars), give it a 50% chance to be used directly
    if (cleanTopic.length >= 30 && cleanTopic.length <= 70 && Math.random() > 0.5) {
        console.log('Using direct topic as title:', cleanTopic);
        return cleanTopic;
    }
    
    // Otherwise select from templates
    const randomIndex = Math.floor(Math.random() * titleTemplates.length);
    const generatedTitle = titleTemplates[randomIndex];
    
    console.log('Generated title:', generatedTitle);
    return generatedTitle;
}

// Modify the getFeaturedImage function to use the API key manager
async function getFeaturedImage(topic, keywords) {
  logger.startSection('Featured Image Selection');
  logger.startTimer('featured-image');
  
  try {
    // Try to get a relevant image based on the topic
    const searchTerm = topic.trim();
    
    if (!searchTerm) {
      logger.warn('Empty search term for featured image');
      return null;
    }
    
    logger.info(`Searching for featured image with terms: "${searchTerm}"`);
    
    // Try with the topic name first
    let images = await searchUnsplashImages(searchTerm, 5);
    
    // If no results, try with combined keywords
    if (images.length === 0 && keywords && keywords.length > 0) {
      const keywordSearch = keywords.slice(0, 3).join(' ');
      logger.info(`No images found with topic name, trying with keywords: "${keywordSearch}"`);
      images = await searchUnsplashImages(keywordSearch, 5);
    }
    
    // If still no results, try with a more generic term
    if (images.length === 0) {
      const genericTerm = 'article background concept';
      logger.info(`No images found with keywords, trying generic search: "${genericTerm}"`);
      images = await searchUnsplashImages(genericTerm, 5);
    }
    
    if (images.length > 0) {
      // Pick a random image from the results to add variety
      const randomIndex = Math.floor(Math.random() * images.length);
      const selectedImage = images[randomIndex];
      
      logger.success(`Selected featured image: ${selectedImage.url}`);
      
      const optimizedUrl = getOptimizedImageUrl(selectedImage.url);
      logger.debug(`Optimized image URL: ${optimizedUrl}`);
      
            return {
        url: optimizedUrl,
        alt: selectedImage.description,
        credit: selectedImage.credit
      };
    } else {
      logger.warn('Could not find any suitable images');
        return null;
    }
    } catch (error) {
    logger.error('Error getting featured image:', error);
        return null;
  } finally {
    logger.endTimer('featured-image');
    logger.endSection();
    }
}

// Create SEO-friendly slugs from titles - improve to preserve more of the title
function createSlug(title) {
    // Step 1: Convert to lowercase and remove special characters
    let slug = title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim();
    
    // Step 2: Keep more of the title for better SEO and readability
    // Remove common "stop words" that don't add SEO value
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as'];
    
    // Split into words
    let words = slug.split(/\s+/);
    
    // If we have a very long title, keep more important words
    if (words.length > 12) {
        // Filter out stop words if we can maintain at least 8 words
        const filteredWords = words.filter(word => !stopWords.includes(word));
        
        // Only use filtered words if we still have enough for a good slug
        if (filteredWords.length >= 8) {
            words = filteredWords;
        }
        
        // Either way, limit to first 12 words for reasonable length but preserve more meaning
        words = words.slice(0, 12);
    }
    
    // Step 3: Join with hyphens and clean up consecutive hyphens
    slug = words.join('-').replace(/-+/g, '-');
    
    return slug;
}

// Add a function to get existing articles from content directory
async function getExistingArticles() {
    try {
        const articlesDir = path.join(process.cwd(), 'content', 'articles');
        const files = await fs.readdir(articlesDir);
        
        // Get the metadata from the first 20 markdown files
        const articles = await Promise.all(
            files
                .filter(file => file.endsWith('.md'))
                .slice(0, 20)
                .map(async file => {
                    const content = await fs.readFile(path.join(articlesDir, file), 'utf8');
                    
                    // Extract title and slug from frontmatter
                    const titleMatch = content.match(/title:\s*"([^"]+)"/);
                    const slugMatch = content.match(/slug:\s*"([^"]+)"/);
                    
                    if (titleMatch && slugMatch) {
                        return {
                            title: titleMatch[1],
                            slug: slugMatch[1]
                        };
                    }
                    return null;
                })
        );
        
        // Filter out nulls and return
        return articles.filter(Boolean);
    } catch (error) {
        console.error('Error fetching existing articles:', error);
        return [];
    }
}

// Function to mix existing and generated article suggestions
function mixArticleSuggestions(existingArticles, generatedTopics, currentSlug, count = 5) {
    // Remove any articles with the same slug as current article
    const filteredExisting = existingArticles.filter(article => article.slug !== currentSlug);
    
    // Shuffle existing articles
    const shuffledExisting = filteredExisting.sort(() => 0.5 - Math.random());
    
    // Take some existing articles (about 60% of the count)
    const existingCount = Math.min(Math.ceil(count * 0.6), shuffledExisting.length);
    const selectedExisting = shuffledExisting.slice(0, existingCount);
    
    // Take some generated topics (about 40% of the count)
    const remainingCount = count - selectedExisting.length;
    const selectedGenerated = generatedTopics.slice(0, remainingCount);
    
    // Mix them together randomly
    const combined = [...selectedExisting, ...selectedGenerated];
    return combined.sort(() => 0.5 - Math.random());
}

/**
 * Generate categories for the article using Gemini API
 */
async function generateCategories(topic, keywords = [], customCategories = null, exactCategoryParam = null) {
    logger.info('Generating categories...');
    
    // Clean up the topic if it contains command-line artifacts
    topic = topic.replace(/^--topic=?/, '');
    
    // Check for Gemini API key using API Key Manager
    const geminiApiKey = apiKeyManager.getGeminiApiKey();
    if (!geminiApiKey) {
        logger.warn('No Gemini API key found. Using fallback category generation.');
        return fallbackCategoryGeneration(topic, keywords, null, exactCategoryParam);
    }
    
    // Extract main topic with improved handling for phrases
    let mainTopic = topic.split(':')[0].trim();
    logger.debug(`Extracted main topic: "${mainTopic}"`);
    
    // Handle phrases like "the soccer game" -> "soccer"
    // Remove common articles and filler words
    mainTopic = mainTopic.replace(/^(the|a|an)\s+/i, '');
    
    // For phrases with multiple words, extract the most significant noun
    // This simple approach takes the first word that's not a common descriptor/adjective
    if (mainTopic.includes(' ')) {
        const words = mainTopic.split(' ');
        const fillerWords = ['game', 'story', 'guide', 'tutorial', 'analysis', 'overview', 'review'];
        
        // Try to find a word that's not in the filler list
        const significantWord = words.find(word => !fillerWords.includes(word.toLowerCase()));
        
        // If found, use it as the main topic
        if (significantWord) {
            mainTopic = significantWord;
        }
    }
    
    // Use the provided category or main topic as the exact match category
    const exactCategory = exactCategoryParam ? 
        (exactCategoryParam.charAt(0).toUpperCase() + exactCategoryParam.slice(1).toLowerCase()) : 
        (mainTopic.charAt(0).toUpperCase() + mainTopic.slice(1).toLowerCase());
    
    // If custom categories are provided, use them
    if (customCategories && customCategories.length > 0) {
        // Format custom categories to the expected structure
        return customCategories.map((cat, index) => {
            // Determine the category type based on position
            let type;
            if (cat.toLowerCase() === exactCategory.toLowerCase()) {
                type = "exact";
            } else if (index < 2) {
                type = "general";
            } else if (index === 2) {
                type = "medium";
            } else if (index === 3) {
                type = "specific";
            } else {
                type = "niche";
            }
            
            return { type, name: cat };
        });
    }
    
    // Prepare the prompt for generating categories
    const categoriesPrompt = `
    Generate exactly 4 categories for an article about "${topic}" that are distinct from "${exactCategory}".
    
    Each category should have a different specificity level:
    1. One "general" category: Broad field or industry (e.g., "Technology", "Science", "Business")
    2. One "medium" specificity category: More focused field within the general category (e.g., "Software Development", "Quantum Physics", "Digital Marketing")
    3. One "specific" category: Specific technology, method, or area related to the topic (e.g., "Cloud Computing", "Particle Acceleration", "Social Media Analytics")
    4. One "niche" category: Highly specific subtopic, technique or specialized area within the specific category (e.g., "Serverless Architecture", "Hadron Collision", "Instagram Algorithm")

    RULES:
    - All categories MUST BE DISTINCT from each other and from "${exactCategory}"
    - DO NOT use "${exactCategory}" as any of the categories
    - Each category should be 1-3 words, clear and concise
    - Each category should be relevant to "${topic}"
    - Return ONLY the categories as a JSON array of strings with NO explanation
    - Do not use quotes within category names
    - Format: ["General Category", "Medium Category", "Specific Category", "Niche Category"]
    `;

    try {
        // Set up the request configuration
        const genConfig = {
            temperature: 0.2,
            maxOutputTokens: 1024,
            topP: 0.8,
            topK: 40,
        };
        
        // Make the API call to Gemini
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{
                        text: categoriesPrompt
                    }]
                }],
                generationConfig: genConfig
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();

        // Check if the response has the expected structure
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0] || !data.candidates[0].content.parts[0].text) {
            throw new Error('Invalid API response structure');
        }

        const categoriesText = data.candidates[0].content.parts[0].text;
        console.log('Categories text from Gemini:', categoriesText);

        // Extract JSON array from response text (clean up text to handle any formatting issues)
        const jsonMatch = categoriesText.match(/\[\s*".*"\s*\]/s);
        if (!jsonMatch) {
            throw new Error('Could not extract JSON array from response');
        }

        // Parse the JSON array
        const categoriesArray = JSON.parse(jsonMatch[0]);
        console.log('Parsed categories array:', categoriesArray);

        if (!Array.isArray(categoriesArray) || categoriesArray.length !== 4) {
            throw new Error('Invalid categories array format or length');
        }

        // Map the categories to the expected structure with types
        const mappedCategories = [
            { type: "exact", name: exactCategory },
            { type: "general", name: categoriesArray[0] },
            { type: "medium", name: categoriesArray[1] },
            { type: "specific", name: categoriesArray[2] },
            { type: "niche", name: categoriesArray[3] }
        ];

        // Check for duplicates and replace if needed
        const categoryNames = new Set();
        categoryNames.add(exactCategory.toLowerCase());
        
        return mappedCategories.map(category => {
            // Keep the exact category as is
            if (category.type === "exact") {
                return category;
            }
            
            // If the category is a duplicate, try to generate an alternative
            if (categoryNames.has(category.name.toLowerCase())) {
                // Generate an alternative based on the category type
                if (category.type === "general") {
                    category.name = "Digital Trends";
                } else if (category.type === "medium") {
                    category.name = keywords.length > 0 ? `${keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1)} Developments` : "Innovative Solutions";
                } else if (category.type === "specific") {
                    category.name = keywords.length > 1 ? `${keywords[1].charAt(0).toUpperCase() + keywords[1].slice(1)} Techniques` : "Implementation Methods";
                } else if (category.type === "niche") {
                    category.name = keywords.length > 2 ? `Advanced ${keywords[2].charAt(0).toUpperCase() + keywords[2].slice(1)}` : "Specialized Approaches";
                }
            }
            
            // Add the new category to the set
            categoryNames.add(category.name.toLowerCase());
            return category;
        });

        logger.success(`Generated ${mappedCategories.length} categories`);
        logger.endTimer('category_generation');
        logger.endSection();
        return mappedCategories;
    } catch (error) {
        logger.error('Error generating categories:', error);
        logger.warn('Falling back to simpler category generation');
        logger.endTimer('category_generation');
        logger.endSection();
        // Use fallback category generation if API call fails
        return fallbackCategoryGeneration(topic, keywords, null, exactCategoryParam);
    }
}

// Fallback category generation if API call fails
function fallbackCategoryGeneration(topic, keywords, mainTopicParam, categoryParam) {
    logger.startSection('Fallback Category Generation');
    logger.info('Using fallback category generation');
    
    // Clean up the topic if it contains command-line artifacts
    topic = topic.replace(/^--topic=?/, '');
    
    // Extract main topic and subtopics
    let mainTopic = mainTopicParam || topic.split(':')[0].trim().toLowerCase();
    let subTopic = topic.includes(':') ? topic.split(':')[1].trim() : topic;
    
    logger.debug(`Main topic: "${mainTopic}", Subtopic: "${subTopic}"`);
    
    // Format mainTopic with proper capitalization
    mainTopic = mainTopic.charAt(0).toUpperCase() + mainTopic.slice(1).toLowerCase();
    
    // Use the provided category as the exact category
    const exactCategory = categoryParam ? 
        (categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1).toLowerCase()) : 
        mainTopic;
    
    // Get topic words for other categories
    const topicWords = mainTopic.split(' ')
        .filter(word => word.length > 3)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    
    // Get subtopic words if available
    const subtopicWords = subTopic.split(' ')
        .filter(word => word.length > 3 && word.toLowerCase() !== mainTopic.toLowerCase())
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    
    // Create a mapping of topic to category type
    const categoryMap = {
        // Technology-related categories
        "technology": { general: "Digital Innovation", medium: "Emerging Tech", specific: "Tech Applications", niche: "Tech Integration" },
        "tech": { general: "Digital Innovation", medium: "Emerging Tech", specific: "Tech Applications", niche: "Tech Integration" },
        "ai": { general: "Technology", medium: "Artificial Intelligence", specific: "Machine Learning", niche: "Neural Networks" },
        "programming": { general: "Technology", medium: "Software Development", specific: "Coding Languages", niche: "Algorithm Design" },
        
        // Nature-related categories
        "nature": { general: "Environment", medium: "Ecosystems", specific: "Wildlife Conservation", niche: "Biodiversity" },
        "animals": { general: "Wildlife", medium: "Animal Behavior", specific: "Species Conservation", niche: "Animal Communication" },
        "dogs": { general: "Animals", medium: "Canine Behavior", specific: "Dog Training", niche: "Breed Characteristics" },
        "cats": { general: "Animals", medium: "Feline Behavior", specific: "Cat Health", niche: "Feline Psychology" },
        
        // Business-related categories
        "business": { general: "Entrepreneurship", medium: "Business Strategy", specific: "Startup Culture", niche: "Business Innovation" },
        "finance": { general: "Economics", medium: "Financial Planning", specific: "Investment Strategies", niche: "Market Analysis" },
        "marketing": { general: "Business", medium: "Digital Marketing", specific: "Content Strategy", niche: "Conversion Optimization" },
        
        // Sports-related categories
        "sports": { general: "Athletics", medium: "Sports Performance", specific: "Training Methods", niche: "Elite Performance" },
        "basketball": { general: "Sports", medium: "Team Sports", specific: "Basketball Strategy", niche: "Player Development" },
        "football": { general: "Sports", medium: "Team Sports", specific: "Football Strategy", niche: "Player Development" },
        
        // Health-related categories
        "health": { general: "Wellness", medium: "Healthcare", specific: "Preventive Medicine", niche: "Health Optimization" },
        "fitness": { general: "Health", medium: "Physical Training", specific: "Exercise Science", niche: "Athletic Performance" },
        "nutrition": { general: "Health", medium: "Diet", specific: "Nutrient Optimization", niche: "Dietary Supplements" },
        
        // Default categories
        "default": { general: "Knowledge", medium: "Education", specific: "Learning Methods", niche: "Expert Insights" }
    };
    
    // Find the best category match
    const lowerTopic = mainTopic.toLowerCase();
    let categorySet = categoryMap.default;
    
    // Try to find a direct match first
    for (const [key, value] of Object.entries(categoryMap)) {
        if (lowerTopic.includes(key)) {
            categorySet = value;
            break;
        }
    }
    
    // Create the categories, ensuring no duplicates with the exact category
    const generalCategory = categorySet.general !== exactCategory ? 
        categorySet.general : "Knowledge Sharing";
    
    const mediumCategory = categorySet.medium !== exactCategory && categorySet.medium !== generalCategory ? 
        categorySet.medium : (subtopicWords.length > 0 ? `${subtopicWords[0]} Insights` : "Practical Applications");
    
    const specificCategory = categorySet.specific !== exactCategory && 
                             categorySet.specific !== generalCategory && 
                             categorySet.specific !== mediumCategory ? 
        categorySet.specific : (keywords.length > 0 ? `${keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1)} Strategies` : "Implementation Techniques");
    
    const nicheCategory = categorySet.niche !== exactCategory && 
                          categorySet.niche !== generalCategory && 
                          categorySet.niche !== mediumCategory && 
                          categorySet.niche !== specificCategory ? 
        categorySet.niche : (keywords.length > 1 ? `Advanced ${keywords[1].charAt(0).toUpperCase() + keywords[1].slice(1)}` : "Expert Methodologies");
    
    const categories = [
        {"type": "exact", "name": exactCategory},
        {"type": "general", "name": generalCategory},
        {"type": "medium", "name": mediumCategory},
        {"type": "specific", "name": specificCategory},
        {"type": "niche", "name": nicheCategory}
    ];
    
    logger.success(`Generated ${categories.length} fallback categories`);
    logger.debug(`Categories: ${categories.map(c => c.name).join(', ')}`);
    logger.endSection();
    
    return categories;
}

// Modify the processArticleContent function to support displaying categories
async function processArticleContent(content, title, keywords = [], topic = '', slug = '') {
    // Create a cleaner, more formatted version of the content
    let processedContent = content;
    
    // 1. Extract title, social_snippet and excerpt (if provided in the format)
    const titleMatch = processedContent.match(/^#\s+(.+)$/m) || processedContent.match(/^TITLE:\s*(.+)$/m);
    const excerptMatch = processedContent.match(/^EXCERPT:\s*(.+?)(?:\n|$)/m) || processedContent.match(/^META_DESCRIPTION:\s*(.+?)(?:\n|$)/m);
    const socialMatch = processedContent.match(/^SOCIAL_SNIPPET:\s*(.+?)(?:\n|$)/m) || 
                        processedContent.match(/^\*\*SOCIAL_SNIPPET:\*\*\s*(.+?)(?:\n|$)/m);

    // Remove these markers if they exist
    if (titleMatch) processedContent = processedContent.replace(/^#\s+(.+)$/m, '').replace(/^TITLE:\s*(.+)$/m, '');
    if (excerptMatch) processedContent = processedContent.replace(/^EXCERPT:\s*(.+?)(?:\n|$)/m, '').replace(/^META_DESCRIPTION:\s*(.+?)(?:\n|$)/m, '');
    if (socialMatch) {
        processedContent = processedContent.replace(/^SOCIAL_SNIPPET:\s*(.+?)(?:\n|$)/m, '')
                                          .replace(/^\*\*SOCIAL_SNIPPET:\*\*\s*(.+?)(?:\n|$)/m, '');
    }
    
    // 2. Clean up whitespace and ensure consistent headings
    processedContent = processedContent.replace(/\n{3,}/g, '\n\n'); // Replace multiple line breaks with double line breaks
    
    // FIX: Don't convert all top-level headings to h2 if they're already well-formatted
    if (!processedContent.match(/^##\s+/m)) {
        processedContent = processedContent.replace(/^#\s+/gm, '## '); // Convert any top-level heading to h2
    }
    
    // FIX: Remove duplicate title heading if it exists
    // Check if the content starts with a heading that matches the title
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex chars
    const titleRegex = new RegExp(`^## \\s*${escapedTitle}\\s*$`, 'mi');
    if (titleRegex.test(processedContent)) {
        // Remove the duplicate title heading and any empty lines that follow
        processedContent = processedContent.replace(titleRegex, '').replace(/^\s+/, '');
    }
    
    // FIX: Also check for variations of the title with different formatting
    const simplifiedTitle = title.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const titleHeadings = processedContent.match(/^##\s+(.+)$/gm) || [];
    for (const heading of titleHeadings) {
        // Extract just the heading text
        const headingText = heading.replace(/^##\s+/, '');
        const simplifiedHeading = headingText.toLowerCase().replace(/[^\w\s]/g, '').trim();
        
        // If heading is very similar to title (>80% similar), remove it
        if (simplifiedHeading.includes(simplifiedTitle) || 
            simplifiedTitle.includes(simplifiedHeading) || 
            levenshteinDistance(simplifiedHeading, simplifiedTitle) / Math.max(simplifiedHeading.length, simplifiedTitle.length) < 0.2) {
            processedContent = processedContent.replace(heading, '').replace(/^\s+/, '');
            break; // Only remove the first occurrence
        }
    }
    
    // Handle [IMAGE] markers with actual images (improved approach)
    try {
        // Get images for the topic or keywords - request more images to ensure we have enough
        const images = await getMultipleImages(topic || keywords.join(' ') || title, 10); // Request 10 images
        let imageIndex = 0;
        let replacedImages = 0;
        
        // Replace [IMAGE] markers with actual images - handle complex caption formats
        processedContent = processedContent.replace(/\[IMAGE(?::\s*([^\]]+))?\](?:\s*Caption:\s*([^\n]+))?/g, (match, inlineCaption, nextLineCaption) => {
            if (imageIndex < images.length) {
                const image = images[imageIndex++];
                replacedImages++;
                // Use any provided caption text, prioritizing nextLineCaption over inlineCaption
                const captionText = nextLineCaption || inlineCaption || `${topic || 'Web design'} visualization`;
                return `![${captionText}](${image})`;
            }
            return ''; // Remove the marker if we run out of images
        });
        
        // Also handle detailed image descriptions in square brackets
        processedContent = processedContent.replace(/\[IMAGE:\s*([^\]]+)\]/g, (match, description) => {
            if (imageIndex < images.length) {
                const image = images[imageIndex++];
                replacedImages++;
                return `![${description}](${image})`;
            }
            return ''; // Remove the marker if we run out of images
        });
        
        // If we have fewer than 3 images in the article and more images available, add some additional images
        const existingImageCount = (processedContent.match(/!\[.*?\]\(.*?\)/g) || []).length;
        if (existingImageCount < 3 && imageIndex < images.length) {
            // Find appropriate places to add images - after paragraphs
            const paragraphs = processedContent.split('\n\n');
            for (let i = 1; i < paragraphs.length && existingImageCount + replacedImages < 3 && imageIndex < images.length; i += 2) {
                // Add an image after every other paragraph if it doesn't already have an image
                if (!paragraphs[i].includes('![') && imageIndex < images.length) {
                    const image = images[imageIndex++];
                    replacedImages++;
                    paragraphs[i] = paragraphs[i] + '\n\n' + 
                        `![Additional visual for ${topic || keywords[0] || title}](${image})`;
                }
            }
            processedContent = paragraphs.join('\n\n');
        }
        
        logger.info(`Added ${replacedImages} images to the article content`);
    } catch (error) {
        logger.error(`Error processing images: ${error.message}`);
        // If image processing fails, keep the [IMAGE] markers as-is
    }
    
    return processedContent;
}

// Function to generate related topic suggestions based on the article title and keywords
function generateRelatedTopics(title, keywords = [], count = 5) {
    // Extract the main topic from the title
    const mainTopic = title.replace(/^\d+\s+|\s+\d+$|\s+(ways|steps|tips|hacks|secrets|insights).*$/i, '').trim();
    
    // Create categories of interesting topics that are genuinely different
    const relatedCategories = {
        'controversial': [
            'The Dark Side of ' + mainTopic + ' Nobody Talks About',
            'Why ' + mainTopic + ' Critics Might Actually Be Right',
            mainTopic + ': Debunking Popular Myths',
            'The Ethical Dilemmas Behind ' + mainTopic,
            'Is ' + mainTopic + ' Really Worth the Hype?'
        ],
        'futuristic': [
            'How ' + mainTopic + ' Will Look in 2030',
            'Revolutionary Breakthroughs Changing ' + mainTopic,
            'The Next Generation of ' + mainTopic + ' Technology',
            'Will AI Replace Humans in ' + mainTopic + '?',
            mainTopic + ' in the Age of Quantum Computing'
        ],
        'historical': [
            'The Forgotten History of ' + mainTopic,
            'How ' + mainTopic + ' Changed the World',
            'The Pioneers Who Revolutionized ' + mainTopic,
            mainTopic + ': From Ancient Times to Today',
            'The Unexpected Origins of ' + mainTopic
        ],
        'practical': [
            'How to Apply ' + mainTopic + ' Principles to Daily Life',
            'Building a Career in ' + mainTopic + ' Without a Degree',
            mainTopic + ' for Beginners: A Practical Approach',
            'DIY ' + mainTopic + ': Getting Started on a Budget',
            'Real-World Success Stories Using ' + mainTopic
        ],
        'cultural': [
            'How Different Cultures Approach ' + mainTopic,
            mainTopic + ' Around the World: Cultural Perspectives',
            'The Social Impact of ' + mainTopic + ' on Communities',
            'How ' + mainTopic + ' is Portrayed in Movies and TV',
            mainTopic + ' and Its Influence on Modern Society'
        ]
    };

    // Select one topic from each category to ensure diversity
    let relatedArticles = [];
    const categories = Object.keys(relatedCategories);
    
    // Shuffle the categories for variety
    const shuffledCategories = categories.sort(() => 0.5 - Math.random());
    
    // Pick from different categories first
    for (const category of shuffledCategories) {
        const options = relatedCategories[category];
        const randomIndex = Math.floor(Math.random() * options.length);
        relatedArticles.push(options[randomIndex]);
        
        if (relatedArticles.length >= count) break;
    }
    
    // If we need more, combine keywords with interesting angles
    if (relatedArticles.length < count && keywords.length > 0) {
        const significantKeywords = keywords
            .filter(k => k.length > 3 && !mainTopic.toLowerCase().includes(k.toLowerCase()))
            .slice(0, 3);
            
        const keywordTemplates = [
            'The Connection Between ' + mainTopic + ' and ' + significantKeywords[0],
            'Why ' + significantKeywords[0] + ' Experts Are Excited About ' + mainTopic,
            'Combining ' + mainTopic + ' with ' + significantKeywords[0] + ': The Next Big Trend'
        ];
        
        // Add keyword-based topics if we have meaningful keywords
        if (significantKeywords.length > 0) {
            for (const template of keywordTemplates) {
                if (relatedArticles.length < count) {
                    relatedArticles.push(template);
                }
            }
        }
    }
    
    // Return the requested number of related topics (should be diverse)
    return relatedArticles.slice(0, count);
}

// Function to generate "Articles on Demand" suggestions
function generateOnDemandTopics(title, keywords = [], count = 3) {
    // Extract the main topic from the title
    const mainTopic = title.replace(/^\d+\s+|\s+\d+$|\s+(ways|steps|tips|hacks|secrets|insights).*$/i, '').trim();
    
    // Unique and genuinely interesting topic categories
    const diverseTopicCategories = {
        'surprising': [
            mainTopic + ' in Surprising Industries You Wouldn\'t Expect',
            'Unusual Applications of ' + mainTopic + ' That Actually Work',
            'The Strangest ' + mainTopic + ' Stories You\'ll Ever Hear',
            mainTopic + ' Experiments That Changed Everything'
        ],
        'contrarian': [
            'Why Everything You Know About ' + mainTopic + ' Is Wrong',
            'The Case Against ' + mainTopic + ': Valid Points to Consider',
            'Why ' + mainTopic + ' Skeptics Deserve to Be Heard',
            'Common ' + mainTopic + ' Advice That May Be Harmful'
        ],
        'transformative': [
            'How ' + mainTopic + ' Changed My Life Completely',
            'Personal Transformations Through ' + mainTopic,
            mainTopic + ' as a Path to Self-Discovery',
            'Life Lessons Learned from ' + mainTopic + ' Masters'
        ],
        'creative': [
            'Reimagining ' + mainTopic + ' Through an Artist\'s Lens',
            'Creative ' + mainTopic + ' Projects That Inspire',
            'The Art and Science of ' + mainTopic + ' Combined',
            mainTopic + ' as a Form of Personal Expression'
        ],
        'scientific': [
            'The Brain Science Behind ' + mainTopic + ' Success',
            'Studies That Completely Changed How We See ' + mainTopic,
            'Scientific Breakthroughs in ' + mainTopic + ' Research',
            'What Neuroscience Reveals About ' + mainTopic
        ],
        'philosophical': [
            'The Philosophy of ' + mainTopic + ': Deeper Questions',
            'Existential Aspects of ' + mainTopic + ' in Modern Life',
            mainTopic + ' and the Search for Meaning',
            'Philosophical Paradoxes in ' + mainTopic + ' Theory'
        ]
    };
    
    // Select from diverse categories to ensure variety
    let suggestions = [];
    
    // Get all category keys and shuffle them
    const categories = Object.keys(diverseTopicCategories);
    const shuffledCategories = categories.sort(() => 0.5 - Math.random());
    
    // Pick from each category for maximum diversity
    shuffledCategories.forEach(category => {
        if (suggestions.length < count) {
            const options = diverseTopicCategories[category];
            const selectedTopic = options[Math.floor(Math.random() * options.length)];
            
            // Only add if it's not too similar to something we already have
            const isTooSimilar = suggestions.some(existing => 
                similarity(existing.toLowerCase(), selectedTopic.toLowerCase()) > 0.6
            );
            
            if (!isTooSimilar) {
                suggestions.push(selectedTopic);
            }
        }
    });
    
    // If we still need more topics, create some by combining keywords in interesting ways
    if (suggestions.length < count && keywords.length > 0) {
        const keywordsToUse = keywords
            .filter(k => k.length > 3 && !mainTopic.toLowerCase().includes(k.toLowerCase()))
            .slice(0, 3);
            
        if (keywordsToUse.length > 0) {
            const additionalIdeas = [
                'The Unexpected Relationship Between ' + keywordsToUse[0] + ' and ' + mainTopic,
                'How ' + keywordsToUse[0] + ' Is Disrupting Traditional ' + mainTopic,
                mainTopic + ' Through the Lens of ' + keywordsToUse[0]
            ];
            
            // Add these additional ideas until we reach our target count
            for (const idea of additionalIdeas) {
                if (suggestions.length < count) {
                    suggestions.push(idea);
                }
            }
        }
    }
    
    // Ensure we have enough topics
    while (suggestions.length < count) {
        // Choose a random category and add a topic from it
        const randomCategory = shuffledCategories[Math.floor(Math.random() * shuffledCategories.length)];
        const options = diverseTopicCategories[randomCategory];
        const randomTopic = options[Math.floor(Math.random() * options.length)];
        
        // Only add if not already in the list
        if (!suggestions.includes(randomTopic)) {
            suggestions.push(randomTopic);
        }
    }
    
    return suggestions.slice(0, count);
}

// Helper function to calculate text similarity (simple version)
function similarity(s1, s2) {
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    // Count common words
    const commonWords = words1.filter(word => words2.includes(word)).length;
    
    // Calculate similarity ratio
    return commonWords / Math.max(words1.length, words2.length);
}

// Modify the generateArticle function to use the API key manager for Gemini API
async function generateArticle(topic, retryCount = 0) {
  logger.startSection('Article Generation');
  logger.startTimer('total-generation');
  
  try {
    if (!topic) {
      logger.error('Topic is required');
      return null;
    }
    
    logger.info(`Generating article for topic: "${topic}"`);
    
    // Generate a title for the article using Gemini
    const title = await retry(
      () => generateTitle(topic),
      3,
      1000,
      'Title generation'
    );
    
    if (!title) {
      logger.error('Failed to generate title');
      return null;
    }
    
    logger.success(`Generated title: "${title}"`);
    
    // Create a slug from the title
    const slug = createSlug(title);
    logger.info(`Generated slug: "${slug}"`);
    
    // Generate SEO keywords for the article
    let seoKeywords = await retry(
      () => generateSEOKeywords(topic),
      3,
      1000,
      'Keyword generation'
    );
    
    if (!seoKeywords || seoKeywords.length === 0) {
      logger.warn('No keywords generated, using fallback');
      seoKeywords = [topic];
    }
    
    logger.info(`Generated keywords: ${seoKeywords.join(', ')}`);
    
    // Find a featured image for the article
    const featuredImage = await getFeaturedImage(topic, seoKeywords);
    
    // Generate categories for the article
    const categories = await retry(
      () => generateCategories(topic, seoKeywords),
      3,
      1000,
      'Category generation'
    );
    
    // Get the main category
    const category = categories && categories.length > 0 ? categories[0].name : topic;
    
    // The optimized prompt for clear, structured content
    const prompt = getRandomPromptTemplate(topic, title, seoKeywords);

    logger.debug(`Prompt length: ${prompt.length} characters`);
    
    // Prepare the request to Gemini API
    const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
        contents: [
          {
                    role: 'user',
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    };
    
    logger.info('Sending request to Gemini API...');
    
    // Make the request to the Gemini API using the API key manager
    const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;
    const response = await apiKeyManager.makeGeminiRequest(url, requestOptions);
    
    const responseData = await response.json();
    
    // Extract the generated content
    let content = '';
    
    if (responseData.candidates && responseData.candidates.length > 0 &&
        responseData.candidates[0].content &&
        responseData.candidates[0].content.parts &&
        responseData.candidates[0].content.parts.length > 0) {
      
      content = responseData.candidates[0].content.parts[0].text || '';
    }
    
    if (!content.trim()) {
      throw new Error('Generated content is empty');
    }
    
    logger.success(`Generated content: ${content.length} characters`);
    
    // Process content to extract excerpt and format it
    const processedContent = await processArticleContent(content, title, seoKeywords, topic, slug);
    
    // Extract excerpt from content or generate one
    const excerptMatch = content.match(/^EXCERPT:\s*(.+?)(?:\n|$)/m) || content.match(/^META_DESCRIPTION:\s*(.+?)(?:\n|$)/m);
    const excerpt = excerptMatch ? excerptMatch[1] : `Discover the latest insights and trends about ${topic}. This comprehensive guide covers everything you need to know about ${topic} in ${new Date().getFullYear()}.`;
    
    // Clean excerpt for frontmatter
    const cleanExcerpt = cleanForYaml(excerpt);
    const cleanMetaDescription = cleanForYaml(excerpt.slice(0, 155) + (excerpt.length > 155 ? '...' : ''));
    
    // Generate social snippet
    const socialMatch = content.match(/^SOCIAL_SNIPPET:\s*(.+?)(?:\n|$)/m) || content.match(/^\*\*SOCIAL_SNIPPET:\*\*\s*(.+?)(?:\n|$)/m);
    const socialSnippet = socialMatch ? socialMatch[1] : `Check out our latest article on ${topic}! ${title} #${seoKeywords.slice(0, 3).join(' #')}`;
    
    // Calculate reading time based on content length
    const readingTime = calculateReadingTime(content);
    logger.info(`Estimated reading time: ${readingTime} minutes`);
    
    // Validate content and retry if needed
    const isValid = validateArticleContent(content, title, excerpt);
    
    if (!isValid && retryCount < 0) {
        console.log('⚠️ Content failed validation. Retrying generation...');
        // Recursive call with a retry count to avoid infinite loops
        return generateArticle(topic, retryCount + 1);
    }
    
    // Search for and download images for the article
    logger.info('Searching for images for the article...');
    logger.info(`Searching for featured image with ${seoKeywords.slice(0, 3).join(', ')}...`);
    const additionalFeaturedImage = await getFeaturedImage(topic, seoKeywords.slice(0, 3));
    
    // Get additional images for the article content
    const additionalImages = await searchUnsplashImages(topic, 5) || getMultipleImages(topic);
    
    // Set a default image in case everything else fails
    const defaultImages = [{
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
      credit: { name: 'NASA', link: 'https://unsplash.com/@nasa' }
    }];
    
    // First replace [IMAGE] markers with placeholder images
    let mainContent = processedContent;
    mainContent = mainContent.replace(/\[IMAGE\](?:\s*Caption:\s*([^\n]+))?/g, (match, caption) => {
        const alt = caption || `${topic || title} visualization`;
        // Only include alt text but no caption below the image
        return `![${alt}](https://via.placeholder.com/800x400?text=Loading+Image)`;
    });

    // Then replace placeholder images with actual images
    if (additionalImages && additionalImages.length > 0) {
        let imageIndex = 0;
        let replacedCount = 0;
        mainContent = mainContent.replace(/!\[(.*?)\]\(https:\/\/via\.placeholder\.com[^\)]*\)(?:\n\*(.*?)\*)?/g, 
            (match, alt, existingCaption) => {
                if (imageIndex >= additionalImages.length) {
                    imageIndex = 0; // Cycle back to the first image if we run out
                }
                
                const image = additionalImages[imageIndex++];
                const imageUrl = getOptimizedImageUrl(image.url); // Ensure we're using optimized URLs
                
                // Use alt text for the image but only attribution for the caption
                const caption = existingCaption || alt || `${topic || title} visualization`;
                
                // Enhanced attribution with photographer name, link and Unsplash profile link
                const credit = image.credit 
                    ? `Photo by [${image.credit.name}](${image.credit.link}) on [Unsplash](https://unsplash.com/@${image.credit.username})`
                    : 'Photo from Unsplash';
                
                replacedCount++;
                
                // Show both the caption and enhanced attribution
                return `![${caption}](${imageUrl})\n*${caption}*\n*${credit}*`;
            }
        );
        
        logger.info(`Replaced ${replacedCount} placeholder images with actual images from Unsplash`);
        
        // Process any directly embedded markdown images that might already exist in the content
        // These are images that were directly generated by Gemini and need attribution
        let directImageIndex = 0;
        let addedAttributionCount = 0;
        
        // This regex matches markdown images that don't have attribution lines after them
        mainContent = mainContent.replace(/!\[(.*?)\]\((https:\/\/images\.unsplash\.com[^\)]+)\)(?!\n\*Photo by)/g, 
            (match, alt, imageUrl) => {
                if (directImageIndex >= additionalImages.length) {
                    directImageIndex = 0; // Cycle back to the first image if we run out
                }
                
                const image = additionalImages[directImageIndex++];
                
                // Keep the existing alt text and image URL
                const caption = alt || `${topic || title} visualization`;
                
                // Create attribution with photographer info
                const credit = image.credit 
                    ? `Photo by [${image.credit.name}](${image.credit.link}) on [Unsplash](https://unsplash.com/@${image.credit.username})`
                    : 'Photo from Unsplash';
                
                addedAttributionCount++;
                
                // Return the image with proper caption and attribution
                return `![${caption}](${imageUrl})\n*${caption}*\n*${credit}*`;
            }
        );
        
        if (addedAttributionCount > 0) {
            logger.info(`Added attribution to ${addedAttributionCount} directly embedded images from Unsplash`);
        }
        
        // Check if any placeholder images remain
        const remainingPlaceholders = (mainContent.match(/https:\/\/via\.placeholder\.com/g) || []).length;
        if (remainingPlaceholders > 0) {
            logger.warn(`${remainingPlaceholders} placeholder images remain in the content`);
        }
    } else {
        logger.warn('No images available to replace placeholders - placeholder images will remain in the content');
    }
    
    // Create enhanced frontmatter with properly escaped values
    const frontmatter = {
        title,
        date: getCurrentDate(),
        slug,
        excerpt: cleanExcerpt,
        metaDescription: cleanMetaDescription,
        category: category,
        categories: categories,
        status: 'new',
        trending: true,
        featured: Math.random() > 0.7, // Make some articles featured
        image: additionalFeaturedImage ? getOptimizedImageUrl(additionalFeaturedImage.url) : 
               (additionalImages && additionalImages.length > 0 ? getOptimizedImageUrl(additionalImages[0].url) : 
               getOptimizedImageUrl(defaultImages[0])),
        imageAlt: title,
        imageCredit: additionalFeaturedImage 
            ? `*Photo by [${additionalFeaturedImage.credit.name}](${additionalFeaturedImage.credit.link}) on [Unsplash](https://unsplash.com/@${additionalFeaturedImage.credit.username})*`
            : (additionalImages && additionalImages.length > 0 
                ? `*Photo by [${additionalImages[0].credit.name}](${additionalImages[0].credit.link}) on [Unsplash](https://unsplash.com/@${additionalImages[0].credit.username})*` 
                : "*Photo from Unsplash*"),
        keywords: seoKeywords,
        readingTime,
        socialShare: cleanForYaml(socialSnippet), // Clean social snippet for YAML
        generatedBy: 'Gemini'
    };

    // Format the final content
    const finalContent = `---
${Object.entries(frontmatter)
    .map(([key, value]) => {
        if (key === 'categories') {
            // Ensure we have exactly 5 categories with the required types
            if (!Array.isArray(value) || value.length !== 5) {
                console.warn(`Warning: Invalid categories format in frontmatter. Expected 5 categories, got ${Array.isArray(value) ? value.length : 'non-array'}.`);
                // Use a fallback if needed
                if (!Array.isArray(value) || value.length === 0) {
                    value = fallbackCategoryGeneration(title, seoKeywords, null, category);
                }
                // Trim to 5 categories if we have more
                if (value.length > 5) {
                    value = value.slice(0, 5);
                }
            }
            
            // Special handling for categories array with objects
            return `${key}: ${JSON.stringify(value)}`;
        } else if (Array.isArray(value)) {
            return `${key}: [${value.map(item => `"${String(item).replace(/"/g, '\\"')}"`).join(', ')}]`;
        }
        // Wrap strings containing special characters in quotes and escape quotes
        if (typeof value === 'string') {
            // Always wrap strings in quotes for consistency and escape any quotes within
            return `${key}: "${String(value).replace(/"/g, '\\"')}"`;
        }
        return `${key}: ${value}`;
    })
    .join('\n')}
---

${mainContent}`;

    const filename = `${getCurrentDate()}-${slug}.md`;
    const filepath = path.join(process.cwd(), 'content', 'articles', filename);
    await fs.writeFile(filepath, finalContent, 'utf8');
    
    // Log where the file was saved for clarity
    logger.success(`Article saved to: ${filepath}`);

    return {
        filename,
        title,
        excerpt: cleanExcerpt,
        slug,
        keywords: seoKeywords,
        categories: categories, // Add categories to the result
        socialSnippet: cleanForYaml(socialSnippet),
        generatedBy: 'Gemini'
    };
  } catch (error) {
    logger.error('Error generating article:', error);
    logger.endSection();
    return null;
  } finally {
    logger.endTimer('total-generation');
  }
}

function getCurrentDate() {
    const date = new Date();
    // Format as ISO date string (YYYY-MM-DD) with time component, which ensures proper sorting
    return date.toISOString();
}

function extractKeywords(content, title) {
    const words = (title + ' ' + content).toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .map(word => word.replace(/[^\w\s-]/g, ''))
        .filter(word => word && !['this', 'that', 'with', 'from', 'have', 'will', 'your', 'what', 'when', 'where', 'which'].includes(word));
    
    const wordFreq = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    return Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word)
        .filter(Boolean);
}

function calculateReadingTime(content) {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
}

// Generate an article on a trending topic within a category
async function generateTrendingArticle(category) {
    const categories = Object.keys(trendingTopics);
    const selectedCategory = category && trendingTopics[category] 
        ? category 
        : categories[Math.floor(Math.random() * categories.length)];
    
    const topics = trendingTopics[selectedCategory];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    
    console.log(`Generating trending article in category: ${selectedCategory}, topic: ${randomTopic}`);
    return generateArticle(`${selectedCategory}: ${randomTopic}`);
}

// Main entry point when called directly
if (require.main === module) {
    logger.startSection('Script Execution');
    const startTime = Date.now();
    
    const topic = process.argv[2];
    const func = topic ? generateArticle : generateTrendingArticle;
    const arg = topic || process.argv[3]; // Use category if provided as third argument
    
    // Show startup information
    logger.info(`Starting article generation script with Gemini model: ${GEMINI_MODEL}`);
    logger.info(`${topic ? 'Topic' : 'Category'}: ${arg || 'Random trending topic'}`);
    
    func(arg)
        .then(result => {
            const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
            logger.success(`Article generated successfully with Gemini in ${executionTime}s`);
            logger.info(`Title: ${result.title}`);
            logger.info(`Filename: ${result.filename}`);
            logger.info(`Keywords: ${result.keywords.join(', ')}`);
            if (result.socialSnippet) {
                logger.info(`Social Snippet: ${result.socialSnippet}`);
            }
            logger.endSection();
        })
        .catch(error => {
            logger.error('Error generating article with Gemini:', error);
            logger.endSection();
            process.exit(1);
        });
}

// Export the API handler for server-side processing
async function generateArticleApi(req, res) {
    try {
        logger.startSection('API Request');
        logger.startTimer('api_request');
        
        // Handle both GET and POST requests
        const topic = req.method === 'POST' ? req.body.topic : req.query.topic;
        
        if (!topic) {
            logger.warn('API request missing topic parameter');
            logger.endSection();
            return res.status(400).json({ error: 'Topic is required' });
        }
        
        logger.info(`API request to generate article on: "${topic}"`);
        const result = await generateArticle(topic);
        
        // Return the generated article info with proper post URL
        logger.success(`API request completed successfully in ${logger.endTimer('api_request')}ms`);
        logger.info(`Generated article: ${result.title} (${result.slug})`);
        logger.endSection();
        
        return res.status(200).json({
            success: true,
            title: result.title,
            slug: result.slug,
            filename: result.filename,
            categories: result.categories, // Add categories to the API response
            postUrl: `/posts/${result.slug}`, // Use posts path for redirection
            originalTopic: topic // Include the original user topic for reference
        });
    } catch (error) {
        logger.error('API error generating article:', error);
        logger.endSection();
        
        return res.status(500).json({ 
            error: 'Failed to generate article',
            message: error.message || 'An unexpected error occurred'
        });
    }
}

module.exports = { 
    generateArticle, 
    generateTrendingArticle,
    generateSEOKeywords,
    generateArticleApi
}; 

// Modify the generateSEOKeywords function to use the API key manager
async function generateSEOKeywords(topic, count = 10) {
  logger.startTimer('keyword-generation');
  
  try {
    const prompt = `
Generate exactly ${count} SEO-optimized keywords for an article about "${topic}".
Provide a mix of short-tail and long-tail keywords that are:
1. Highly relevant to the topic
2. Commonly searched by users
3. Have good search volume potential
4. A mix of informational and commercial intent

Return only the keywords as a comma-separated list, like: keyword1, keyword2, keyword3
`;
    
    const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
        contents: [
          {
                    role: 'user',
                    parts: [{ text: prompt }]
          }
        ],
                generationConfig: {
          temperature: 0.2,
          topK: 40,
                    topP: 0.95,
          maxOutputTokens: 1024
        }
      })
    };
    
    // Use the API key manager to make the request
    const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;
    const response = await apiKeyManager.makeGeminiRequest(url, requestOptions);
    
    const responseData = await response.json();
    
    // Process the response to extract the keywords
    let keywordsText = '';
    
    if (responseData.candidates && 
        responseData.candidates[0] && 
        responseData.candidates[0].content &&
        responseData.candidates[0].content.parts && 
        responseData.candidates[0].content.parts[0]) {
      
      keywordsText = responseData.candidates[0].content.parts[0].text || '';
    }
    
    // Parse the comma-separated list and clean up each keyword
    const keywords = keywordsText
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);
    
    // Ensure we have at least some keywords, including the original topic
    if (keywords.length === 0) {
      logger.warn('No keywords generated, using fallback');
      return [topic];
    }
    
    // Ensure the main topic is included
    if (!keywords.some(kw => kw.toLowerCase().includes(topic.toLowerCase()))) {
      keywords.unshift(topic);
    }
    
    // Limit to the requested count
    const limitedKeywords = keywords.slice(0, count);
    
    logger.debug(`Generated ${limitedKeywords.length} keywords: ${limitedKeywords.join(', ')}`);
    return limitedKeywords;
    } catch (error) {
        logger.error('Error generating SEO keywords:', error);
    return [topic]; // Fallback to just the topic
  } finally {
    logger.endTimer('keyword-generation');
    }
}

// Validate article content and ensure it meets requirements
function validateArticleContent(content, title, excerpt) {
    logger.startSection('Content Validation');
    logger.info('Validating article content quality...');
    
    // Check for placeholder images - changed to a warning instead of validation failure
    if (content.includes('https://via.placeholder.com/800x400?text=Loading+Image')) {
        logger.warn('Content contains placeholder images that will need to be replaced with actual images later');
        // Don't fail validation, just warn about it
    }
    
    // Check for minimum content length (at least 800 words)
    const words = content.split(/\s+/).length;
    if (words < 800) {
        logger.warn(`Content is too short (${words} words)`);
        logger.endSection();
        return false;
    }

    // Update validation logic for longer, more detailed content
    // Check for minimum content length (now expecting 1500+ words)
    if (words < 1500) {
        logger.warn(`Content is shorter than ideal (${words} words). Aim for 1500-2500 words for comprehensive coverage.`);
        // Don't fail validation, but warn
    } else {
        logger.success(`Content length is good: ${words} words`);
    }
    
    // Check for multiple sections (should have at least 3)
    const sectionCount = (content.match(/^##\s+/gm) || []).length;
    if (sectionCount < 3) {
        logger.warn(`Content has too few sections (${sectionCount}). Need at least 3.`);
        logger.endSection();
        return false;
    }
    
    // Check for detailed sections (should have 5+ ideally)
    if (sectionCount < 5) {
        logger.warn(`Article could benefit from more sections (${sectionCount}). Aim for 5-7 sections for thorough coverage.`);
        // Don't fail validation, but note it
    } else {
        logger.success(`Section count is good: ${sectionCount} sections`);
    }
    
    // Check for image markers (should have at least 3) - we now check for both [IMAGE] and placeholder URLs
    const imageMarkerCount = (content.match(/\[IMAGE\]/g) || []).length;
    const placeholderImageCount = (content.match(/https:\/\/via\.placeholder\.com/g) || []).length;
    const markdownImageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
    const totalImageCount = imageMarkerCount + placeholderImageCount + markdownImageCount;
    
    logger.debug(`Found ${imageMarkerCount} [IMAGE] markers, ${placeholderImageCount} placeholder images, and ${markdownImageCount} markdown images`);
    
    if (totalImageCount < 3) {
        logger.warn(`Content has too few images (${totalImageCount}). Need at least 3.`);
        logger.endSection();
        return false;
    } else {
        logger.success(`Image count is good: ${totalImageCount} images`);
    }
    
    // Check for Pro Tips or Expert Insights (should have at least 1)
    const hasTips = content.includes('**Pro Tip:') || content.includes('**Expert Insight:');
    if (!hasTips) {
        logger.warn('Content missing Pro Tips or Expert Insights sections');
        logger.endSection();
        return false;
    } else {
        logger.success('Content includes Pro Tips or Expert Insights');
    }
    
    // Check for bulleted lists (should have at least 2)
    const listCount = (content.match(/^\*\s+/gm) || []).length;
    if (listCount < 5) {
        logger.warn(`Content has too few list items (${listCount}). Need at least 5 for good scannability.`);
        logger.endSection();
        return false;
    } else {
        logger.success(`List item count is good: ${listCount} items`);
    }
    
    // Verify there's a good conclusion section
    const hasConclusion = content.includes('## Conclusion') || 
                           content.includes('## Final Thoughts') || 
                           content.includes('## Wrapping Up') ||
                           content.includes('## In Summary') ||
                           content.includes('## Key Takeaways');
                          
    if (!hasConclusion) {
        logger.warn('Content missing a conclusion section');
        logger.endSection();
        return false;
    } else {
        logger.success('Content includes a proper conclusion section');
    }
    
    // Check for title quality
    if (title.length < 30 || title.length > 100) {
        logger.warn(`Title length (${title.length} chars) is outside optimal range (30-100)`);
        logger.endSection();
        return false;
    } else {
        logger.success(`Title length is good: ${title.length} chars`);
    }
    
    // Check for excerpt quality
    if (excerpt && excerpt.length < 100) {
        logger.warn(`Excerpt is too short (${excerpt.length} chars). Need at least 100.`);
        logger.endSection();
        return false;
    } else if (excerpt) {
        logger.success(`Excerpt length is good: ${excerpt.length} chars`);
    }
    
    // Check for content originality and depth
    const contentDepthMarkers = [
        "research shows",
        "according to",
        "studies indicate",
        "experts recommend",
        "case study",
        "for example",
        "specifically",
        "importantly",
        "notably"
    ];
    
    // Count how many depth markers are present
    const depthMarkerCount = contentDepthMarkers.reduce((count, marker) => {
        const regex = new RegExp(marker, 'gi');
        const matches = content.match(regex) || [];
        return count + matches.length;
    }, 0);
    
    if (depthMarkerCount < 5) {
        logger.warn(`Content may lack depth (only ${depthMarkerCount} depth markers found). Need more specific examples, research citations, or expert references.`);
        logger.endSection();
        return false;
    } else {
        logger.success(`Content depth is good: ${depthMarkerCount} depth markers found`);
    }
    
    // Warn about potential cliché phrases that might indicate generic content
    const genericPhrases = [
        "in this day and age",
        "at the end of the day",
        "when all is said and done",
        "it goes without saying",
        "needless to say",
        "it's important to note",
        "it's worth mentioning",
        "it's no secret that"
    ];
    
    const foundGenericPhrases = genericPhrases.filter(phrase => 
        content.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (foundGenericPhrases.length > 2) {
        logger.warn(`Content contains too many generic phrases: ${foundGenericPhrases.join(', ')}`);
        logger.endSection();
        return false;
    } else if (foundGenericPhrases.length > 0) {
        logger.warn(`Content contains potentially generic phrases: ${foundGenericPhrases.join(', ')}`);
        // Don't fail validation, but note it
    } else {
        logger.success('Content avoids cliché phrases');
    }
    
    // Check for FAQ section - we don't want these unless specifically requested
    const hasFAQSection = content.includes('## FAQ') || 
                          content.includes('## Frequently Asked Questions') ||
                          (content.includes('**Q:') && content.includes('**A:'));
                          
    if (hasFAQSection) {
        logger.warn('Content includes an FAQ section. These should only be included when specifically relevant to the topic.');
        // Don't fail validation, but note it
    }
    
    logger.success('Content validation passed all checks ✓');
    logger.endSection();
    return true;
}

// Function to safely escape any MDX-incompatible characters in text
function escapeForMdx(text) {
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/!/g, '&#33;')
        .replace(/\*/g, '&#42;'); // Escape asterisks too
}

// Clean markdown formatting and prepare string for YAML
function cleanForYaml(text) {
    if (!text) return '';
    
    // Remove markdown formatting and other special characters that might break YAML
    return text
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold text
        .replace(/\*([^*]+)\*/g, '$1')     // Italic text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
        .replace(/`([^`]+)`/g, '$1')       // Code
        .replace(/~/g, '')                 // Strikethrough
        .replace(/\\/g, '')                // Backslashes
        .trim();
}

// Helper function to calculate Levenshtein distance between two strings
// This helps detect similar but not identical titles/headings
function levenshteinDistance(str1, str2) {
    const track = Array(str2.length + 1).fill(null).map(() => 
        Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // deletion
                track[j - 1][i] + 1, // insertion
                track[j - 1][i - 1] + indicator, // substitution
            );
        }
    }
    
    return track[str2.length][str1.length];
}
