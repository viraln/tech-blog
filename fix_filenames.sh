#!/bin/bash

# Directories containing the articles - check both possible locations
ARTICLES_DIRS=("netlify/functions/content/articles" "content/articles")

# Counter for renamed files
renamed=0

# Process each directory
for ARTICLES_DIR in "${ARTICLES_DIRS[@]}"; do
  # Check if the directory exists
  if [ ! -d "$ARTICLES_DIR" ]; then
    echo "Directory not found: $ARTICLES_DIR, skipping..."
    continue
  fi

  echo "Processing directory: $ARTICLES_DIR"

  # Loop through all markdown files in the directory
  for file in "$ARTICLES_DIR"/*.md; do
    # Skip if no files match
    [ -e "$file" ] || continue
    
    # Get the filename without the path
    filename=$(basename "$file")
    
    # Check if filename contains colons
    if [[ "$filename" == *":"* ]]; then
      # Create new filename with colons replaced by underscores
      new_filename="${filename//:/_}"
      
      # Rename the file
      mv "$file" "$ARTICLES_DIR/$new_filename"
      
      echo "Renamed: $filename → $new_filename"
      ((renamed++))
      
      # Update git tracking
      git rm --cached "$ARTICLES_DIR/$filename" 2>/dev/null || true
      git add "$ARTICLES_DIR/$new_filename"
    fi
  done
done

echo "Finished renaming $renamed files."

# Now create a script to update articleUtils.js
cat > update_article_utils.js << 'EOF'
// File to update timestamp format in articleUtils.js
const fs = require('fs');
const path = require('path');

const utilsPath = path.join(process.cwd(), 'utils', 'articleUtils.js');

// Read the file
let content = fs.readFileSync(utilsPath, 'utf8');

// Update the code to use underscores instead of colons when creating new timestamps
// This will modify any code that creates ISO strings for filenames

// Function to create a sanitized timestamp for filenames
const newFunction = `
/**
 * Creates a filesystem-safe timestamp string for filenames
 * @returns {string} - Sanitized timestamp string
 */
export function createSafeTimestamp() {
  // Replace colons with underscores to make it filesystem-friendly
  return new Date().toISOString().replace(/:/g, '_');
}`;

// Add the new function to the file
if (!content.includes('createSafeTimestamp')) {
  // Find a good spot to insert the function (before getRelativeTime function)
  if (content.includes('export function getRelativeTime')) {
    content = content.replace(
      'export function getRelativeTime',
      `${newFunction}\n\nexport function getRelativeTime`
    );
    console.log('Added createSafeTimestamp function');
  } else {
    // Just add it after the slugToFilenameMap declaration
    content = content.replace(
      'const slugToFilenameMap = new Map();',
      'const slugToFilenameMap = new Map();\n\n' + newFunction
    );
    console.log('Added createSafeTimestamp function');
  }
}

// Save the modified file
fs.writeFileSync(utilsPath, content);
console.log('Updated articleUtils.js');
EOF

echo "Created update_article_utils.js script"
echo ""
echo "Next Steps:"
echo "1. Run 'node update_article_utils.js' to update the articleUtils.js file"
echo "2. Modify any code that creates new article files to use createSafeTimestamp() instead of toISOString()"
echo "3. Commit and push changes to fix the Netlify build error" 