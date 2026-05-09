import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency needed)
try {
  const envFile = readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const [key, ...rest] = line.trim().split('=');
    if (key && rest.length) process.env[key] = rest.join('=');
  }
} catch {}

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// /api/chat — proxy to OpenAI
app.post('/api/chat', async (req, res) => {
  try {
    const body = {
      ...req.body,
      model: process.env.GROQ_MODEL
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// /api/cars — proxy to Supabase
app.get('/api/cars', async (req, res) => {
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/car_list_dataset?select=*&limit=1000`, {
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`
      }
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Fallback: serve index.html for SPA-style routing
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ TrueCost server running at http://localhost:${PORT}`);
});
