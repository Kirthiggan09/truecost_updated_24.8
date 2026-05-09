// ============================================================
// WEALTH CHARTS (SVG line + horizontal bars)
// ============================================================

// ============================================================
// TAB SWITCHER — pure DOM, no framework needed
// The bug was that panels used CSS classes but the toggle logic
// wasn't consistently mapping button IDs to panel IDs.
// Fixed: explicit ID mapping, single source of truth.
// ============================================================
function switchWcTab(tab) {
  // Update tab button active state
  document.getElementById('wc-tab-chart').classList.toggle('wc-active', tab === 'chart');
  document.getElementById('wc-tab-scenarios').classList.toggle('wc-active', tab === 'scenarios');

  // Show/hide panels
  const chartPanel = document.getElementById('wc-panel-chart');
  const scenarioPanel = document.getElementById('wc-panel-scenarios');

  if (tab === 'chart') {
    scenarioPanel.classList.remove('wc-visible');
    chartPanel.classList.add('wc-visible');
  } else {
    chartPanel.classList.remove('wc-visible');
    scenarioPanel.classList.add('wc-visible');
  }
}

// ============================================================
// HORIZON SELECTOR
// ============================================================
function setHorizon(years, btn) {
  wcState.horizon = years;
  document.querySelectorAll('.wc-horizon-btn').forEach(b => b.classList.remove('wc-h-active'));
  btn.classList.add('wc-h-active');
  drawWealthCharts();
}

function drawWealthCharts() {
  if (!state.selectedCar || !state.trueCost || !state.scenarioData) return;

  const { monthlyDiff, usedLoan, tc, isUsed } = state.scenarioData;
  const horizon = wcState.horizon;
  const months = horizon * 12;
  const saving = Math.max(0, monthlyDiff);
  const newTotal = tc.total;
  const usedTotal = usedLoan + tc.fuel + tc.insurance * 0.7 + tc.roadtax + tc.maint * 1.3;

  // Summary stats (always show 5yr and 10yr regardless of selected horizon)
  const wealth5 = compoundFV(saving, 60, 0.07);
  const wealth10 = compoundFV(saving, 120, 0.07);
  // Update monthly saving stat if comparison is shown
  if (state.showTrackBComparison) {
    document.getElementById('wc-monthly-saving').textContent = fmt(saving);
  }
  document.getElementById('wc-5yr-wealth').textContent = fmt(wealth5);
  document.getElementById('wc-10yr-wealth').textContent = fmt(wealth10);

  // Track A detail card (always shown)
  document.getElementById('wc-a-emi').textContent = fmt(newTotal);

  // Track B detail cards — only when Track B comparison is relevant
  if (state.showTrackBComparison) {
    document.getElementById('wc-b-emi').textContent = fmt(usedTotal);
    document.getElementById('wc-b-monthly-saving').textContent = fmt(saving);
    const wealthAtHorizon = compoundFV(saving, months, 0.07);
    document.getElementById('wc-a-outcome').textContent = `RM 0 portfolio after ${horizon} years`;
    document.getElementById('wc-b-outcome').textContent = `${fmt(wealthAtHorizon)} portfolio after ${horizon} years`;
  }

  const wealthAtHorizon = compoundFV(saving, months, 0.07);

  // ── SVG Line Chart ──────────────────────────────────────────
  document.getElementById('wc-line-title').textContent =
    `Investment Portfolio Growth — Track B vs Track A over ${horizon} Years (RM)`;

  const svgEl = document.getElementById('wc-line-svg');
  const W = 760, H = 220, PAD = { top: 20, right: 30, bottom: 35, left: 72 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  // Build yearly data points
  const pts = [];
  for (let y = 0; y <= horizon; y++) {
    pts.push({ year: y, b: compoundFV(saving, y * 12, 0.07) });
  }
  const maxVal = Math.max(...pts.map(p => p.b), 1);

  const xS = y => PAD.left + (y / horizon) * cW;
  const yS = v => PAD.top + cH - (v / maxVal) * cH;
  const fmtAx = v => v >= 1000000 ? `RM${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `RM${(v / 1000).toFixed(0)}k` : `RM${Math.round(v)}`;

  let s = '<g>';

  // Horizontal grid + Y labels
  for (let i = 0; i <= 4; i++) {
    const v = (maxVal / 4) * i;
    const yy = yS(v);
    s += `<line x1="${PAD.left}" y1="${yy}" x2="${W - PAD.right}" y2="${yy}" stroke="#1c1c1c" stroke-width="1"/>`;
    s += `<text x="${PAD.left - 6}" y="${yy + 4}" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="9" fill="#3a3a3a">${fmtAx(v)}</text>`;
  }

  // X axis labels
  for (let y = 0; y <= horizon; y++) {
    s += `<text x="${xS(y)}" y="${H - PAD.bottom + 16}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="9" fill="#3a3a3a">Yr ${y}</text>`;
  }

  // Track A — flat zero line
  s += `<line x1="${xS(0)}" y1="${yS(0)}" x2="${xS(horizon)}" y2="${yS(0)}" stroke="#2a2a2a" stroke-width="2" stroke-dasharray="5,4"/>`;

  // Track B fill + line (only draw when Track B comparison is relevant)
  if (state.showTrackBComparison) {
    const lineB = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xS(p.year).toFixed(1)},${yS(p.b).toFixed(1)}`).join(' ');
    const fillB = lineB + ` L${xS(horizon).toFixed(1)},${yS(0).toFixed(1)} L${xS(0).toFixed(1)},${yS(0).toFixed(1)} Z`;
    s += `<path d="${fillB}" fill="rgba(76,175,125,0.07)" stroke="none"/>`;
    s += `<path d="${lineB}" fill="none" stroke="#4caf7d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    // Dots + end label
    pts.forEach(p => {
      if (p.year > 0) s += `<circle cx="${xS(p.year).toFixed(1)}" cy="${yS(p.b).toFixed(1)}" r="3.5" fill="#4caf7d"/>`;
    });
    const lp = pts[pts.length - 1];
    s += `<text x="${xS(lp.year) + 8}" y="${yS(lp.b) + 4}" font-family="IBM Plex Mono,monospace" font-size="9" fill="#c9a84c" font-weight="600">${fmtAx(lp.b)}</text>`;
  }

  s += '</g>';
  svgEl.innerHTML = s;

  // ── Horizontal bar chart ─────────────────────────────────────
  const horizonA = newTotal * months;
  const horizonB = usedTotal * months;
  const wealthBuilt = wealthAtHorizon;
  const barMax = Math.max(horizonA, horizonB, wealthBuilt, 1);

  document.getElementById('wc-bar-new').style.width = (horizonA / barMax * 92) + '%';
  document.getElementById('wc-bar-new').textContent = fmt(horizonA);
  if (state.showTrackBComparison) {
    document.getElementById('wc-bar-used').style.width = (horizonB / barMax * 92) + '%';
    document.getElementById('wc-bar-used').textContent = fmt(horizonB);
  }
  document.getElementById('wc-bar-wealth').style.width = (wealthBuilt / barMax * 92) + '%';
  document.getElementById('wc-bar-wealth').textContent = fmt(wealthBuilt);
}

