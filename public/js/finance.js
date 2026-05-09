// ============================================================
// FINANCE CALCULATIONS
// ============================================================

function loanPayment(principal, flatRate, months) {
  const years = months / 12;
  const totalInterest = principal * flatRate * years;
  return (principal + totalInterest) / months;
}

function recalcFinance() {
  state.salary = parseFloat(document.getElementById('fi-salary').value) || 0;
  const existingLoans = parseFloat(document.getElementById('fi-loans').value) || 0;
  const ptptnRepayment = parseFloat(document.getElementById('fi-ptptn').value) || 0;
  state.ptptn = ptptnRepayment;
  state.existingLoans = existingLoans;
  state.loans = existingLoans + ptptnRepayment;
  state.expenses = parseFloat(document.getElementById('fi-expenses').value) || 0;
  state.savings = parseFloat(document.getElementById('fi-savings').value) || 0;
  state.emergency = parseFloat(document.getElementById('fi-emergency').value) || 0;
  state.age = parseInt(document.getElementById('fi-age').value) || 28;
  state.dependents = parseInt(document.getElementById('fi-dependents').value) || 0;
  state.stability = document.getElementById('fi-stability').value;
  if (!state.salary) return;

  const loanTermMonths = (state.loanTermYears || 7) * 12;
  const disposable = state.salary - state.loans - state.expenses;
  const stabilityFactor = state.stability === 'high' ? 1 : state.stability === 'medium' ? 0.85 : 0.7;
  const depFactor = Math.max(0.7, 1 - state.dependents * 0.05);
  const maxCarPct = 0.20 * stabilityFactor * depFactor;
  const budget = state.salary * maxCarPct;
  const emergencyTarget = state.expenses * 6;
  const emergencyOk = state.emergency >= emergencyTarget;
  const freeSavings = Math.max(0, state.savings - state.emergency);
  const downPayment = freeSavings * 0.3;
  const loanTermYrs = state.loanTermYears || 7;
  const flatRate = 0.035;
  const loanPrincipal = budget * loanTermMonths / (1 + flatRate * loanTermYrs);
  const maxPrice = loanPrincipal + downPayment;
  const remaining = disposable - budget;
  const dti = ((state.loans + budget) / state.salary) * 100;
  state.budget = budget; state.dti = dti; state.maxPrice = maxPrice; state.downPayment = downPayment;

  document.getElementById('res-budget').textContent = fmt(budget);
  document.getElementById('res-maxprice').textContent = fmt(maxPrice);
  document.getElementById('res-disposable').textContent = fmt(disposable);
  document.getElementById('res-remaining').innerHTML = remaining >= 0 ? fmt(remaining) : `<span style="color:var(--red)">${fmt(remaining)} shortfall</span>`;
  document.getElementById('res-dti').textContent = dti.toFixed(1) + '%';
  document.getElementById('res-emergency-status').innerHTML = emergencyOk
    ? `<span style="color:var(--green)">✓ Adequate (${fmt(state.emergency)})</span>`
    : `<span style="color:var(--amber)">⚠ Low — need ${fmt(emergencyTarget - state.emergency)} more</span>`;

  const gauge = document.getElementById('res-gauge'), badge = document.getElementById('res-badge'), advice = document.getElementById('res-advice');
  const gaugePct = Math.min(100, (dti / 60) * 100);
  gauge.style.width = gaugePct + '%';
  const loansNote = state.loans > 0 ? `<br><br>📋 Existing loans: <strong>${fmt(state.loans)}/month</strong>.` : '';
  const emergencyNote = !emergencyOk ? `<br><br>⚠️ Emergency fund below 6-month target (${fmt(emergencyTarget)}).` : '';

  if (dti < 30) {
    badge.className = 'badge badge-safe'; badge.textContent = 'COMFORTABLE';
    advice.innerHTML = `<p style="font-size:0.78rem;color:var(--text-dim);line-height:1.6">Finances look healthy. Target a car up to <strong style="color:var(--gold)">${fmt(maxPrice)}</strong> over ${loanTermYrs} years.${emergencyNote}${loansNote}</p>`;
  } else if (dti < 50) {
    badge.className = 'badge badge-risky'; badge.textContent = 'MANAGEABLE';
    advice.innerHTML = `<p style="font-size:0.78rem;color:var(--amber);line-height:1.6">Debt obligations are stretching your finances. Safer target: under <strong>${fmt(maxPrice * 0.75)}</strong>.${emergencyNote}${loansNote}</p>`;
  } else {
    badge.className = 'badge badge-danger'; badge.textContent = 'STRETCH';
    advice.innerHTML = `<p style="font-size:0.78rem;color:var(--red);line-height:1.6">⚠️ High risk. Disposable income is only <strong>${fmt(disposable)}</strong>/month after commitments.${emergencyNote}${loansNote}</p>`;
  }
}

