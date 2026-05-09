// ============================================================
// AI API (OpenAI)
// ============================================================
const chatHistory = [];
const trAI = (key, fallback) => {
  if (typeof window.i18nT === 'function') {
    const out = window.i18nT(key);
    if (out && out !== key) return out;
  }
  return fallback;
};

async function callAI(messages, maxTokens = 1000) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_tokens: maxTokens, messages })
  });
  if (!response.ok) { const t = await response.text(); throw new Error('API error: ' + t.slice(0, 120)); }
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '';
}

function buildSystemPrompt() {
  const car = state.selectedCar;
  const tc = state.trueCost;
  const sd = state.scenarioData;
  const isUsed = car && (car.condition === 'Used' || car.type === 'used');
  const isNew = car && (car.condition === 'New' || car.type === 'new');

  // ── Financial Profile ──
  const salary = state.salary || 0;
  const loans = state.loans || 0;
  const expenses = state.expenses || 0;
  const disposable = salary - loans - expenses;
  const dti = state.dti ? state.dti.toFixed(1) : '—';
  const maxPrice = state.maxPrice ? Math.round(state.maxPrice) : '—';
  const budgetMonthly = state.budget ? Math.round(state.budget) : '—';

  // ── Income percentage ──
  const pct = (salary > 0 && tc) ? (tc.total / salary * 100).toFixed(1) : '—';

  // ── Car info ──
  const carName = car
    ? `${car.make || car.brand} ${car.model} ${car.variant || ''} (${car.year}, ${car.condition || car.type})`
    : 'No car selected';
  const engineCC = car ? (car.engine > 50 ? car.engine : car.engineCC || 1500) : 0;

  // ── True cost breakdown (exact screen values) ──
  let costSection = 'No car selected.';
  if (car && tc) {
    costSection = `
SELECTED CAR:
- Name: ${carName}
- Price: RM${car.price.toLocaleString()}
- Engine: ${engineCC}cc | Body: ${car.bodyType} | Condition: ${car.condition}
- Loan term: ${state.loanTermYears || 7} years | Down payment: ~RM${Math.round(car.price * 0.10).toLocaleString()} (10%)
- Flat interest rate: ${isNew ? '3.5%' : '4.5%'} (${isNew ? 'new car rate' : 'used car rate'})

TRUE MONTHLY COST BREAKDOWN (exact figures shown on screen):
- Loan instalment:   RM${Math.round(tc.monthly_loan).toLocaleString()}/month
- Fuel (1,200km/mo): RM${Math.round(tc.fuel).toLocaleString()}/month
- Insurance:         RM${Math.round(tc.insurance).toLocaleString()}/month
- Road tax:          RM${Math.round(tc.roadtax).toLocaleString()}/month
- Maintenance:       RM${Math.round(tc.maint).toLocaleString()}/month
- Depreciation:      RM${Math.round(tc.deprec).toLocaleString()}/month
- Tolls & Parking:   RM${Math.round(tc.tollParking).toLocaleString()}/month
─────────────────────────────────────────────
- TRUE TOTAL:        RM${Math.round(tc.total).toLocaleString()}/month (${pct}% of income)
- 5-YEAR TOTAL:      RM${Math.round(tc.total5yr).toLocaleString()}`;
  }

  // ── Scenario / comparison data ──
  let scenarioSection = '';
  if (sd) {
    if (!isUsed && state.trackBCar) {
      const saving = sd.monthlyDiff > 0 ? Math.round(sd.monthlyDiff) : 0;
      const fv5 = sd.fv5 ? Math.round(sd.fv5) : 0;
      scenarioSection = `
WEALTH GAP ANALYSIS (exact figures shown on screen):
- Selected car monthly cost:    RM${Math.round(sd.tc.total).toLocaleString()}
- Used alternative monthly cost: RM${Math.round(sd.usedLoan + sd.tc.fuel + sd.tc.insurance * 0.7 + sd.tc.roadtax + sd.tc.maint * 1.3).toLocaleString()}
- Monthly saving by going used:  RM${saving.toLocaleString()}
- 5-yr wealth if saving invested at 7% p.a.: RM${fv5.toLocaleString()}
- Smarter alternative: ${state.trackBCar.make} ${state.trackBCar.model} (${state.trackBCar.year}) at RM${state.trackBCar.price.toLocaleString()} — ${Math.round((1 - state.trackBCar.price / car.price) * 100)}% cheaper`;
    } else if (isUsed) {
      scenarioSection = `
NOTE: User ALREADY CHOSE a used/pre-owned car. Do NOT suggest switching to used — they are already on the smarter path. Affirm this decision. Focus on ownership cost management and wealth building from the savings vs buying new.`;
    }
  }

  // ── Affordability verdict thresholds (same as on screen) ──
  const pctNum = parseFloat(pct) || 0;
  const screenVerdict = pctNum <= 25 ? 'COMFORTABLE' : pctNum <= 30 ? 'MANAGEABLE' : 'STRETCH';

  return `You are TrueCost AI, a Malaysian personal finance advisor specialising in car affordability. Be direct, specific, and base your entire analysis on the EXACT numbers provided below — do not invent or estimate figures that differ from what is given.

USER FINANCIAL PROFILE:
- Monthly take-home salary: RM${salary.toLocaleString()}
- Existing loans/commitments: RM${loans.toLocaleString()}/month
- Monthly living expenses: RM${expenses.toLocaleString()}/month
- Disposable income (salary - loans - expenses): RM${disposable.toLocaleString()}/month
- Total savings: RM${(state.savings || 0).toLocaleString()}
- Emergency fund: RM${(state.emergency || 0).toLocaleString()}
- Age: ${state.age} | Dependents: ${state.dependents} | Job stability: ${state.stability}
- Debt-to-Income Ratio (DTI): ${dti}%
- Safe monthly car budget: RM${budgetMonthly.toLocaleString()}
- Recommended max car price (${state.loanTermYears || 7}yr loan): RM${typeof maxPrice === 'number' ? maxPrice.toLocaleString() : maxPrice}
${costSection}
${scenarioSection}

SCREEN VERDICT: The app shows this car as ${screenVerdict} (${pct}% of income). Your verdict MUST match this exactly.

Malaysian affordability thresholds used by this app (you must use the same):
- 0–25% of income → COMFORTABLE ✓
- 25–30% of income → MANAGEABLE ⚠
- Above 30% of income → STRETCH ✗
- DTI should stay under 40% (ideally under 30%)
- Emergency fund target: 6× monthly expenses (= RM${Math.round((state.expenses || 0) * 6).toLocaleString()})

CRITICAL RULES:
1. Use only the exact RM figures above — never calculate your own estimates that differ
2. Your verdict must match the screen verdict: ${screenVerdict}
3. If the user chose a used car, do NOT suggest buying used as an alternative — they already did
4. Reference specific numbers from the breakdown in your analysis`;
}


