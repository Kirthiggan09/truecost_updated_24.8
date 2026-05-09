// ============================================================
// COSTS CALCULATION SERVICE — Malaysian Market (All Step 04)
// ============================================================

// ── USER-CONFIGURABLE STATE ─────────────────────────────────
const costState = {
  downPaymentPct: 10,          // % down payment
  loanTermYears: 9,            // loan tenure
  interestRate: 'auto',        // 'auto', or custom float
  ncdLevel: 55,                // NCD %: 0, 25, 30, 38.33, 45, 55
  insuranceType: 'comprehensive',
  serviceType: 'authorized',   // 'authorized' or 'independent'
  dailyToll: 5,               // RM per day
  monthlyParking: 150,         // RM per month
  commuteType: 'urban'         // 'urban', 'suburban', 'rural'
};

// ============================================================
// 1. LOAN INSTALLMENT — Malaysian Hire Purchase
// ============================================================
// Malaysian banks use FLAT RATE (not reducing balance for most HP)
// Typical rates (2024-2026):
//   New car:     2.5% - 3.5% flat
//   Used (1-5yr): 3.0% - 4.0% flat
//   Used (5-10yr): 3.5% - 4.5% flat
//   Used (10yr+): 4.0% - 5.5% flat
//   Recond:      3.5% - 4.5% flat
// Max loan tenure:
//   New: up to 9 years
//   Used: 9 years minus car age (min 5 years)

function calcLoanDetails(car) {
  const price = car.price || 0;
  const dpPct = costState.downPaymentPct / 100;
  const downPayment = price * dpPct;
  const principal = price - downPayment;

  const isNew = car.condition === 'New' || car.type === 'new';
  const carAge = car.year ? (new Date().getFullYear() - car.year) : 5;

  // Auto interest rate based on condition + age
  let flatRate;
  if (costState.interestRate !== 'auto') {
    flatRate = parseFloat(costState.interestRate) / 100;
  } else if (isNew) {
    flatRate = 0.030;
  } else if (carAge <= 5) {
    flatRate = 0.035;
  } else if (carAge <= 10) {
    flatRate = 0.042;
  } else {
    flatRate = 0.050;
  }

  // Max tenure: new=9yr, used=max(5, 9-carAge)
  let maxTenure = isNew ? 9 : Math.max(5, 9 - carAge);
  let years = Math.min(costState.loanTermYears, maxTenure);
  if (years < 1) years = 5;
  const months = years * 12;

  // Malaysian flat rate HP formula
  const totalInterest = principal * flatRate * years;
  const totalRepayment = principal + totalInterest;
  const monthlyInstallment = totalRepayment / months;

  return {
    carPrice: price,
    downPaymentPct: costState.downPaymentPct,
    downPayment: Math.round(downPayment),
    principal: Math.round(principal),
    flatRate,
    flatRatePct: (flatRate * 100).toFixed(2),
    years,
    maxTenure,
    months,
    totalInterest: Math.round(totalInterest),
    totalRepayment: Math.round(totalRepayment),
    monthly: Math.round(monthlyInstallment * 100) / 100,
    isNew,
    carAge
  };
}

// ============================================================
// 2. INSURANCE — Malaysian Motor Tariff Structure
// ============================================================
// Base premium calculation (Comprehensive, Peninsular Malaysia)
// Source: BNM/PIAM Motor Tariff
//   First RM1,000:              RM26.00 flat
//   RM1,001 – RM10,000:        RM26.00 per RM1,000
//   RM10,001 – RM25,000:       RM25.00 per RM1,000
//   RM25,001 – RM50,000:       RM14.70 per RM1,000
//   RM50,001 – RM75,000:       RM13.83 per RM1,000
//   RM75,001 – RM100,000:      RM13.83 per RM1,000
//   RM100,001 – RM150,000:     RM11.61 per RM1,000
//   Over RM150,000:            RM11.04 per RM1,000
//
// NCD: 0%, 25%, 30%, 38.33%, 45%, 55%

function calcInsuranceBasePremium(sumInsured) {
  let premium = 0;
  const tiers = [
    { limit: 1000,   rate: 26.00 },
    { limit: 10000,  rate: 26.00 },
    { limit: 25000,  rate: 25.00 },
    { limit: 50000,  rate: 14.70 },
    { limit: 75000,  rate: 13.83 },
    { limit: 100000, rate: 13.83 },
    { limit: 150000, rate: 11.61 },
    { limit: Infinity, rate: 11.04 }
  ];

  let remaining = sumInsured;
  let prevLimit = 0;

  for (const tier of tiers) {
    const bandWidth = tier.limit - prevLimit;
    const inBand = Math.min(remaining, bandWidth);
    if (inBand <= 0) break;

    if (prevLimit === 0) {
      // First RM1,000 is a flat charge
      premium += tier.rate;
    } else {
      premium += (inBand / 1000) * tier.rate;
    }
    remaining -= inBand;
    prevLimit = tier.limit;
  }

  return premium;
}

