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
    return res.status(500).json({ error: { message: 'GROQ_API_KEY not configured.' } });
  }

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

  const requestedModel = process.env.GROQ_MODEL || req.body?.model;
  const modelsToTry = [
    requestedModel,
    ...FALLBACK_MODELS
  ].filter((m, idx, self) => Boolean(m) && self.indexOf(m) === idx);

  let lastData = null;
  let lastStatus = 500;

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      lastStatus = response.status;
      lastData = data;

      if (response.ok) {
        const raw = data.choices?.[0]?.message?.content || '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        const parsedStr = jsonMatch ? jsonMatch[0] : raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(parsedStr);
        return res.status(200).json(parsed);
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
    } catch (err) {
      lastData = { error: { message: err.message } };
    }
  }

  return res.status(lastStatus).json(lastData);
}