function normalizeVerdict(verdict) {
  const v = String(verdict || '').toUpperCase();
  if (v === 'SAFE') return 'COMFORTABLE';
  if (v === 'RISKY') return 'MANAGEABLE';
  if (v === 'DANGEROUS') return 'STRETCH';
  if (v === 'COMFORTABLE' || v === 'MANAGEABLE' || v === 'STRETCH') return v;
  return 'MANAGEABLE';
}

// ============================================================
// AI RECOMMENDATIONS (Page 3)
// ============================================================
async function runRecommendationsP3() {
  if (!state.salary) { alert(trAI('alert.completeStep2Profile', 'Please complete your financial profile in Step 2 first.')); return; }
  const btn = document.getElementById('btn-reco-p3');
  const bannerText = document.getElementById('reco-banner-text');
  btn.disabled = true; btn.textContent = trAI('btn.findingPicks', 'Finding picks...');
  bannerText.textContent = trAI('p3.recoLoading', 'AI is analysing your profile and matching cars...');
  // Build a salary-appropriate car pool
  const maxP = state.maxPrice || (state.salary * 12 * 0.25);
  const minP = maxP * 0.4;
  let suitableCars = CAR_DATASET.filter(c => c.price >= minP && c.price <= maxP * 1.1);
  if (suitableCars.length < 10) suitableCars = CAR_DATASET.filter(c => c.price <= maxP * 1.2);

  const newCars = suitableCars.filter(c => c.condition === 'New').sort(() => Math.random() - 0.5).slice(0, 20);
  const usedCars = suitableCars.filter(c => c.condition !== 'New').sort(() => Math.random() - 0.5).slice(0, 20);
  const combined = [...newCars, ...usedCars].sort(() => Math.random() - 0.5);

  const carListContext = combined.map(c => `ID:${c.id} | ${c.make} ${c.model} ${c.variant} (${c.year}, ${c.condition}) | RM${c.price.toLocaleString()} | ${c.engine} ${c.transmission} ${c.bodyType} | ${c.mileage || 'New'}`).join('\n');

  const prompt = `${buildSystemPrompt()}

User's safe car budget: RM${Math.round(state.budget).toLocaleString()}/month. Max car price: RM${Math.round(maxP).toLocaleString()}.

Here are the available cars in their price range:
${carListContext}

Recommend exactly 3 NEW cars and 3 USED/RECON cars that match this user's financial profile. Prioritize affordability, ownership cost, and long-term financial safety.
Respond ONLY with this exact JSON structure (no markdown):
{
  "new_cars": [
    {"id":2, "reason":"short reason"},
    {"id":1, "reason":"short reason"},
    {"id":4, "reason":"short reason"}
  ],
  "used_or_recon_cars": [
    {"id":8, "reason":"short reason"},
    {"id":9, "reason":"short reason"},
    {"id":10, "reason":"short reason"}
  ]
}`;

  try {
    const raw = await callAI([{ role: 'user', content: prompt }], 600);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    const recs = [...(parsed.new_cars || []), ...(parsed.used_or_recon_cars || [])];
    state.aiRecoIds = recs.map(r => Number(r.id));
    state.aiRecoReasons = {};
    recs.forEach(r => { state.aiRecoReasons[Number(r.id)] = r.reason; });

    applyFilters();

    // Fetch actual car objects
    const newRecs = parsed.new_cars ? parsed.new_cars.map(r => CAR_DATASET.find(c => c.id === Number(r.id))).filter(Boolean) : [];
    const usedRecs = parsed.used_or_recon_cars ? parsed.used_or_recon_cars.map(r => CAR_DATASET.find(c => c.id === Number(r.id))).filter(Boolean) : [];

    // Render to UI
    const resultsContainer = document.getElementById('ai-recommendation-results');
    const newGrid = document.getElementById('ai-new-cars-grid');
    const usedGrid = document.getElementById('ai-used-cars-grid');
    const newSection = document.getElementById('ai-new-cars-section');
    const usedSection = document.getElementById('ai-used-cars-section');

    if (newRecs.length > 0) {
      newGrid.innerHTML = newRecs.map(window.renderCarCardHTML).join('');
      newSection.style.display = 'block';
    } else {
      newSection.style.display = 'none';
    }

    if (usedRecs.length > 0) {
      usedGrid.innerHTML = usedRecs.map(window.renderCarCardHTML).join('');
      usedSection.style.display = 'block';
    } else {
      usedSection.style.display = 'none';
    }

    resultsContainer.style.display = 'block';

    const topCar = CAR_DATASET.find(c => c.id === state.aiRecoIds[0]);
    bannerText.innerHTML = `✦ AI found <strong style="color:var(--green)">${recs.length} recommended cars</strong>.${topCar ? ` Top pick: <strong>${topCar.make} ${topCar.model}</strong>.` : ''} Select one below or in the grid.`;
    btn.textContent = trAI('btn.refreshPicks', '↺ Refresh Picks');
  } catch (err) {
    const resultsContainer = document.getElementById('ai-recommendation-results');
    if (resultsContainer) resultsContainer.style.display = 'none';
    bannerText.innerHTML = `<span style="color:var(--red)">Unable to generate AI recommendations. (${err.message})</span>`;
    btn.textContent = trAI('btn.getAiPicks', '✦ Get AI Picks');
  }
  btn.disabled = false;
}