// ============================================================
// TRUE COST CALC
// ============================================================
function calcTrueCost() {
  const car = state.selectedCar;
  if (!car) return;
  const tr = typeof window.i18nT === 'function' ? window.i18nT : (k) => k;
  const carLabel = car.brand ? `${car.brand} ${car.model}` : `${car.make} ${car.model}`;
  const trueCostPrefix = tr('p4.trueCostPrefix') === 'p4.trueCostPrefix' ? 'True Cost' : tr('p4.trueCostPrefix');
  document.getElementById('p4-title').textContent = `${trueCostPrefix}: ${carLabel}`;

  const engineCC = parseEngineCC(car);

  // Sync costState from state if available
  if (state.loanTermYears) costState.loanTermYears = state.loanTermYears;

  // ── 1. Loan Installment ──
  const loanData = calcLoanDetails(car);
  const monthly_loan = loanData.monthly;

  // ── 2. Fuel (uses fuel.js) ──
  const fuelResult = calculateFuel({
    car,
    dailyCommute: fuelState.dailyCommute,
    fuelType: fuelState.fuelType === 'auto' ? undefined : fuelState.fuelType,
    hasSubsidy: fuelState.hasSubsidy,
    traffic: fuelState.traffic,
    driving: fuelState.driving,
    ac: fuelState.ac
  });
  fuelState.lastResult = fuelResult;
  const fuel = fuelResult.monthly_fuel_cost;

  // ── 3. Insurance (PIAM tariff + NCD) ──
  const insData = calcInsuranceDetails(car);
  const insurance = insData.monthly;

  // ── 4. Road Tax (JPJ schedule) ──
  const rtData = calcRoadTaxDetails(engineCC);
  const roadtax = rtData.monthly;

  // ── 5. Maintenance (brand-tiered) ──
  const maintData = calcMaintenanceDetails(car);
  const maint = maintData.monthly;

  // ── 6. Depreciation (age-curve) ──
  const depData = calcDepreciationDetails(car);
  const deprec = depData.monthly;

  // ── 7. Tolls & Parking (user-configurable) ──
  const tpData = calcTollParkingDetails();
  const tollParking = tpData.total;

  const total = monthly_loan + fuel + insurance + roadtax + maint + deprec + tollParking;
  const total5yr = total * 60;
  state.trueCost = {
    monthly_loan, fuel, insurance, roadtax, maint, deprec, tollParking, total, total5yr, car, fuelResult,
    loanData, insData, rtData, maintData, depData, tpData
  };

  document.getElementById('cb-loan').textContent = fmt(monthly_loan);
  document.getElementById('cb-fuel').textContent = fmt(fuel);
  document.getElementById('cb-insurance').textContent = fmt(insurance);
  document.getElementById('cb-roadtax').textContent = fmt(roadtax);
  document.getElementById('cb-maint').textContent = fmt(maint);
  document.getElementById('cb-hidden').textContent = fmt(tollParking);
  document.getElementById('cb-deprec').textContent = fmt(deprec);
  document.getElementById('cb-5yr').textContent = fmt(total5yr);
  document.getElementById('cb-total').textContent = fmt(total);
  const pct = state.salary > 0 ? (total / state.salary) * 100 : 0;
  document.getElementById('ig-pct').textContent = pct.toFixed(0) + '%';

  // Set bar width and color
  const barEl = document.getElementById('ig-bar');
  const barWidth = Math.min(100, (pct / 40) * 100);
  barEl.style.width = barWidth + '%';
  const g25 = (25 / pct) * 100;
  const g30 = (30 / pct) * 100;
  barEl.style.background = `linear-gradient(to right,
  var(--green) 0%,
  var(--green) ${Math.min(g25, 100)}%,
  var(--amber) ${Math.min(g30, 100)}%,
  var(--red) 100%
)`;
  const safety = document.getElementById('cb-safety'), igAdvice = document.getElementById('ig-advice');

  if (pct <= 25) {
    safety.className = 'badge badge-safe';
    safety.textContent = '✓ COMFORTABLE';
    igAdvice.textContent = 'This car fits comfortably within the recommended 20-30% guideline.';
    igAdvice.style.color = 'var(--green)';
  }
  else if (pct <= 30) {
    safety.className = 'badge badge-risky';
    safety.textContent = '⚠ MANAGEABLE';
    igAdvice.textContent = 'At the upper limit of financial advisors\' 30% guideline. Monitor your budget carefully.';
    igAdvice.style.color = 'var(--amber)';
  }
  else {
    safety.className = 'badge badge-danger';
    safety.textContent = '✗ STRETCH';
    igAdvice.textContent = 'Exceeds the 30% guideline. This could strain your finances and limit savings.';
    igAdvice.style.color = 'var(--red)';
  }

  // Update detail panels
  renderFuelPanel(fuelResult);
  renderCostPanels(state.trueCost);
}

