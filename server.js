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

const FALLBACK_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768'
];

async function callGroqCompletions(payload) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 500, data: { error: { message: 'GROQ_API_KEY is not set in environment variables.' } } };
  }

  const requestedModel = process.env.GROQ_MODEL || payload?.model;
  const modelsToTry = [
    requestedModel,
    ...FALLBACK_MODELS
  ].filter((m, idx, self) => Boolean(m) && self.indexOf(m) === idx);

  let lastData = null;
  let lastStatus = 500;

  for (const model of modelsToTry) {
    try {
      const body = {
        ...payload,
        model
      };

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      lastStatus = response.status;
      lastData = data;

      if (response.ok) {
        return { ok: true, status: 200, data };
      }

      const errMsg = (data?.error?.message || '').toLowerCase();
      const errType = (data?.error?.type || '').toLowerCase();
      const isModelError = response.status === 404 ||
        errMsg.includes('model') ||
        errMsg.includes('does not exist') ||
        errMsg.includes('do not have access') ||
        errType.includes('invalid_model');

      if (!isModelError) {
        return { ok: false, status: response.status, data };
      }

      console.warn(`[Groq API] Model "${model}" failed (${data?.error?.message}). Retrying next fallback model...`);
    } catch (err) {
      lastData = { error: { message: err.message } };
    }
  }

  return { ok: false, status: lastStatus, data: lastData };
}

// /api/chat — proxy to Groq
app.post('/api/chat', async (req, res) => {
  const result = await callGroqCompletions(req.body);
  return res.status(result.status).json(result.data);
});

// /api/fuel-estimate — AI engine specs estimation
app.post('/api/fuel-estimate', async (req, res) => {
  const { car_name } = req.body;
  if (!car_name) {
    return res.status(400).json({ error: { message: 'car_name is required.' } });
  }

  const prompt = `You are a Malaysian automotive data expert. Given this car: "${car_name}"

Estimate the following and respond ONLY with a JSON object (no markdown, no explanation):
{
  "engine_cc": <integer, e.g. 1498>,
  "fuel_efficiency_kml": <number, estimated real-world km/L in Malaysian conditions>,
  "fuel_type": "<RON95 or RON97>",
  "normalized_name": "<clean model name>"
}

Rules:
- For engine CC, use the actual displacement if identifiable. "1.5" = 1498cc, "2.0" = 1991cc, "1.3" = 1332cc.
- For fuel efficiency, use real-world Malaysian driving estimates (not manufacturer claims). Account for city+highway mix.
- Premium/luxury brands (Mercedes, BMW, Audi, Porsche, Lexus) typically need RON97.
- National cars (Perodua, Proton) and Japanese econoboxes use RON95.
- If uncertain, use conservative estimates typical for the Malaysian market.`;

  const result = await callGroqCompletions({
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }]
  });

  if (!result.ok) {
    return res.status(result.status).json(result.data);
  }

  try {
    const raw = result.data.choices?.[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsedStr = jsonMatch ? jsonMatch[0] : raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(parsedStr);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Failed to parse fuel estimate JSON from AI response' } });
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

