// This file helps Netlify understand Next.js deployment
// It's a workaround to ensure API routes are properly handled

exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Netlify functions for Next.js API routes are working" })
  };
}; 