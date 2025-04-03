export async function getServerSideProps({ res }) {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://trendiingz.com';
  
  const robotsTxt = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Sitemap
Sitemap: ${SITE_URL}/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.write(robotsTxt);
  res.end();

  return {
    props: {},
  };
}

export default function RobotsTxt() {
  return null;
} 