const FALLBACK_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: { message: 'GROQ_API_KEY is not set in environment variables.' }
    });
  }

  const requestedModel = process.env.GROQ_MODEL || req.body?.model;
  const modelsToTry = [
    requestedModel,
    ...FALLBACK_MODELS
  ].filter((m, idx, self) => Boolean(m) && self.indexOf(m) === idx);

  let lastData = null;
  let lastStatus = 500;

  for (const model of modelsToTry) {
    try {
      const body = {
        ...req.body,
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
        return res.status(200).json(data);
      }

      const errMsg = (data?.error?.message || '').toLowerCase();
      const errType = (data?.error?.type || '').toLowerCase();
      const isModelError = response.status === 404 ||
        errMsg.includes('model') ||
        errMsg.includes('does not exist') ||
        errMsg.includes('do not have access') ||
        errType.includes('invalid_model');

      if (!isModelError) {
        return res.status(response.status).json(data);
      }

      console.warn(`[Groq API] Model "${model}" failed (${data?.error?.message}). Retrying next fallback model...`);
    } catch (err) {
      lastData = { error: { message: err.message } };
    }
  }

  return res.status(lastStatus).json(lastData);
}

