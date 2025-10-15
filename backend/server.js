// server.js
require('dotenv').config(); // MUST be first

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const pdf = require('pdf-parse');
const Groq = require('groq-sdk'); // keep your installed sdk
const fetch = global.fetch || require('node-fetch'); // node 18+ has global fetch; fallback

const app = express();
const PORT = process.env.PORT || 5000;

// Debug: lightweight environment preview
console.log('NODE_ENV =', process.env.NODE_ENV || 'undefined');
console.log('PORT =', PORT);
console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
console.log(
  'GROQ_API_KEY preview:',
  process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.slice(0, 5)}...${process.env.GROQ_API_KEY.slice(-4)}` : 'undefined'
);

// Choose model from env or use a safe fallback (you will replace this after checking available models)
const GROQ_MODEL = process.env.GROQ_MODEL || 'mistral-saba-24b';

// Fail fast in development if key missing
if (!process.env.GROQ_API_KEY) {
  console.error('GROQ_API_KEY is not set. Please set it in your .env and restart the server.');
  process.exit(1);
}

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// CORS and middleware
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => (file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('Only PDF files allowed'))),
});

function safeUnlink(p) {
  if (!p) return;
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) { console.error('unlink error', e); }
}

// Extract text util
async function extractTextFromPdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (err) {
    console.error('Error extracting text from PDF:', err);
    throw new Error('Failed to extract text from PDF');
  }
}

// Endpoint: list available models from Groq (calls openai-compatible models endpoint)
app.get('/api/list-models', async (req, res) => {
  try {
    const url = 'https://api.groq.com/openai/v1/models';
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    const status = r.status;
    const data = await r.json().catch(() => null);

    if (!r.ok) {
      console.error('List models failed', status, data);
      return res.status(status).json({ ok: false, status, data });
    }
    // returns full list — pick a model-id from here
    return res.json({ ok: true, models: data.data || data });
  } catch (err) {
    console.error('Error fetching models:', err);
    return res.status(502).json({ ok: false, error: String(err) });
  }
});

// Function to generate MCQs using current model
async function generateMCQs(text) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY missing');

  const prompt = `Generate 15 multiple-choice questions based on the following text. For each question, provide 4 options and indicate the correct answer. Format response as a JSON object with a 'questions' array where each object has 'question', 'options' (an array), and 'correctAnswer' (index). Text: ${text.substring(0, 3000)}`;

  console.log('Using model:', GROQ_MODEL);

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: "You are a helpful assistant that outputs valid JSON containing a 'questions' array." },
        { role: 'user', content: prompt },
      ],
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from Groq API');
    const result = typeof content === 'string' ? JSON.parse(content) : content;

    if (result.questions && Array.isArray(result.questions)) return result.questions;
    if (Array.isArray(result)) return result;
    throw new Error('Unexpected JSON shape from model');
  } catch (err) {
    console.error('generateMCQs error:', err.message || err.toString(), { status: err.status, response: err.response?.data });
    // bubble the error upward with some context
    throw new Error(`Failed to generate MCQs: ${err.message || String(err)}`);
  }
}

// Upload + generate endpoint
app.post('/api/generate-mcqs', upload.single('pdfFile'), async (req, res) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const text = await extractTextFromPdf(filePath);
    if (!text || !text.trim()) throw new Error('No text extracted from PDF');

    const mcqs = await generateMCQs(text);
    safeUnlink(filePath);
    return res.json({ success: true, mcqs });
  } catch (err) {
    console.error('Error processing request:', err);
    safeUnlink(filePath);
    return res.status(500).json({ error: err.message || 'Failed' });
  }
});

// generic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}. Default GROQ_MODEL=${GROQ_MODEL}`);
});