// ============================================================
// COST DETAIL PANELS RENDERER (Loan, Insurance, Road Tax, etc.)
// ============================================================
function renderCostPanels(tc) {
  if (!tc) return;
  const { loanData: ld, insData: ins, rtData: rt, maintData: mt, depData: dp, tpData: tp } = tc;

  // ── Loan Detail Panel ──
  const loanPanel = document.getElementById('loan-detail-panel');
  if (loanPanel && ld) {
    loanPanel.innerHTML = `
    <div class="fuel-specs-grid">
      <div class="fuel-spec"><div class="fuel-spec-label">DOWN PAYMENT</div><div class="fuel-spec-value">${ld.downPaymentPct}% (${fmt(ld.downPayment)})</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">LOAN AMOUNT</div><div class="fuel-spec-value">${fmt(ld.principal)}</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">FLAT RATE</div><div class="fuel-spec-value">${ld.flatRatePct}%</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">TENURE</div><div class="fuel-spec-value">${ld.years}yr (max ${ld.maxTenure}yr)</div></div>
    </div>
    <div class="fuel-cost-row">
      <div class="fuel-cost-item"><div class="fuel-cost-label">Total Interest</div><div class="fuel-cost-val" style="color:var(--red)">${fmt(ld.totalInterest)}</div></div>
      <div class="fuel-cost-item"><div class="fuel-cost-label">Total Repayment</div><div class="fuel-cost-val">${fmt(ld.totalRepayment)}</div></div>
      <div class="fuel-cost-item"><div class="fuel-cost-label">Monthly</div><div class="fuel-cost-val" style="color:var(--gold)">${fmt(ld.monthly)}</div></div>
      <div class="fuel-cost-item"><div class="fuel-cost-label">Car Age</div><div class="fuel-cost-val">${ld.carAge} years</div></div>
    </div>`;
  }

  // ── Insurance Detail Panel ──
  const insPanel = document.getElementById('insurance-detail-panel');
  if (insPanel && ins) {
    insPanel.innerHTML = `
    <div class="fuel-specs-grid">
      <div class="fuel-spec"><div class="fuel-spec-label">SUM INSURED</div><div class="fuel-spec-value">${fmt(ins.sumInsured)}</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">BASE PREMIUM</div><div class="fuel-spec-value">${fmt(ins.basePremium)}/yr</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">NCD</div><div class="fuel-spec-value">${ins.ncdPct}%  (−${fmt(ins.ncdDiscount)})</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">NET PREMIUM</div><div class="fuel-spec-value" style="color:var(--gold)">${fmt(ins.annualPremium)}/yr</div></div>
    </div>
    ${ins.ageLoading > 0 ? `<div class="fuel-adj-note"><span style="color:var(--amber)">⚠</span> Age loading: +${ins.ageLoading}% (car is ${ins.carAge} years old)</div>` : ''}`;
  }

  // ── Road Tax Detail Panel ──
  const rtPanel = document.getElementById('roadtax-detail-panel');
  if (rtPanel && rt) {
    rtPanel.innerHTML = `
    <div class="fuel-specs-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="fuel-spec"><div class="fuel-spec-label">ENGINE</div><div class="fuel-spec-value">${rt.engineCC.toLocaleString()}cc</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">ANNUAL</div><div class="fuel-spec-value" style="color:var(--gold)">${fmt(rt.annual)}/yr</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">MONTHLY</div><div class="fuel-spec-value">${fmt(rt.monthly)}/mo</div></div>
    </div>`;
  }

  // ── Maintenance Detail Panel ──
  const mtPanel = document.getElementById('maint-detail-panel');
  if (mtPanel && mt) {
    mtPanel.innerHTML = `
    <div class="fuel-specs-grid">
      <div class="fuel-spec"><div class="fuel-spec-label">BRAND TIER</div><div class="fuel-spec-value">${mt.brandTierLabel}</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">CAR AGE</div><div class="fuel-spec-value">${mt.carAge}yr (×${mt.ageMult})</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">SERVICE</div><div class="fuel-spec-value">${mt.serviceType === 'authorized' ? 'Authorized' : 'Independent'}</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">MONTHLY</div><div class="fuel-spec-value" style="color:var(--gold)">${fmt(mt.monthly)}</div></div>
    </div>
    <div class="fuel-cost-row" style="grid-template-columns:repeat(3,1fr)">
      <div class="fuel-cost-item"><div class="fuel-cost-label">Per Service Visit</div><div class="fuel-cost-val">~${fmt(mt.servicePerVisit)}</div></div>
      <div class="fuel-cost-item"><div class="fuel-cost-label">Tires (Annual)</div><div class="fuel-cost-val">~${fmt(mt.tiresAnnual)}</div></div>
      <div class="fuel-cost-item"><div class="fuel-cost-label">Annual Total</div><div class="fuel-cost-val">${fmt(mt.annual)}</div></div>
    </div>`;
  }

  // ── Depreciation Detail Panel ──
  const dpPanel = document.getElementById('deprec-detail-panel');
  if (dpPanel && dp) {
    dpPanel.innerHTML = `
    <div class="fuel-specs-grid">
      <div class="fuel-spec"><div class="fuel-spec-label">CURRENT VALUE</div><div class="fuel-spec-value">${fmt(dp.currentValue)}</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">ANNUAL RATE</div><div class="fuel-spec-value">${dp.annualRate}%</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">RETENTION</div><div class="fuel-spec-value">${dp.retentionLabel}</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">MONTHLY</div><div class="fuel-spec-value" style="color:var(--gold)">${fmt(dp.monthly)}</div></div>
    </div>
    <div class="fuel-cost-row" style="grid-template-columns:repeat(3,1fr)">
      <div class="fuel-cost-item"><div class="fuel-cost-label">Est. Value in 5yr</div><div class="fuel-cost-val" style="color:var(--green)">${fmt(dp.estimated5yrValue)}</div></div>
      <div class="fuel-cost-item"><div class="fuel-cost-label">Total Loss (5yr)</div><div class="fuel-cost-val" style="color:var(--red)">${fmt(dp.totalLoss5yr)}</div></div>
      <div class="fuel-cost-item"><div class="fuel-cost-label">Annual Loss</div><div class="fuel-cost-val">${fmt(dp.annualAmount)}</div></div>
    </div>`;
  }

  // ── Tolls & Parking Detail Panel ──
  const tpPanel = document.getElementById('tp-detail-panel');
  if (tpPanel && tp) {
    tpPanel.innerHTML = `
    <div class="fuel-specs-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="fuel-spec"><div class="fuel-spec-label">DAILY TOLL</div><div class="fuel-spec-value">RM ${tp.dailyToll.toFixed(0)}/day</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">MONTHLY TOLL</div><div class="fuel-spec-value">${fmt(tp.monthlyToll)}</div></div>
      <div class="fuel-spec"><div class="fuel-spec-label">PARKING</div><div class="fuel-spec-value">${fmt(tp.monthlyParking)}/mo</div></div>
    </div>`;
  }
}

