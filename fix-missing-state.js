const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'pages', 'topics', '[slug].js');
let content = fs.readFileSync(filePath, 'utf8');

// Add the missing isLoadingMore state
content = content.replace(
  /const \[clientDataError, setClientDataError\] = useState\(false\)/,
  `const [clientDataError, setClientDataError] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)`
);

// Write the updated file
fs.writeFileSync(filePath, content, 'utf8');
console.log('Added missing isLoadingMore state'); 