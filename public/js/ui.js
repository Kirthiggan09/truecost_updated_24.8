// ============================================================
// PAGE NAVIGATION
// ============================================================
const tr = (key, fallback) => {
  if (typeof window.i18nT === 'function') {
    const out = window.i18nT(key);
    if (out && out !== key) return out;
  }
  return fallback;
};

function goPage(n, source = 'nav') {
  const oldPage = state.currentPage;

    const nav5 = document.getElementById('nav-5');
    if (nav5) nav5.style.display = '';

  state.currentPage = n;
  const currentActive = document.querySelector('.page.active');
  const next = document.getElementById('page-' + n);
  if (!next) return;
  if (currentActive && currentActive !== next) {
    currentActive.classList.add('exit');
    currentActive.classList.remove('active');
    setTimeout(() => { currentActive.classList.remove('exit'); }, 220);
  }
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo({ top: 0 });
  next.classList.add('active');
  updatePageProgress(n);

  // Nav step highlighting — logical order: 1,2,7,3,4,5,6
  const navOrder = [1, 2, 7, 3, 4, 5, 6];
  const navSteps = document.querySelectorAll('.nav-step');
  const currentIdx = navOrder.indexOf(n);
  navSteps.forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i === currentIdx) s.classList.add('active');
    else if (i < currentIdx) s.classList.add('done');
  });

  if (n === 4) {
    calcTrueCost();
    if(typeof renderDealerActions === 'function') renderDealerActions();
  }
  if (n === 5) {
    calcTrueCost();
    if (!state.selectedCar || !state.trueCost) {
      const wealthEl = document.getElementById('p5-wealth-analysis');
      if (wealthEl) wealthEl.innerHTML =
        '<p style="color:var(--text-dim);padding:2rem 0">Please select a car in Step 4 first.</p>';
      return;
    }
    calcScenarios();
    drawWealthCharts();
    updateP5Framing();
  }
  if (n === 6) {
    calcTrueCost();
    calcScenarios();
    buildInsights();
    if (!state.analysisGenerated && !state.analysisInProgress && state.selectedCar && state.salary) {
      setTimeout(() => runFullAnalysis(), 50);
    }
  }
}

function updatePageProgress(n) {
  if (!window.matchMedia('(max-width: 768px)').matches) return;
  // Map page number to logical step label (1,2,7,3,4,5,6 → steps 1-7)
  const stepMap = {1:1, 2:2, 7:3, 3:4, 4:5, 5:6, 6:7};
  const stepNum = stepMap[n] || n;
  const progressText = `${tr('common.step', 'Step')} ${stepNum} ${tr('common.of', 'of')} 7`;
  const homeProgress = document.getElementById('home-progress');
  if (homeProgress) homeProgress.textContent = progressText;
  const activePage = document.getElementById('page-' + n);
  const activePageNum = activePage ? activePage.querySelector('.page-num') : null;
  if (activePageNum) activePageNum.textContent = progressText;
}