// ============================================================
// FULL AI ANALYSIS
// ============================================================
async function runFullAnalysis() {
  if (!state.salary) { alert(trAI('alert.completeStep2', 'Complete Step 2 first.')); return; }
  if (!state.selectedCar) { alert(trAI('alert.selectCarStep3', 'Select a car in Step 3 first.')); return; }
  if (state.analysisInProgress) return;
  const btn = document.getElementById('btn-analyze');
  state.analysisInProgress = true;
  btn.disabled = true; btn.textContent = trAI('btn.analysing', 'Analysing...');
  document.getElementById('analysis-placeholder').style.display = 'none';
  document.getElementById('analysis-content').style.display = 'none';
  document.getElementById('analysis-loading').style.display = 'flex';
  const loadingText = document.querySelector('#analysis-loading span');
  if (loadingText) loadingText.textContent = trAI('p6.loading', 'Analysing your financial profile...');

  const prompt = `${buildSystemPrompt()}\n\nAnalyse this car purchase and respond ONLY with a JSON object (no markdown):\n{"verdict":"COMFORTABLE"|"MANAGEABLE"|"STRETCH","affordability":"1 short precise sentence","risks":"1 short precise sentence","safer_alternative":"1 short precise sentence","long_term":"1 short precise sentence","summary":"2-3 short sentences for a quick verdict"}`;
  try {
    const raw = await callAI([{ role: 'user', content: prompt }], 1000);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const verdict = normalizeVerdict(parsed.verdict);
    const vc = verdict === 'COMFORTABLE' ? 'var(--green)' : verdict === 'MANAGEABLE' ? 'var(--amber)' : 'var(--red)';
    const vb = verdict === 'COMFORTABLE' ? 'badge-safe' : verdict === 'MANAGEABLE' ? 'badge-risky' : 'badge-danger';
    document.getElementById('analysis-cards').innerHTML = `
      <div style="background:var(--surface2);padding:1rem;border-left:2px solid ${vc}"><div style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--text-faint);margin-bottom:0.4rem">AFFORDABILITY</div><div style="font-size:0.82rem;line-height:1.5">${parsed.affordability}</div></div>
      <div style="background:var(--surface2);padding:1rem;border-left:2px solid var(--red)"><div style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--text-faint);margin-bottom:0.4rem">RISKS</div><div style="font-size:0.82rem;line-height:1.5">${parsed.risks}</div></div>
      <div style="background:var(--surface2);padding:1rem;border-left:2px solid var(--green)"><div style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--text-faint);margin-bottom:0.4rem">SAFER ALTERNATIVE</div><div style="font-size:0.82rem;line-height:1.5">${parsed.safer_alternative}</div></div>
      <div style="background:var(--surface2);padding:1rem;border-left:2px solid var(--gold)"><div style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--text-faint);margin-bottom:0.4rem">LONG-TERM</div><div style="font-size:0.82rem;line-height:1.5">${parsed.long_term}</div></div>`;
    document.getElementById('analysis-verdict').innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border)">
        <span class="badge ${vb}" style="font-size:0.7rem;padding:0.35rem 0.9rem">${verdict === 'COMFORTABLE' ? '✓ COMFORTABLE' : verdict === 'MANAGEABLE' ? '⚠ MANAGEABLE' : '✗ STRETCH'}</span>
        <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text-faint)">AI Verdict</span>
      </div>
      <p style="font-size:0.88rem;line-height:1.8;color:var(--text-dim)">${parsed.summary}</p>
      <div id="path-to-car-card"></div>`;

    if (verdict === 'STRETCH') {
      const carName = `${state.selectedCar.make || state.selectedCar.brand} ${state.selectedCar.model}`;
      const roadmapPrompt = `The user earns RM${Math.round(state.salary).toLocaleString()}/month take-home and is looking at a ${carName} priced at RM${Math.round(state.selectedCar.price).toLocaleString()}. This is currently a stretch for their budget. Generate a compassionate, specific 3-step roadmap to help them afford this car in 12-18 months. Include: (1) a monthly savings target, (2) a recommended bridge car (suggest a Perodua or entry Proton) they could buy now and upgrade from, (3) one specific financial habit to adopt. Keep the tone warm and encouraging — like advice from a financially savvy older sibling. Max 120 words.`;
      try {
        const roadmapText = await callAI([{ role: 'user', content: roadmapPrompt }], 240);
        const roadmapEl = document.getElementById('path-to-car-card');
        if (roadmapEl) {
          roadmapEl.innerHTML = `
            <div style="margin-top:1rem;background:var(--surface2);padding:1rem;border:1px solid var(--border);border-left:3px solid var(--gold)">
              <div style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--gold);margin-bottom:0.45rem">Your path to this car</div>
              <div style="font-size:0.82rem;line-height:1.6;color:var(--text-dim)">${roadmapText.replace(/\n/g, '<br>')}</div>
            </div>`;
        }
      } catch (_roadmapErr) {
        const roadmapEl = document.getElementById('path-to-car-card');
        if (roadmapEl) {
          roadmapEl.innerHTML = `
            <div style="margin-top:1rem;background:var(--surface2);padding:1rem;border:1px solid var(--border);border-left:3px solid var(--gold)">
              <div style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--gold);margin-bottom:0.45rem">Your path to this car</div>
              <div style="font-size:0.82rem;line-height:1.6;color:var(--text-dim)">Start by setting aside a fixed amount monthly, choose an affordable bridge car now, and build a consistent saving habit for 12-18 months before upgrading.</div>
            </div>`;
        }
      }
    }

    document.getElementById('analysis-loading').style.display = 'none';
    document.getElementById('analysis-content').style.display = 'block';
    state.analysisGenerated = true;
    appendMsg('ai', `Analysis complete. Verdict: <strong>${verdict}</strong>. ${parsed.summary}`);
  } catch (err) {
    document.getElementById('analysis-loading').style.display = 'none';
    document.getElementById('analysis-placeholder').style.display = 'flex';
    document.getElementById('analysis-placeholder').innerHTML = `<div style="font-size:1.5rem">⚠️</div><div style="font-size:0.82rem;color:var(--red)">${trAI('error.prefix', 'Error:')} ${err.message}</div>`;
  } finally {
    state.analysisInProgress = false;
    btn.disabled = false; btn.textContent = trAI('btn.generateAnalysis', '⚡ Generate Analysis');
  }
}

// ============================================================
// AI CHAT
// ============================================================
async function sendAI() {
  const input = document.getElementById('ai-input'), btn = document.getElementById('ai-send-btn');
  const msg = input.value.trim(); if (!msg) return;
  appendMsg('user', msg); chatHistory.push({ role: 'user', content: msg }); input.value = ''; btn.disabled = true;
  const typingId = 'typing-' + Date.now();
  const container = document.getElementById('ai-messages');
  const typingEl = document.createElement('div');
  typingEl.id = typingId; typingEl.className = 'msg msg-ai';
  typingEl.innerHTML = `<div class="msg-label">TrueCost AI</div><div class="msg-bubble"><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  container.appendChild(typingEl); container.scrollTop = container.scrollHeight;
  try {
    const messages = [{ role: 'system', content: buildSystemPrompt() }, ...chatHistory.slice(-8)];
    const text = await callAI(messages, 400);
    chatHistory.push({ role: 'assistant', content: text });
    document.getElementById(typingId)?.remove(); appendMsg('ai', text);
  } catch (err) { document.getElementById(typingId)?.remove(); appendMsg('ai', `${trAI('error.connectionPrefix', 'Connection error:')} ${err.message}`); }
  btn.disabled = false;
}

function quickQuestion(q) { document.getElementById('ai-input').value = q; sendAI(); }

function appendMsg(role, text) {
  const container = document.getElementById('ai-messages');
  const el = document.createElement('div'); el.className = `msg msg-${role}`;
  el.innerHTML = `<div class="msg-label">${role === 'ai' ? 'TrueCost AI' : 'You'}</div><div class="msg-bubble">${text.replace(/\n/g, '<br>')}</div>`;
  container.appendChild(el); container.scrollTop = container.scrollHeight;
}