function calcInsuranceDetails(car) {
  const sumInsured = car.price || 0;
  const ncdPct = costState.ncdLevel / 100;
  const carAge = car.year ? (new Date().getFullYear() - car.year) : 5;

  const basePremium = calcInsuranceBasePremium(sumInsured);

  // Age loading: +10% for cars 5-10yr, +20% for 10yr+
  let ageLoading = 0;
  if (carAge >= 10) ageLoading = 0.20;
  else if (carAge >= 5) ageLoading = 0.10;

  const loadedPremium = basePremium * (1 + ageLoading);
  const ncdDiscount = loadedPremium * ncdPct;
  const netPremium = loadedPremium - ncdDiscount;
  const monthly = netPremium / 12;

  return {
    sumInsured,
    basePremium: Math.round(basePremium * 100) / 100,
    ageLoading: Math.round(ageLoading * 100),
    loadedPremium: Math.round(loadedPremium * 100) / 100,
    ncdPct: costState.ncdLevel,
    ncdDiscount: Math.round(ncdDiscount * 100) / 100,
    annualPremium: Math.round(netPremium * 100) / 100,
    monthly: Math.round(monthly * 100) / 100,
    carAge,
    type: costState.insuranceType
  };
}

// ============================================================
// 3. ROAD TAX — JPJ Schedule (Peninsular Malaysia, Private)
// ============================================================
// Source: JPJ Jadual Cukai Jalan (Semenanjung, Saloon/Private)
//   ≤1000cc:  RM20
//   1001-1200: RM55
//   1201-1400: RM70
//   1401-1600: RM90
//   1601-1800: RM200
//   1801-2000: RM280
//   2001-2500: RM380
//   2501-3000: RM480 + RM0.50 per cc above 2500
//   3001+:     Progressive rate per cc

function calcRoadTaxDetails(engineCC) {
  let annual;
  if (engineCC <= 1000) annual = 20;
  else if (engineCC <= 1200) annual = 55;
  else if (engineCC <= 1400) annual = 70;
  else if (engineCC <= 1600) annual = 90;
  else if (engineCC <= 1800) annual = 200;
  else if (engineCC <= 2000) annual = 280;
  else if (engineCC <= 2500) annual = 380;
  else if (engineCC <= 3000) annual = 480 + (engineCC - 2500) * 0.50;
  else annual = 730 + (engineCC - 3000) * 1.00;

  return {
    engineCC,
    annual: Math.round(annual * 100) / 100,
    monthly: Math.round((annual / 12) * 100) / 100
  };
}

// ============================================================
// 4. MAINTENANCE — Brand-Tiered Estimation
// ============================================================
// Service interval costs (per 10,000km or 6 months):
//   Budget (Perodua, Proton):     RM150-300/service → ~RM80-150/mo
//   Japanese (Toyota, Honda etc): RM250-500/service → ~RM120-220/mo
//   Korean (Hyundai, Kia):        RM200-400/service → ~RM100-180/mo
//   European (VW, etc):           RM400-800/service → ~RM200-350/mo
//   Luxury (Mercedes, BMW, etc):  RM800-1500/service → ~RM350-600/mo
// Multiplied by age factor and service type

const BRAND_TIERS = {
  budget:   { base: 120, brands: ['perodua', 'proton'] },
  japanese: { base: 180, brands: ['toyota', 'honda', 'nissan', 'mazda', 'suzuki', 'mitsubishi', 'subaru', 'daihatsu', 'isuzu'] },
  korean:   { base: 160, brands: ['hyundai', 'kia'] },
  european: { base: 280, brands: ['volkswagen', 'peugeot', 'renault', 'citroen', 'skoda', 'fiat', 'seat'] },
  luxury:   { base: 450, brands: ['mercedes-benz', 'bmw', 'audi', 'lexus', 'porsche', 'volvo', 'jaguar', 'land rover', 'mini', 'alfa romeo', 'maserati', 'bentley', 'ferrari', 'lamborghini'] },
  chinese:  { base: 140, brands: ['chery', 'geely', 'haval', 'ora', 'byd', 'gac', 'changan'] }
};

function getBrandTier(make) {
  const m = (make || '').toLowerCase();
  for (const [tier, data] of Object.entries(BRAND_TIERS)) {
    if (data.brands.includes(m)) return { tier, base: data.base };
  }
  return { tier: 'japanese', base: 180 }; // fallback
}

