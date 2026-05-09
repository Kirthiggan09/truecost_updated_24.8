async function exportTrueCostPDF() {
  const t = window.i18nT || (k => k);
  if (!state.selectedCar || !state.trueCost) {
    alert(t('alert.selectCarFirst'));
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const car = state.selectedCar;
  const tc = state.trueCost;
  const carName = `${car.make || car.brand || ''} ${car.model || ''}`.trim();
  const salary = state.salary || 0;
  const existingLoans = state.existingLoans || 0;
  const expenses = state.expenses || 0;
  const totalPct = salary > 0 ? (tc.total / salary) * 100 : 0;
  const dti = salary > 0 ? (((state.loans || 0) + (state.budget || 0)) / salary) * 100 : 0;
  const remaining = salary - tc.total - existingLoans - expenses;
  const fmt = n => 'RM ' + Math.round(n).toLocaleString();

  const W = 210;
  const H = 297;
  const M = 18;
  const CW = W - M * 2;

  const BLACK      = [17, 17, 17];
  const CHARCOAL   = [35, 35, 35];
  const GOLD       = [201, 168, 56];
  const DARK_GOLD  = [142, 111, 40];
  const GOLD_LIGHT = [248, 243, 224];
  const DARK_GRAY  = [50, 50, 50];
  const GRAY       = [120, 120, 120];
  const BG         = [252, 251, 248];
  const BG_ALT     = [242, 241, 238];
  const BORDER     = [218, 200, 158];
  const WHITE      = [255, 255, 255];

  const SUCCESS    = [30, 130, 76];
  const SUCCESS_BG = [232, 245, 233];
  const WARNING    = [170, 110, 30];
  const WARNING_BG = [253, 243, 220];
  const DANGER     = [170, 40, 40];
  const DANGER_BG  = [250, 230, 230];

  // Verdict based on Total Cost % (matches Page 6)
  const statusColor = totalPct <= 25 ? SUCCESS  : totalPct <= 30 ? WARNING  : DANGER;
  const statusBg    = totalPct <= 25 ? SUCCESS_BG : totalPct <= 30 ? WARNING_BG : DANGER_BG;
  const statusLabel = totalPct <= 25 ? 'LOW RISK' : totalPct <= 30 ? 'MODERATE RISK' : 'HIGH RISK';
  const statusDesc  = totalPct <= 25
    ? 'Total cost is within healthy limits (<25%).'
    : totalPct <= 30
    ? 'Total cost approaching caution threshold (25-30%).'
    : 'Total cost exceeds recommended limits (>30%).';

  const setFont = (weight, size, color) => {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const truncateText = (text, maxWidth) => {
    if (doc.getTextWidth(text) <= maxWidth) return text;
    let t = text;
    while (doc.getTextWidth(t + '...') > maxWidth && t.length > 0) t = t.slice(0, -1);
    return t + '...';
  };

  const drawRoundedBox = (x, y, w, h, r, fill, stroke) => {
    if (fill)   doc.setFillColor(...fill);
    if (stroke) doc.setDrawColor(...stroke);
    const style = fill && stroke ? 'FD' : fill ? 'F' : stroke ? 'S' : '';
    doc.roundedRect(x, y, w, h, r, r, style);
  };

  const drawHBar = (x, y, w, h, pct, fillColor, bgColor) => {
    doc.setFillColor(...bgColor);
    doc.roundedRect(x, y, w, h, h/2, h/2, 'F');
    const barW = Math.max(h, w * Math.min(pct, 1));
    doc.setFillColor(...fillColor);
    doc.roundedRect(x, y, barW, h, h/2, h/2, 'F');
  };

  const drawSectionHeader = (title, yPos) => {
    setFont('bold', 7.5, DARK_GOLD);
    doc.text(title.toUpperCase(), M, yPos);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.line(M, yPos + 2, W - M, yPos + 2);
    return yPos + 8;
  };

  // ══════════════════════════════════════════════════════════
  // PAGE 1 — HEADER
  // ══════════════════════════════════════════════════════════
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, W, 36, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 36, W, 1.2, 'F');

  setFont('bold', 19, GOLD);
  doc.text('TRUE COST ANALYSIS', M, 16);

  setFont('normal', 8, WHITE);
  doc.text('Automotive Financial Assessment Report', M, 23);

  setFont('normal', 6.5, GRAY);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-MY', { day: '2-digit', month: 'long', year: 'numeric' })} | Reference: TC-${Date.now().toString(36).toUpperCase()}`,
    M, 30
  );

  const badgeW = 48;
  const badgeH = 9;
  const badgeX = W - M - badgeW;
  drawRoundedBox(badgeX, 6, badgeW, badgeH, 1.5, statusColor);
  setFont('bold', 7, WHITE);
  doc.text(statusLabel, badgeX + badgeW / 2, 12, { align: 'center' });

  // ── Vehicle & Borrower Profile ────────────────────────────
  let y = 44;
  y = drawSectionHeader('Vehicle & Borrower Profile', y);

  const leftCol  = M;
  const rightCol = M + CW / 2 + 4;
  const lineH    = 6.5;

  const profileLeft = [
    ['Vehicle', carName.toUpperCase()],
    ['Price', fmt(car.price)],
    ['Condition', car.condition || 'Used'],
    ['Loan Term', `${state.loanTermYears || 9} Years`],
  ];
  const profileRight = [
    ['Gross Salary', fmt(salary)],
    ['Existing Loans', fmt(existingLoans)],
    ['Living Expenses', fmt(expenses)],
    ['Downpayment', fmt(car.downpayment || car.price * 0.1)],
  ];

  profileLeft.forEach(([label, val], i) => {
    const rowY = y + i * lineH;
    setFont('normal', 7.5, GRAY);
    doc.text(label, leftCol, rowY);
    setFont('bold', 8, CHARCOAL);
    const maxW = (CW / 2) - 34;
    doc.text(truncateText(String(val), maxW), leftCol + 32, rowY);
  });

  profileRight.forEach(([label, val], i) => {
    const rowY = y + i * lineH;
    setFont('normal', 7.5, GRAY);
    doc.text(label, rightCol, rowY);
    setFont('bold', 8, CHARCOAL);
    doc.text(String(val), rightCol + 35, rowY);
  });

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(M + CW / 2, y - 3, M + CW / 2, y + profileLeft.length * lineH - 2);

  y += profileLeft.length * lineH + 4;

  // ── Key Metrics Cards ─────────────────────────────────────
  y = drawSectionHeader('Key Financial Metrics', y);

  const cardW = (CW - 8) / 3;
  const cardH = 28;

  const kpis = [
    { label: 'MONTHLY INSTALLMENT', val: fmt(tc.monthly_loan), sub: 'Principal + Interest' },
    { label: 'TRUE MONTHLY COST',   val: fmt(tc.total),        sub: 'All-in commitment' },
    { label: 'DEBT-TO-INCOME RATIO', val: dti.toFixed(1) + '%', sub: 'Total obligations' },
  ];

  kpis.forEach((k, i) => {
    const x = M + i * (cardW + 4);
    drawRoundedBox(x, y, cardW, cardH, 2, CHARCOAL, GOLD);
    doc.setFillColor(...GOLD);
    doc.rect(x, y + 3, 1.5, cardH - 6, 'F');

    setFont('bold', 6, GRAY);
    doc.text(`0${i + 1}`, x + 5, y + 7);

    setFont('bold', 6.5, WHITE);
    doc.text(k.label, x + 5, y + 12);

    setFont('bold', 14, GOLD);
    doc.text(k.val, x + 5, y + 22);

    setFont('normal', 6, GRAY);
    doc.text(k.sub, x + 5, y + 26.5);
  });

  y += cardH + 8;

  // ── Cost Breakdown Table ──────────────────────────────────
  y = drawSectionHeader('Monthly Cost Breakdown', y);

  const col1 = M;
  const col2 = M + 90;
  const col3 = M + 125;
  const col4 = W - M;
  const rowH = 6.5;

  doc.setFillColor(...BLACK);
  doc.rect(col1, y, CW, rowH, 'F');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(col1, y + rowH, col1 + CW, y + rowH);

  setFont('bold', 7, GOLD);
  doc.text('ITEM',        col1 + 4, y + 4.5);
  doc.text('FORMULA',     col2,     y + 4.5);
  doc.text('AMOUNT',      col3,     y + 4.5, { align: 'center' });
  doc.text('% OF SALARY', col4,     y + 4.5, { align: 'right' });
  y += rowH;

  const breakdownRows = [
    ['Loan Installment',    'Principal + Interest', tc.monthly_loan],
    ['Insurance / Takaful', 'Annual ÷ 12',          tc.insurance    || 0],
    ['Road Tax',            'Annual ÷ 12',           tc.roadtax      || 0],
    ['Maintenance Reserve', 'Estimated monthly',     tc.maint        || 0],
    ['Fuel Cost',           'Estimated monthly',     tc.fuel         || 0],
    ['Depreciation',        'Age-curve estimated',   tc.deprec       || 0],
    ['Tolls & Parking',     'Estimated monthly',     tc.tollParking  || 0],
  ];

  breakdownRows.forEach(([item, formula, amount], i) => {
    const rowY = y + i * rowH;
    doc.setFillColor(...(i % 2 === 0 ? BG : GOLD_LIGHT));
    doc.rect(col1, rowY, CW, rowH, 'F');
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.15);
    doc.line(col1, rowY + rowH, col1 + CW, rowY + rowH);

    setFont('normal', 7.5, CHARCOAL);
    doc.text(item, col1 + 4, rowY + 4.5);
    setFont('normal', 7, GRAY);
    doc.text(formula, col2, rowY + 4.5);
    setFont('bold', 7.5, CHARCOAL);
    doc.text(fmt(amount), col3, rowY + 4.5, { align: 'center' });
    const pct = salary > 0 ? ((amount / salary) * 100).toFixed(1) + '%' : '-';
    setFont('normal', 7, GRAY);
    doc.text(pct, col4, rowY + 4.5, { align: 'right' });
  });

  y += breakdownRows.length * rowH;

  doc.setFillColor(...BLACK);
  doc.rect(col1, y, CW, rowH + 1, 'F');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(col1, y, col1 + CW, y);

  setFont('bold', 8, GOLD);
  doc.text('TRUE MONTHLY COST', col1 + 4, y + 5.5);
  setFont('bold', 9.5, GOLD);
  doc.text(fmt(tc.total), col3, y + 5.5, { align: 'center' });
  setFont('bold', 8, GOLD);
  doc.text(totalPct.toFixed(1) + '%', col4, y + 5.5, { align: 'right' });
  y += rowH + 6;

  // ── Salary Allocation Bars ────────────────────────────────
  y = drawSectionHeader('Salary Allocation Analysis', y);

  const barData = [
    { label: 'Existing Loans',     val: existingLoans,          color: CHARCOAL, bg: BG_ALT },
    { label: 'Living Expenses',    val: expenses,               color: GRAY,     bg: BG_ALT },
    { label: 'New Car Commitment', val: tc.total,               color: GOLD,     bg: GOLD_LIGHT },
    { label: 'Net Remaining',      val: Math.max(0, remaining), color: remaining >= 0 ? SUCCESS : DANGER, bg: remaining >= 0 ? SUCCESS_BG : DANGER_BG },
  ];

  const BAR_LABEL_W = 42;
  const BAR_VAL_W   = 28;
  const BAR_START   = M + BAR_LABEL_W;
  const BAR_END     = W - M - BAR_VAL_W;
  const BAR_W       = BAR_END - BAR_START;
  const BAR_H       = 5.5;
  const BAR_GAP     = 9;
  const maxVal      = Math.max(salary, 1);

  barData.forEach((item, i) => {
    const rowY = y + i * BAR_GAP;
    setFont('normal', 7.5, CHARCOAL);
    doc.text(item.label, M, rowY + 4);
    drawHBar(BAR_START, rowY, BAR_W, BAR_H, item.val / maxVal, item.color, item.bg);
    setFont('bold', 7.5, item.color);
    doc.text(fmt(item.val), W - M, rowY + 4, { align: 'right' });
  });

  y += barData.length * BAR_GAP + 2;

  if (salary > 0) {
    const salX = BAR_START + BAR_W;
    doc.setDrawColor(...CHARCOAL);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([2, 1], 0);
    doc.line(salX, y - barData.length * BAR_GAP - 3, salX, y);
    doc.setLineDashPattern([], 0);
    setFont('bold', 6, CHARCOAL);
    doc.text('GROSS SALARY', salX, y + 2, { align: 'center' });
    y += 6;
  }



  // ── Page 1 Footer ─────────────────────────────────────────
  doc.setFillColor(...BLACK);
  doc.rect(0, H - 16, W, 16, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, H - 16, W, 0.6, 'F');

  setFont('normal', 6, GRAY);
  doc.text('CONFIDENTIAL — This document is for personal reference only and does not constitute financial advice or loan approval.', M, H - 9);

  setFont('bold', 7, GOLD);
  doc.text('TrueCost Analyzer', M, H - 5);
  setFont('normal', 6, GRAY);
  doc.text(` © ${new Date().getFullYear()}`, M + doc.getTextWidth('TrueCost Analyzer') + 1, H - 5);

  setFont('bold', 6, GOLD);
  doc.text('PAGE 1 OF 2', W - M, H - 5, { align: 'right' });

  // ══════════════════════════════════════════════════════════
  // PAGE 2 — LONG-TERM PROJECTIONS
  // ══════════════════════════════════════════════════════════
  doc.addPage();

  doc.setFillColor(...BLACK);
  doc.rect(0, 0, W, 36, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 36, W, 1.2, 'F');
  setFont('bold', 19, GOLD);
  doc.text('TRUE COST ANALYSIS', M, 16);
  setFont('normal', 8, WHITE);
  doc.text('Long-Term Projections & Wealth Impact', M, 23);
  setFont('normal', 6.5, GRAY);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-MY', { day: '2-digit', month: 'long', year: 'numeric' })} | Reference: TC-${Date.now().toString(36).toUpperCase()}`, M, 30);

  y = 44;

  // ── 5-Year Total Cost Breakdown ───────────────────────────
  y = drawSectionHeader('5-Year Total Cost Breakdown', y);

  // ── Data ──────────────────────────────────────────────────
  const mLoan  = tc.monthly_loan || 0;
  const mFuel  = tc.fuel         || 0;
  const mMaint = tc.maintenance  || tc.maint || 0;
  const mIns   = tc.insurance    || 0;
  const mRtax  = tc.roadtax      || 0;

  const annualDeprec = [
    car.price * 0.15,
    car.price * 0.10,
    car.price * 0.10,
    car.price * 0.10,
    car.price * 0.10,
  ];

  // Categories in stacking order (bottom → top)
  const cats = [
    { label: 'Loan',         color: [50,  50,  50],  val5: mLoan  * 60 },
    { label: 'Depreciation', color: [170, 110, 30],  val5: annualDeprec.reduce((a,b)=>a+b,0) },
    { label: 'Fuel',         color: [60,  120, 190], val5: mFuel  * 60 },
    { label: 'Insurance',    color: [120, 75,  175], val5: mIns   * 60 },
    { label: 'Maintenance',  color: [30,  130, 76],  val5: mMaint * 60 },
    { label: 'Road Tax',     color: [140, 140, 140], val5: mRtax  * 60 },
  ];

  // Cumulative annual totals (all cats, growing year by year)
  // Each cat contributes its annual slice; depreciation is non-linear yr 1 vs 2-5
  const catAnnual = (cat, yr) => {
    if (cat.label === 'Depreciation') return annualDeprec[yr - 1];
    return cat.val5 / 5;   // linear — same every year
  };

  const YRS = [1, 2, 3, 4, 5];
  // totalByYear[yi] = all-cat cumulative through end of year YRS[yi]
  const totalByYear = YRS.map(yr =>
    cats.reduce((sum, cat) => {
      for (let d = 1; d <= yr; d++) sum += catAnnual(cat, d);
      return sum;
    }, 0)
  );
  const grandTotal = totalByYear[4];
  const deprec5yr  = annualDeprec.reduce((a, b) => a + b, 0);
  const total5yr   = grandTotal;

  // ── Stacked bar + total line chart ────────────────────────
  const chLeft   = M + 16;
  const chRight  = W - M - 2;
  const chTop    = y;
  const chBottom = y + 65;
  const chW      = chRight - chLeft;
  const chH      = chBottom - chTop;
  const yAxisMax = grandTotal * 1.12;
  const toX      = yi  => chLeft + (yi / 4) * chW;   // yi = 0..4 → Year 1..5
  const toYv     = val => chBottom - (val / yAxisMax) * chH;

  // Background + grid
  doc.setFillColor(...BG_ALT);
  doc.rect(chLeft, chTop, chW, chH, 'F');

  for (let g = 0; g <= 4; g++) {
    const gVal = (g / 4) * yAxisMax;
    const gy   = toYv(gVal);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.18);
    doc.setLineDashPattern([1.5, 1.2], 0);
    doc.line(chLeft, gy, chRight, gy);
    doc.setLineDashPattern([], 0);
    setFont('normal', 5, GRAY);
    doc.text(gVal >= 1000 ? 'RM ' + Math.round(gVal / 1000) + 'k' : 'RM 0', chLeft - 1, gy + 1.2, { align: 'right' });
  }

  // Axes
  doc.setDrawColor(...CHARCOAL);
  doc.setLineWidth(0.45);
  doc.line(chLeft, chTop,    chLeft,  chBottom);
  doc.line(chLeft, chBottom, chRight, chBottom);

  YRS.forEach((yr, yi) => {
    // X-axis label
    setFont('bold', 5.5, CHARCOAL);
    doc.text('Year ' + yr, toX(yi), chBottom + 5, { align: 'center' });

    // Cumulative total callout above line point
    setFont('bold', 5.5, GOLD);
    doc.text(fmt(totalByYear[yi]), toX(yi), toYv(totalByYear[yi]) - 3, { align: 'center' });
  });

  // Gold total line
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  YRS.forEach((yr, yi) => {
    if (yi === 0) return;
    doc.line(toX(yi - 1), toYv(totalByYear[yi - 1]), toX(yi), toYv(totalByYear[yi]));
  });

  // Dots on line
  YRS.forEach((yr, yi) => {
    doc.setFillColor(...GOLD);
    doc.setDrawColor(...WHITE);
    doc.setLineWidth(0.4);
    doc.circle(toX(yi), toYv(totalByYear[yi]), 1.4, 'FD');
  });

  y = chBottom + 10;

  // ── Breakdown table: Category | Yr1 | Yr3 | Yr5 | % ──────
  const tblRowH = 7;
  const c1 = M;
  const c2 = M + 34;
  const c3 = M + 72;
  const c4 = M + 110;
  const c5 = W - M;

  // Header row
  doc.setFillColor(...BLACK);
  doc.rect(M, y, CW, tblRowH, 'F');
  setFont('bold', 6, GOLD);
  doc.text('CATEGORY',  c1 + 2,  y + 5);
  doc.text('YEAR 1',    c2 + 2,  y + 5);
  doc.text('YEAR 3',    c3 + 2,  y + 5);
  doc.text('YEAR 5',    c4 + 2,  y + 5);
  doc.text('% SHARE',   c5,      y + 5, { align: 'right' });
  y += tblRowH;

  cats.forEach((cat, ci) => {
    const rowY = y + ci * tblRowH;
    const yr1  = catAnnual(cat, 1);
    const yr3  = [1,2,3].reduce((s, d) => s + catAnnual(cat, d), 0);
    const yr5  = cat.val5;
    const pct  = grandTotal > 0 ? (yr5 / grandTotal * 100).toFixed(1) + '%' : '-';

    doc.setFillColor(...(ci % 2 === 0 ? BG : GOLD_LIGHT));
    doc.rect(M, rowY, CW, tblRowH, 'F');

    // Colour swatch
    doc.setFillColor(...cat.color);
    doc.roundedRect(c1 + 1, rowY + 2.2, 2.5, 2.5, 0.5, 0.5, 'F');

    setFont('normal', 6.5, CHARCOAL);
    doc.text(cat.label,   c1 + 5,  rowY + 5);
    doc.text(fmt(yr1),    c2 + 2,  rowY + 5);
    doc.text(fmt(yr3),    c3 + 2,  rowY + 5);
    setFont('bold', 6.5, CHARCOAL);
    doc.text(fmt(yr5),    c4 + 2,  rowY + 5);
    setFont('bold', 6.5, GRAY);
    doc.text(pct,         c5,      rowY + 5, { align: 'right' });
  });

  y += cats.length * tblRowH;

  // Grand total footer row
  doc.setFillColor(...BLACK);
  doc.rect(M, y, CW, tblRowH + 1, 'F');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(M, y, M + CW, y);
  const yr1Total = cats.reduce((s, cat) => s + catAnnual(cat, 1), 0);
  const yr3Total = YRS.slice(0, 3).reduce((s, yr) =>
    s + cats.reduce((cs, cat) => cs + catAnnual(cat, yr), 0), 0);
  setFont('bold', 7, GOLD);
  doc.text('TOTAL',        c1 + 2,  y + 5.5);
  doc.text(fmt(yr1Total),  c2 + 2,  y + 5.5);
  doc.text(fmt(yr3Total),  c3 + 2,  y + 5.5);
  doc.text(fmt(grandTotal),c4 + 2,  y + 5.5);
  doc.text('100%',         c5,      y + 5.5, { align: 'right' });

  y += tblRowH + 8;



  // ── Key Insight Box ───────────────────────────────────────
  const carPctOfSalary = salary > 0 ? ((tc.total / salary) * 100).toFixed(1) : '-';

  drawRoundedBox(M, y, CW, 22, 2, CHARCOAL, GOLD);
  doc.setFillColor(...GOLD);
  doc.rect(M, y + 3, 1.5, 16, 'F');

  setFont('bold', 8, GOLD);
  doc.text('KEY INSIGHT', M + 6, y + 7);
  setFont('normal', 7, WHITE);
  doc.text(`This vehicle will cost approximately ${fmt(total5yr)} over 5 years.`, M + 6, y + 12);
  doc.text(`The true monthly commitment consumes ${carPctOfSalary}% of your gross salary.`, M + 6, y + 16);
  setFont('normal', 7, GRAY);
  doc.text(`For every RM1 earned, RM${(tc.total / Math.max(salary, 1)).toFixed(2)} goes toward this vehicle.`, M + 6, y + 20);

  // ── Page 2 Footer ─────────────────────────────────────────
  doc.setFillColor(...BLACK);
  doc.rect(0, H - 16, W, 16, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, H - 16, W, 0.6, 'F');

  setFont('normal', 6, GRAY);
  doc.text('CONFIDENTIAL — This document is for personal reference only and does not constitute financial advice or loan approval.', M, H - 9);

  setFont('bold', 7, GOLD);
  doc.text('TrueCost Analyzer', M, H - 5);
  setFont('normal', 6, GRAY);
  doc.text(` © ${new Date().getFullYear()}`, M + doc.getTextWidth('TrueCost Analyzer') + 1, H - 5);

  setFont('bold', 6, GOLD);
  doc.text('PAGE 2 OF 2', W - M, H - 5, { align: 'right' });

  // ── Save ──────────────────────────────────────────────────
  const filename = `TrueCost_${carName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}