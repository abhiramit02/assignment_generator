require('dotenv').config();
const Groq = require('groq-sdk');

console.log('GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
console.log('GROQ_API_KEY preview:', process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.slice(0,6)}...${process.env.GROQ_API_KEY.slice(-4)}` : 'undefined');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

(async () => {
  try {
    const res = await client.chat.completions.create({
      messages: [{ role: 'user', content: 'Ping' }],
      model: 'mixtral-8x7b-32768',
      max_tokens: 1,
      temperature: 0
    });
    console.log('Success — Groq call succeeded. Response keys:', Object.keys(res || {}));
  } catch (err) {
    console.error('Groq call failed:');
    // Try to show structured details from SDK errors
    console.error('err.toString():', err.toString?.() || String(err));
    console.error('err.status:', err.status || err.response?.status);
    console.error('err.response?.data:', JSON.stringify(err.response?.data || err.response || null, null, 2));
    console.error('Full error object:', err);
  }
})();
