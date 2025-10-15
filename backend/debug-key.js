// debug-key.js
require('dotenv').config();
const k = process.env.GROQ_API_KEY;
console.log('present:', !!k);
console.log('preview:', k ? `${k.slice(0,6)}...${k.slice(-4)}` : 'undefined');
console.log('json:', JSON.stringify(k)); // reveals hidden chars/newlines
