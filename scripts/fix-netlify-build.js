// This script cleans up any conflicting files that might cause Netlify build issues
const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public');

// List of files that conflict with dynamic routes
const conflictingFiles = [
  'robots.txt',
  'sitemap.xml'
];

// Check if the public directory exists
if (fs.existsSync(publicDir)) {
  console.log('Checking for conflicting files in public directory...');
  
  conflictingFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    
    if (fs.existsSync(filePath)) {
      console.log(`Removing conflicting file: ${file}`);
      fs.unlinkSync(filePath);
    } else {
      console.log(`No conflict found for: ${file}`);
    }
  });
  
  console.log('Finished checking for conflicts.');
} else {
  console.log('Public directory not found.');
} 