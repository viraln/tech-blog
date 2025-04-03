import { getAllArticles } from '../utils/articleUtils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://trendiingz.com';

function generateSiteMap(posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <!-- Add the static pages -->
     <url>
       <loc>${SITE_URL}</loc>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
       <lastmod>${new Date().toISOString()}</lastmod>
     </url>
          <url>
       <loc>${SITE_URL}/topics/latest</loc>
       <changefreq>weekly</changefreq>
       <priority>0.9</priority>
       <lastmod>${new Date().toISOString()}</lastmod>
     </url>
     <url>
       <loc>${SITE_URL}/all-topics</loc>
       <changefreq>weekly</changefreq>
       <priority>0.8</priority>
       <lastmod>${new Date().toISOString()}</lastmod>
     </url>
     
     <!-- Add all article pages -->
     ${posts
       .map((post) => {
         return `
       <url>
         <loc>${SITE_URL}/posts/${post.slug}</loc>
         <changefreq>monthly</changefreq>
         <priority>0.7</priority>
         <lastmod>${new Date(post.date).toISOString()}</lastmod>
       </url>
     `;
       })
       .join('')}
     
     <!-- Add all topic pages if applicable -->
     ${posts
       .reduce((topics, post) => {
         const categories = Array.isArray(post.categories) ? post.categories : [];
         categories.forEach(category => {
           const categoryName = typeof category === 'string' ? category : (category.name || '');
           if (categoryName && !topics.includes(categoryName)) {
             topics.push(categoryName);
           }
         });
         return topics;
       }, [])
       .map((topic) => {
         // Format the topic for URL (lowercase, replace spaces with hyphens)
         const formattedTopic = topic.toLowerCase().replace(/\s+/g, '-');
         return `
       <url>
         <loc>${SITE_URL}/topics/${formattedTopic}</loc>
         <changefreq>weekly</changefreq>
         <priority>0.6</priority>
         <lastmod>${new Date().toISOString()}</lastmod>
       </url>
     `;
       })
       .join('')}
   </urlset>
 `;
}

export async function getServerSideProps({ res }) {
  // Get all posts to include in the sitemap
  const posts = await getAllArticles({ skipCache: false });

  // Set appropriate headers
  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=1200, stale-while-revalidate=600');
  
  // Generate the XML sitemap with the posts data
  const sitemap = generateSiteMap(posts);
  
  // Send the XML to the browser
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

// Empty component as this is just to generate the XML
export default function SiteMap() {
  return null;
} 