// ============================================================
// COST CONTROLS — event handler for all Step 04 inputs
// ============================================================
function onCostInputChange() {
  const dp = document.getElementById('cost-downpayment');
  const tenure = document.getElementById('cost-tenure');
  const rate = document.getElementById('cost-rate');
  const ncd = document.getElementById('cost-ncd');
  const svcType = document.getElementById('cost-service-type');
  const toll = document.getElementById('cost-toll');
  const parking = document.getElementById('cost-parking');

  if (dp) { costState.downPaymentPct = parseFloat(dp.value) || 10; }
  if (tenure) { costState.loanTermYears = parseInt(tenure.value) || 9; state.loanTermYears = costState.loanTermYears; }
  if (rate) { costState.interestRate = rate.value; }
  if (ncd) { costState.ncdLevel = parseFloat(ncd.value); }
  if (svcType) { costState.serviceType = svcType.value; }
  if (toll) { costState.dailyToll = parseFloat(toll.value) || 0; }
  if (parking) { costState.monthlyParking = parseFloat(parking.value) || 0; }

  // Update displays
  const dpDisplay = document.getElementById('cost-dp-display');
  if (dpDisplay) dpDisplay.textContent = `${costState.downPaymentPct}%`;
  const tollDisplay = document.getElementById('cost-toll-display');
  if (tollDisplay) tollDisplay.textContent = `RM ${costState.dailyToll}`;

  calcTrueCost();
}