function calcMaintenanceDetails(car) {
  const carAge = car.year ? (new Date().getFullYear() - car.year) : 5;
  const make = car.make || car.brand || '';
  const { tier, base } = getBrandTier(make);
  const isNew = car.condition === 'New' || car.type === 'new';

  // Age multiplier: newer cars cost less, older cost more
  let ageMult;
  if (carAge <= 1) ageMult = 0.6;       // under warranty
  else if (carAge <= 3) ageMult = 0.8;   // still relatively new
  else if (carAge <= 5) ageMult = 1.0;
  else if (carAge <= 8) ageMult = 1.3;
  else if (carAge <= 12) ageMult = 1.6;
  else ageMult = 2.0;                    // old, parts harder to find

  // Service type multiplier
  const serviceMult = costState.serviceType === 'authorized' ? 1.0 : 0.65;

  // Engine CC factor (bigger engines cost more to maintain)
  const cc = parseEngineCC(car);
  let ccMult = 1.0;
  if (cc > 3000) ccMult = 1.4;
  else if (cc > 2000) ccMult = 1.2;
  else if (cc > 1600) ccMult = 1.1;

  const monthly = base * ageMult * serviceMult * ccMult;

  // Breakdown: service, tires, battery, misc
  const servicePerVisit = monthly * 3;  // every ~6 months
  const tiresAnnual = tier === 'luxury' ? 2400 : tier === 'european' ? 1600 : tier === 'budget' ? 600 : 800;

  return {
    brandTier: tier,
    brandTierLabel: tier.charAt(0).toUpperCase() + tier.slice(1),
    baseCost: base,
    ageMult: Math.round(ageMult * 100) / 100,
    serviceMult: Math.round(serviceMult * 100) / 100,
    ccMult: Math.round(ccMult * 100) / 100,
    monthly: Math.round(monthly * 100) / 100,
    annual: Math.round(monthly * 12 * 100) / 100,
    servicePerVisit: Math.round(servicePerVisit),
    tiresAnnual,
    carAge,
    serviceType: costState.serviceType,
    engineCC: cc
  };
}

// ============================================================
// 5. DEPRECIATION — Age-Adjusted Malaysian Curve
// ============================================================
// Malaysian depreciation rates by car age:
//   Year 1:        15-20% (new car)
//   Year 2-3:      10-12% per year
//   Year 4-5:      8-10% per year
//   Year 6-8:      6-8% per year
//   Year 9+:       4-5% per year
// Adjust by brand retention:
//   Toyota/Honda:  retain value well (+2% slower)
//   Perodua:       average
//   Proton:        depreciates faster (-2% more)
//   Luxury:        depreciates fast (-3% more)

const RETENTION_ADJUST = {
  high:    -0.02, // Toyota, Honda, Lexus — lose less
  average:  0.00, // Perodua, Nissan, etc
  low:      0.02, // Proton
  verylow:  0.03  // Luxury European
};

function getRetentionClass(make) {
  const m = (make || '').toLowerCase();
  if (['toyota', 'honda', 'lexus'].includes(m)) return 'high';
  if (['proton'].includes(m)) return 'low';
  if (['mercedes-benz', 'bmw', 'audi', 'porsche', 'volvo', 'jaguar', 'land rover', 'maserati'].includes(m)) return 'verylow';
  return 'average';
}

function calcDepreciationDetails(car) {
  const price = car.price || 0;
  const carAge = car.year ? (new Date().getFullYear() - car.year) : 5;
  const isNew = car.condition === 'New' || car.type === 'new';
  const make = car.make || car.brand || '';
  const retClass = getRetentionClass(make);
  const retAdj = RETENTION_ADJUST[retClass] || 0;

  // Base annual depreciation rate by current age
  let baseRate;
  if (isNew || carAge <= 1) baseRate = 0.15;
  else if (carAge <= 3) baseRate = 0.10;
  else if (carAge <= 5) baseRate = 0.08;
  else if (carAge <= 8) baseRate = 0.06;
  else baseRate = 0.04;

  const adjustedRate = Math.max(0.02, baseRate + retAdj);
  const annualDepreciation = price * adjustedRate;
  const monthly = annualDepreciation / 12;

  // Estimated value after 5 years
  let futureValue = price;
  for (let y = 0; y < 5; y++) {
    const yr = carAge + y;
    let r;
    if (yr <= 1) r = 0.15;
    else if (yr <= 3) r = 0.10;
    else if (yr <= 5) r = 0.08;
    else if (yr <= 8) r = 0.06;
    else r = 0.04;
    futureValue *= (1 - Math.max(0.02, r + retAdj));
  }

  return {
    currentValue: price,
    annualRate: Math.round(adjustedRate * 10000) / 100,
    annualAmount: Math.round(annualDepreciation),
    monthly: Math.round(monthly * 100) / 100,
    retentionClass: retClass,
    retentionLabel: retClass === 'high' ? 'Holds value well' : retClass === 'verylow' ? 'Depreciates fast' : retClass === 'low' ? 'Below average' : 'Average',
    estimated5yrValue: Math.round(futureValue),
    totalLoss5yr: Math.round(price - futureValue),
    carAge
  };
}

// ============================================================
// 6. TOLLS & PARKING — User-Configurable
// ============================================================
function calcTollParkingDetails() {
  const workingDays = 22;
  const dailyToll = costState.dailyToll;
  const monthlyParking = costState.monthlyParking;

  // Use manual monthly toll override if set (from new direct-input fields)
  const monthlyToll = (costState._manualTollOverride !== undefined)
    ? costState._manualTollOverride
    : dailyToll * workingDays;

  const total = monthlyToll + monthlyParking;

  return {
    dailyToll,
    monthlyToll: Math.round(monthlyToll),
    monthlyParking,
    total: Math.round(total),
    annual: Math.round(total * 12),
    commuteType: costState.commuteType
  };
}