// ============================================================
// LOAN TERM SELECTOR
// ============================================================
function setLoanTerm(years, btn) {
  state.loanTermYears = years;
  document.querySelectorAll('.loan-term-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('term-label').textContent = years + 'yr';
  recalcFinance();
}

// ============================================================
// AI INSIGHTS CONTEXT (Page 6 sidebar)
// ============================================================
function buildInsights() {
  const car = state.selectedCar;
  const tc = state.trueCost;
  if (!car || !tc || !state.salary) return;
  const pct = (tc.total / state.salary * 100).toFixed(1);
  const cName = `${car.make || car.brand} ${car.model}`;
  const isUsed = car.condition === 'Used' || car.type === 'used';

  let altLine = '';
  if (!isUsed && state.trackBCar) {
    const saving = Math.round(tc.total - (state.scenarioData?.usedLoan || tc.total * 0.65));
    altLine = `<br><span style="color:var(--green);font-size:0.7rem">Alt: ${state.trackBCar.make} ${state.trackBCar.model} (${state.trackBCar.year}) @ RM${state.trackBCar.price.toLocaleString()} — ${Math.round((1 - state.trackBCar.price / car.price) * 100)}% cheaper</span>`;
  } else if (isUsed) {
    altLine = `<br><span style="color:var(--green);font-size:0.7rem">✓ Pre-owned choice — depreciation already absorbed</span>`;
  }

  document.getElementById('chat-context-summary').innerHTML =
    `<strong style="color:var(--gold)">${cName}</strong> (${car.condition || car.type}) · RM${car.price.toLocaleString()}<br>` +
    `Salary: RM${state.salary.toLocaleString()} · DTI: ${state.dti.toFixed(1)}%<br>` +
    `<span style="font-size:0.7rem;color:var(--text-faint)">` +
    `Loan: RM${Math.round(tc.monthly_loan).toLocaleString()} · ` +
    `Fuel: RM${Math.round(tc.fuel).toLocaleString()} · ` +
    `Ins: RM${Math.round(tc.insurance).toLocaleString()} · ` +
    `Tax: RM${Math.round(tc.roadtax).toLocaleString()} · ` +
    `Maint: RM${Math.round(tc.maint).toLocaleString()} · ` +
    `Deprec: RM${Math.round(tc.deprec).toLocaleString()}</span><br>` +
    `<strong>TRUE TOTAL: RM${Math.round(tc.total).toLocaleString()}/mo (${pct}% of income)</strong>` +
    altLine;
}

// Dynamic Page 5 framing based on installment % of salary and car condition
function updateP5Framing() {
  const car = state.selectedCar;
  if (!car) return;

  const isUsed = car.condition === 'Used' || car.type === 'used';
  const isNew = car.condition === 'New' || car.type === 'new';
  const isAiPicked = state.aiRecoIds.includes(car.id);
  const pct = state.trueCost && state.salary
    ? (state.trueCost.total / state.salary) * 100 : 0;
  const isOverBudget = pct > 30;

  // Unified affordability check: loan installment < 25% of salary → skip comparison
  const monthlyLoanPct = (state.salary > 0 && state.trueCost)
    ? (state.trueCost.monthly_loan / state.salary) * 100 : 0;
  const isAffordable = pct <= 25.1;

  // Hide/show Track B bar row in chart
  const trackBBarRow = document.getElementById('trackb-bar-row');
  if (trackBBarRow) trackBBarRow.style.display = isAffordable ? 'none' : '';

  // Hide entire wealth analysis section if affordable
  const wcStats = document.querySelector('.wc-stats');
  const wcPanelChart = document.getElementById('wc-panel-chart');
  if (wcStats) wcStats.style.display = isAffordable ? 'none' : '';
  if (wcPanelChart) wcPanelChart.style.display = isAffordable ? 'none' : '';

  if (isUsed && isAffordable) {
    // Used car, installment < 25% — affirm the smart choice
    document.getElementById('p5-title').textContent = "We are good to go!";
    document.getElementById('p5-desc').textContent = tr('p5.usedCar.desc', 'You chose a pre-owned vehicle — already the financially smarter path. Here is your full ownership cost picture.');
    const savingLabelEl = document.getElementById('wc-monthly-saving-label');
    if (savingLabelEl) savingLabelEl.textContent = 'Depreciation Avoided (vs buying new)';
    const savingValEl = document.getElementById('wc-monthly-saving');
    if (savingValEl && car.price) {
      const estimatedNewPrice = car.price * 1.50;
      const deprecAvoided = estimatedNewPrice * 0.18;
      savingValEl.textContent = 'RM ' + Math.round(deprecAvoided).toLocaleString();
      const deprecSavedEl = document.getElementById('p5-deprec-saved');
      if (deprecSavedEl) deprecSavedEl.textContent = 'RM ' + Math.round(deprecAvoided).toLocaleString();
      const newEquivEl = document.getElementById('p5-new-equiv');
      if (newEquivEl) newEquivEl.textContent = 'RM ' + Math.round(estimatedNewPrice).toLocaleString();
    }
  } else if (isAffordable) {
    // New car, installment < 25% — well within budget, no comparison needed
    document.getElementById('p5-title').textContent = "We are good to go!";
    document.getElementById('p5-desc').textContent = "Your monthly installment is comfortably below 25% of your income. This car is a solid, affordable choice.";
    const savingLabelEl = document.getElementById('wc-monthly-saving-label');
    if (savingLabelEl) savingLabelEl.textContent = 'Loan Installment (% of Salary)';
    const savingValEl = document.getElementById('wc-monthly-saving');
    if (savingValEl) savingValEl.textContent = monthlyLoanPct.toFixed(1) + '%';
  } else if (isUsed) {
    // Used car, installment ≥ 25% — suggest a cheaper used alternative
    document.getElementById('p5-title').textContent = tr('p5.usedOver25.title', 'Consider a Cheaper Alternative');
    document.getElementById('p5-desc').textContent = tr('p5.usedOver25.desc',
      'Your used car installment exceeds 25% of your income. Here\'s a more affordable pre-owned option that could save you money and build wealth.');
    document.getElementById('wc-b-label').textContent = tr('p5.usedOver25.altLabel', 'The smarter alternative — Cheaper Pre-owned');
    document.getElementById('sc-b-tag') && (document.getElementById('sc-b-tag').textContent = '✓ RECOMMENDED');
    document.getElementById('sc-b-title') && (document.getElementById('sc-b-title').textContent = tr('p5.usedOver25.goLeaner', 'Go Even Cheaper'));
    document.getElementById('sc-b-sub') && (document.getElementById('sc-b-sub').textContent = tr('p5.usedOver25.goLeanerSub', 'A lower-priced used car keeps more money in your pocket each month.'));
    document.getElementById('bar-b-label').textContent = tr('p5.dynamic.smarterAlt', 'The smarter alternative');
    const savingLabelEl = document.getElementById('wc-monthly-saving-label');
    if (savingLabelEl) savingLabelEl.textContent = 'Monthly Saving (Cheaper vs Current)';
  } else if (isAiPicked && !isOverBudget) {
    // New car, AI-picked, within budget — soft optional framing
    document.getElementById('p5-title').textContent = tr('p5.dynamic.exploreTitle', 'Explore Your Options');
    document.getElementById('p5-desc').textContent = tr('p5.dynamic.exploreDesc', 'Your chosen car fits your budget well. Here\'s what an even leaner choice could unlock — purely for your awareness.');
    document.getElementById('wc-b-label').textContent = tr('p5.dynamic.lighterAlt', 'The smarter alternative — Lighter Option (optional)');
    document.getElementById('sc-b-tag') && (document.getElementById('sc-b-tag').textContent = '✦ CURIOUS? EXPLORE THIS');
    document.getElementById('sc-b-title') && (document.getElementById('sc-b-title').textContent = tr('p5.dynamic.goLeaner', 'Go Even Leaner'));
    document.getElementById('sc-b-sub') && (document.getElementById('sc-b-sub').textContent = tr('p5.dynamic.goLeanerSub', 'Your pick is already solid. This shows what extra savings could grow into.'));
    document.getElementById('bar-b-label').textContent = tr('p5.dynamic.smarterAlt', 'The smarter alternative');
    const savingLabelEl = document.getElementById('wc-monthly-saving-label');
    if (savingLabelEl) savingLabelEl.textContent = 'Monthly Saving (Used vs New)';
  } else {
    // New car, installment ≥ 25% — stronger push to consider alternative
    document.getElementById('p5-title').textContent = tr('p5.title', 'Wealth Gap Analysis');
    document.getElementById('p5-desc').textContent = tr('p5.dynamic.gapDesc', 'Your selected car exceeds the recommended budget. See the financial cost of that decision — and what a smarter alternative could build for you.');
    document.getElementById('wc-b-label').textContent = tr('p5.dynamic.preownedAlt', 'The smarter alternative — Pre-owned (~65% of price)');
    document.getElementById('sc-b-tag') && (document.getElementById('sc-b-tag').textContent = '✓ RECOMMENDED');
    document.getElementById('sc-b-title') && (document.getElementById('sc-b-title').textContent = tr('p5.dynamic.buyUsed', 'Buy Used (3yr old)'));
    document.getElementById('sc-b-sub') && (document.getElementById('sc-b-sub').textContent = tr('p5.dynamic.buyUsedSub', 'Biggest depreciation already absorbed.'));
    document.getElementById('bar-b-label').textContent = tr('p5.dynamic.smarterAlt', 'The smarter alternative');
    const savingLabelEl = document.getElementById('wc-monthly-saving-label');
    if (savingLabelEl) savingLabelEl.textContent = 'Monthly Saving (Used vs New)';
  }
}

updatePageProgress(state.currentPage || 1);

// ============================================================
// WHATSAPP SHARE
// ============================================================
function shareTrueCostWhatsApp() {
  if (!state.selectedCar || !state.trueCost) return;

  const car = state.selectedCar;
  const tc = state.trueCost;
  const cName = `${car.make || car.brand} ${car.model}`;
  const fmt = n => 'RM ' + Math.round(n).toLocaleString();

  // 1. Setup Canvas
  const W = 800;
  const H = 1000;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Theme Colors (matching PDF)
  const BLACK = '#111111';
  const CHARCOAL = '#232323';
  const GOLD = '#c9a838';
  const DARK_GOLD = '#8e6f28';
  const BG = '#fcfbf8';
  const STRIPE = '#f2f1ee';
  const BORDER = '#dac89e';
  const GRAY = '#787878';
  const WHITE = '#ffffff';

  const fontFam = 'Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

  // 2. Fill Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // 3. Header Box
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, W, 120);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 120, W, 8);

  ctx.font = `bold 46px ${fontFam}`;
  ctx.fillStyle = GOLD;
  ctx.fillText('TRUE COST ANALYSIS', 40, 65);

  ctx.font = `24px ${fontFam}`;
  ctx.fillStyle = WHITE;
  ctx.fillText('Automotive Financial Assessment', 40, 100);

  // 4. Vehicle Details
  let y = 190;
  ctx.font = `bold 24px ${fontFam}`;
  ctx.fillStyle = DARK_GOLD;
  ctx.fillText('VEHICLE PROFILE', 40, y);

  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, y + 15);
  ctx.lineTo(W - 40, y + 15);
  ctx.stroke();

  y += 60;
  ctx.font = `26px ${fontFam}`;
  ctx.fillStyle = GRAY;
  ctx.fillText('Vehicle:', 40, y);
  ctx.fillStyle = CHARCOAL;
  ctx.font = `bold 30px ${fontFam}`;
  ctx.fillText(`${cName} (${car.year})`, 160, y);

  y += 50;
  ctx.font = `26px ${fontFam}`;
  ctx.fillStyle = GRAY;
  ctx.fillText('Price:', 40, y);
  ctx.fillStyle = CHARCOAL;
  ctx.font = `bold 30px ${fontFam}`;
  ctx.fillText(fmt(car.price), 160, y);

  // 5. Monthly Breakdown
  y += 90;
  ctx.font = `bold 24px ${fontFam}`;
  ctx.fillStyle = DARK_GOLD;
  ctx.fillText('MONTHLY COST BREAKDOWN', 40, y);

  ctx.beginPath();
  ctx.moveTo(40, y + 15);
  ctx.lineTo(W - 40, y + 15);
  ctx.stroke();

  y += 30;
  const drawRow = (label, value, isStriped) => {
    if (isStriped) {
      ctx.fillStyle = STRIPE;
      ctx.fillRect(40, y, W - 80, 56);
    }
    ctx.font = `26px ${fontFam}`;
    ctx.fillStyle = CHARCOAL;
    ctx.fillText(label, 60, y + 38);
    ctx.font = `bold 26px ${fontFam}`;
    ctx.textAlign = 'right';
    ctx.fillText(value, W - 60, y + 38);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#e6dfd1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, y + 56);
    ctx.lineTo(W - 40, y + 56);
    ctx.stroke();
    y += 56;
  };

  drawRow('🏦 Loan Installment', fmt(tc.monthly_loan), false);
  drawRow('⛽ Fuel Cost', fmt(tc.fuel), true);
  drawRow('🛡️ Insurance', fmt(tc.insurance), false);
  drawRow('🧾 Road Tax', fmt(tc.roadtax), true);
  drawRow('🔧 Maintenance', fmt(tc.maint), false);
  drawRow('📉 Depreciation', fmt(tc.deprec), true);

  // 6. Total Box
  y += 50;
  ctx.fillStyle = BLACK;
  ctx.fillRect(40, y, W - 80, 120);

  ctx.fillStyle = GOLD;
  ctx.fillRect(40, y, W - 80, 6);

  ctx.font = `bold 26px ${fontFam}`;
  ctx.fillStyle = GOLD;
  ctx.fillText('TRUE MONTHLY COST', 80, y + 56);

  ctx.font = `bold 58px ${fontFam}`;
  ctx.textAlign = 'right';
  ctx.fillText(fmt(tc.total), W - 80, y + 84);
  ctx.textAlign = 'left';

  // 7. Footer
  y += 180;
  ctx.font = `italic 22px ${fontFam}`;
  ctx.fillStyle = GRAY;
  ctx.textAlign = 'center';
  ctx.fillText('Calculate your own true cost at TrueCost!', W / 2, y);

  // 8. Export and Share/Download
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const filename = `TrueCost_${cName.replace(/[^a-zA-Z0-9]/g, '_')}_${car.year}.jpeg`;

  // Provide the text link for WhatsApp so it always opens WhatsApp directly
  const shareText = `🚗 *My TrueCost Reality Check*\n` +
    `Car: ${cName} (${car.year})\n` +
    `Price: RM ${Math.round(car.price).toLocaleString()}\n\n` +
    `*🔥 TRUE MONTHLY COST: RM ${Math.round(tc.total).toLocaleString()}*\n\n` +
    `Check it out at TrueCost.my`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const triggerDownloadAndOpenWa = () => {
    // 1. Download the JPEG card as backup
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 2. Open WhatsApp link
    window.open(waUrl, '_blank');
  };

  // Try to copy the image to clipboard so the user can just hit 'Paste' in WhatsApp
  try {
    canvas.toBlob(blob => {
      if (navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(() => {
          triggerDownloadAndOpenWa();
        }).catch(() => {
          triggerDownloadAndOpenWa();
        });
      } else {
        triggerDownloadAndOpenWa();
      }
    }, 'image/png');
  } catch (err) {
    triggerDownloadAndOpenWa();
  }
}