// ============================================================
// TOLL & PARKING MANUAL INPUTS — direct monthly RM entry
// ============================================================
function onTollParkingChange() {
  const monthlyTollEl = document.getElementById('tp-monthly-toll');
  const monthlyParkingEl = document.getElementById('tp-monthly-parking');

  const monthlyToll = parseFloat(monthlyTollEl?.value) || 0;
  const monthlyParking = parseFloat(monthlyParkingEl?.value) || 0;

  // Store directly as monthly values in costState
  costState.manualMonthlyToll = monthlyToll;
  costState.monthlyParking = monthlyParking;
  // Set dailyToll to 0 so the old formula doesn't double-count
  costState.dailyToll = 0;
  costState._manualTollOverride = monthlyToll;

  calcTrueCost();
}

// ============================================================
// FUEL PANEL RENDERER (Step 04 detail panel)
// ============================================================
function renderFuelPanel(fr) {
  const panel = document.getElementById('fuel-detail-panel');
  if (!panel || !fr) return;
  const sub = fr.subsidy || {};

  const fuelLabel = document.getElementById('cb-fuel-label');
  if (fuelLabel) {
    fuelLabel.textContent = `⛽ Fuel (${fr.monthly_distance_km.toLocaleString()}km/mo)`;
  }

  // Build subsidy breakdown HTML
  let subsidyHtml = '';
  if (sub.hasSubsidy && fr.fuel_type === 'RON95') {
    const quotaPct = Math.min(100, Math.round((fr.estimated_liters_used / sub.quotaLiters) * 100));
    subsidyHtml = `
    <div class="fuel-subsidy-breakdown">
      <div class="fuel-subsidy-title">⛽ RON95 Subsidy Quota (${sub.quotaLiters}L/month)</div>
      <div class="fuel-subsidy-bar-wrap">
        <div class="fuel-subsidy-bar">
          <div class="fuel-subsidy-fill ${sub.quotaExceeded ? 'exceeded' : ''}" style="width:${Math.min(quotaPct, 100)}%"></div>
        </div>
        <span class="fuel-subsidy-pct">${quotaPct}%</span>
      </div>
      <div class="fuel-subsidy-detail">
        <div class="fuel-subsidy-row">
          <span>✓ Subsidized: ${sub.subsidizedLiters}L × RM${sub.subsidizedPrice.toFixed(2)}</span>
          <span style="color:var(--green)">${fmt(sub.subsidizedCost)}</span>
        </div>
        ${sub.quotaExceeded ? `
        <div class="fuel-subsidy-row fuel-subsidy-over">
          <span>⚠ Over quota: ${sub.unsubsidizedLiters}L × RM${sub.unsubsidizedPrice.toFixed(2)}</span>
          <span style="color:var(--red)">${fmt(sub.unsubsidizedCost)}</span>
        </div>` : ''}
      </div>
    </div>`;
  } else if (!sub.hasSubsidy && fr.fuel_type === 'RON95') {
    subsidyHtml = `
    <div class="fuel-adj-note">
      <span style="color:var(--amber)">⚠</span> No subsidy — paying unsubsidized RON95 at RM${FUEL_PRICES.RON95_UNSUBSIDIZED.toFixed(2)}/L
    </div>`;
  }

  // Savings note
  let savingsHtml = '';
  if (fr.monthly_savings_from_subsidy > 0) {
    savingsHtml = `
    <div class="fuel-savings-note">
      <span style="color:var(--green)">💰</span> Subsidy saves you <strong style="color:var(--green)">RM ${Math.round(fr.monthly_savings_from_subsidy)}/mo</strong>
      (RM ${Math.round(fr.monthly_savings_from_subsidy * 12).toLocaleString()}/year)
    </div>`;
  }

  panel.innerHTML = `
    <div class="fuel-specs-grid">
      <div class="fuel-spec">
        <div class="fuel-spec-label">ENGINE</div>
        <div class="fuel-spec-value">${fr.engine_cc.toLocaleString()}cc</div>
      </div>
      <div class="fuel-spec">
        <div class="fuel-spec-label">EFFICIENCY</div>
        <div class="fuel-spec-value">${fr.fuel_efficiency_kml} km/L</div>
      </div>
      <div class="fuel-spec">
        <div class="fuel-spec-label">FUEL TYPE</div>
        <div class="fuel-spec-value">${fr.fuel_type}</div>
      </div>
      <div class="fuel-spec">
        <div class="fuel-spec-label">EFF. PRICE/L</div>
        <div class="fuel-spec-value">RM ${fr.fuel_price_per_liter.toFixed(2)}</div>
      </div>
    </div>
    <div class="fuel-cost-row">
      <div class="fuel-cost-item">
        <div class="fuel-cost-label">Monthly Distance</div>
        <div class="fuel-cost-val">${fr.monthly_distance_km.toLocaleString()} km</div>
      </div>
      <div class="fuel-cost-item">
        <div class="fuel-cost-label">Liters Used/mo</div>
        <div class="fuel-cost-val">${fr.estimated_liters_used} L</div>
      </div>
      <div class="fuel-cost-item">
        <div class="fuel-cost-label">Monthly Fuel</div>
        <div class="fuel-cost-val" style="color:var(--gold)">${fmt(fr.monthly_fuel_cost)}</div>
      </div>
      <div class="fuel-cost-item">
        <div class="fuel-cost-label">Annual Fuel</div>
        <div class="fuel-cost-val">${fmt(fr.annual_fuel_cost)}</div>
      </div>
    </div>
    ${fr.adjustment_multiplier !== 1.0 ? `
    <div class="fuel-adj-note">
      <span style="color:var(--amber)">⚡</span> Real-world adjustment: ×${fr.adjustment_multiplier}
      <span style="color:var(--text-faint)">(base: ${fr.base_liters_used}L → adjusted: ${fr.estimated_liters_used}L)</span>
    </div>` : ''}
    ${subsidyHtml}
    ${savingsHtml}
    <div class="fuel-insight">${fr.affordability_insight}</div>
  `;
}

