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
