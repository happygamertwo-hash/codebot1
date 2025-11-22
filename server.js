const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { Configuration, OpenAIApi } = require('openai');

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in environment. See .env.example');
  process.exit(1);
}

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Basic health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// POST /api/chat
// body: { messages: [{role: 'user'|'system'|'assistant', content: string}, ...] }
// returns: { reply: { role, content } }
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    // You can change model or add parameters here
    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages,
      max_tokens: 1000,
      temperature: 0.2
    });

    const choice = completion.data.choices && completion.data.choices[0];
    const reply = choice?.message || { role: 'assistant', content: '' };
    res.json({ reply });
  } catch (err) {
    console.error('OpenAI error:', err?.response?.data || err.message || err);
    res.status(500).json({ error: 'OpenAI request failed', details: err?.message || err });
  }
});

// optional: endpoint to generate a downloadable file from prompt
// body: { filename: "hello.py", prompt: "Write a python script that prints hello" }
app.post('/api/generate-file', async (req, res) => {
  try {
    const { filename, prompt } = req.body;
    if (!filename || !prompt) {
      return res.status(400).json({ error: 'filename and prompt required' });
    }

    const messages = [
      { role: 'system', content: 'You are a helpful assistant that returns only the content of the requested file. Do not wrap code in explanation.' },
      { role: 'user', content: prompt }
    ];

    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages,
      temperature: 0.15,
      max_tokens: 1500
    });

    const content = completion.data.choices?.[0]?.message?.content || '';
    // Return as plain text with a filename header so frontend can trigger download
    res.json({ filename, content });
  } catch (err) {
    console.error('generate-file error:', err?.response?.data || err.message || err);
    res.status(500).json({ error: 'generate-file failed', details: err?.message || err });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Coder Chatbot running on http://localhost:${PORT}`);
});