// ============================================================
// FUEL CONTROLS — event handlers for Step 04 inputs
// ============================================================
function onFuelInputChange() {
  const commute = document.getElementById('fuel-commute');
  const fuelType = document.getElementById('fuel-type');
  const subsidyCheck = document.getElementById('fuel-subsidy');
  const traffic = document.getElementById('fuel-traffic');
  const driving = document.getElementById('fuel-driving');
  const ac = document.getElementById('fuel-ac');

  if (commute) fuelState.dailyCommute = parseFloat(commute.value) || DEFAULT_DAILY_COMMUTE;
  if (fuelType) fuelState.fuelType = fuelType.value;
  if (subsidyCheck) fuelState.hasSubsidy = subsidyCheck.checked;
  if (traffic) fuelState.traffic = traffic.value;
  if (driving) fuelState.driving = driving.value;
  if (ac) fuelState.ac = ac.value;

  // Update commute display
  const commuteDisplay = document.getElementById('fuel-commute-display');
  if (commuteDisplay) commuteDisplay.textContent = `${Math.round(fuelState.dailyCommute)} km`;

  calcTrueCost();
}


// SCENARIO DATA (feeds both panels)
// ============================================================
function calcScenarios() {
  const car = state.selectedCar;
  if (!car || !state.trueCost) return;
  const tc = state.trueCost;
  const isNew = car.type === 'new' || car.condition === 'New';
  const isRecond = car.condition === 'Recond';
  const isUsed = car.condition === 'Used' || car.type === 'used';
  const newPrice = car.price;

  const aInterest = (tc.monthly_loan * 84) - (newPrice * 0.9);
  const aRunning = (tc.fuel + tc.insurance + tc.roadtax + tc.maint) * 60;
  const aResale = Math.round(newPrice * 0.45);
  const aTotal = newPrice * 0.9 + aInterest + aRunning - aResale;
  const engineCC = car.engine > 50 ? car.engine : car.engineCC || 1500;
  const roadtax = engineCC <= 1000 ? 20 : engineCC <= 1300 ? 30 :
    engineCC <= 1500 ? 45 : engineCC <= 2000 ? 70 : 100;

  // Track B comparison rules:
  // - Any car, installment <= 25.1% of salary → skip (already affordable)
  // - Any car, installment > 25.1% of salary  → show comparison
  const pct = (state.salary > 0 && tc) ? (tc.total / state.salary) * 100 : 0;
  const isAffordable = pct <= 25.1;
  const skipTrackB = isAffordable;

  let trackBCar = null;
  state.showTrackBComparison = !skipTrackB;

  if (!skipTrackB) {
    trackBCar = findTrackBCar(car);
  }

  const usedPrice = trackBCar ? trackBCar.price : Math.round(newPrice * 0.65);
  state.trackBCar = trackBCar;
  renderTrackACarCard();

  // Show/hide Track B panel
  const trackBPanel = document.getElementById('trackb-panel');
  if (trackBPanel) {
    trackBPanel.style.display = skipTrackB ? 'none' : '';
  }
  // Show the "smart choice" used-car affirm message only when used + affordable
  const usedCarMessage = document.getElementById('p5-used-car-message');
  if (usedCarMessage) {
    usedCarMessage.style.display = (isUsed && isAffordable) ? '' : 'none';
  }

  if (!skipTrackB) {
    renderTrackBCarCard();
    // Update the Track B label in the wealth chart panel
    const wbLabelEl = document.getElementById('wc-b-label');
    if (wbLabelEl) {
      wbLabelEl.textContent = trackBCar
        ? `Track B — ${trackBCar.make} ${trackBCar.model} (${trackBCar.year})`
        : (isUsed ? 'The smarter alternative — Cheaper Pre-owned' : 'The smarter alternative — Pre-owned (~65% of price)');
    }
  }

  // Calculate Track B costs using actual car's engine size if available
  const trackBEngineCC = trackBCar ? (trackBCar.engine > 50 ? trackBCar.engine : trackBCar.engineCC || 1500) : (engineCC * 0.9);
  const trackBFuel = trackBEngineCC <= 1000 ? 380 : trackBEngineCC <= 1300 ? 480 : trackBEngineCC <= 1500 ? 580 : trackBEngineCC <= 2000 ? 700 : 900;

  const usedLoan = loanPayment(usedPrice * 0.9, 0.045, 84);
  const bInterest = (usedLoan * 84) - (usedPrice * 0.9);
  const bRunning = (trackBFuel + (usedPrice * 0.024 / 12) + roadtax + tc.maint * 1.3) * 60;
  const bResale = Math.round(usedPrice * 0.45);
  const bTotal = usedPrice * 0.9 + bInterest + bRunning - bResale;

  const monthlyDiff = tc.total - (usedLoan + tc.fuel + tc.insurance * 0.7 + tc.roadtax + tc.maint * 1.3);
  const r7 = 0.07 / 12;
  const fv5 = Math.max(0, monthlyDiff) * ((Math.pow(1 + r7, 60) - 1) / r7);
  const cOpp = aTotal - bTotal;

  // Cache for chart use
  state.scenarioData = { newPrice, usedPrice, aTotal, bTotal, fv5, monthlyDiff, usedLoan, tc, isUsed };
}

// ============================================================
// COMPOUND FUTURE VALUE HELPER
// ============================================================
function compoundFV(monthly, months, annualRate) {
  if (monthly <= 0) return 0;
  const r = annualRate / 12;
  return monthly * ((Math.pow(1 + r, months) - 1) / r);
}
