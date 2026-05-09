// ============================================================
// FUEL CALCULATION SERVICE — Malaysian Market
// ============================================================

// Malaysian fuel prices (configurable)
const FUEL_PRICES = {
  RON95_SUBSIDIZED: 2.05,       // Subsidized price (first 200L/month)
  RON95_UNSUBSIDIZED: 4.02,     // After 200L quota exhausted
  RON97: 4.90                    // RON97 (no subsidy)
};

// Monthly subsidy quota
const SUBSIDY_QUOTA_LITERS = 200; // 200L per month subsidized RON95

// Real-world adjustment multipliers
const ADJUSTMENTS = {
  traffic:  { low: 1.0, medium: 1.1, heavy: 1.25 },
  driving:  { eco: 0.95, normal: 1.0, aggressive: 1.15 },
  ac:       { off: 1.0, normal: 1.05, heavy: 1.1 }
};

// Engine CC → estimated fuel efficiency (km/L) lookup
const EFFICIENCY_TABLE = [
  { maxCC: 660,  kml: 22.0 },  // Kei cars
  { maxCC: 850,  kml: 20.0 },
  { maxCC: 1000, kml: 18.5 },
  { maxCC: 1300, kml: 17.0 },
  { maxCC: 1500, kml: 15.5 },
  { maxCC: 1600, kml: 14.0 },
  { maxCC: 1800, kml: 12.5 },
  { maxCC: 2000, kml: 11.0 },
  { maxCC: 2500, kml: 9.5 },
  { maxCC: 3000, kml: 8.5 },
  { maxCC: 4000, kml: 7.0 },
  { maxCC: Infinity, kml: 5.5 }
];

// Malaysia market average fallback
const FALLBACK_EFFICIENCY = 13.0; // km/L
const FALLBACK_ENGINE_CC = 1500;
const DEFAULT_DAILY_COMMUTE = 40; // km round trip
const WORKING_DAYS = 22;

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Estimate fuel efficiency from engine CC
 */
function estimateEfficiency(cc) {
  if (!cc || cc <= 0) return FALLBACK_EFFICIENCY;
  const entry = EFFICIENCY_TABLE.find(e => cc <= e.maxCC);
  return entry ? entry.kml : 5.5;
}

/**
 * Parse engine CC from car data (variant string, engine field, etc.)
 */
function parseEngineCC(car) {
  if (!car) return FALLBACK_ENGINE_CC;

  // Direct engineCC field
  if (car.engineCC && car.engineCC > 50) return car.engineCC;

  // Engine field might be a number
  if (car.engine && typeof car.engine === 'number' && car.engine > 50) return car.engine;

  // Try parsing from variant string: "1.5 G", "2.0 Turbo", "1498cc"
  const sources = [car.variant || '', car.engine || '', car.title || ''];
  for (const src of sources) {
    if (!src) continue;
    const s = String(src);

    // Match "1498cc" or "1498 cc"
    const ccMatch = s.match(/(\d{3,4})\s*cc/i);
    if (ccMatch) return parseInt(ccMatch[1]);

    // Match "1.5L" or "1.5 L"
    const literMatch = s.match(/(\d\.\d)\s*[Ll]/);
    if (literMatch) return Math.round(parseFloat(literMatch[1]) * 1000);

    // Match standalone "1.5", "2.0" (common in Malaysian car names)
    const dotMatch = s.match(/\b(\d\.\d)\b/);
    if (dotMatch) {
      const val = parseFloat(dotMatch[1]);
      if (val >= 0.6 && val <= 6.0) return Math.round(val * 1000);
    }
  }

  return FALLBACK_ENGINE_CC;
}

/**
 * Estimate fuel type from engine CC and car details
 * Malaysian context: most cars under 2000cc use RON95
 */
function estimateFuelType(car, engineCC) {
  const make = (car.make || car.brand || '').toLowerCase();
  const premiumBrands = ['mercedes-benz', 'bmw', 'audi', 'porsche', 'lexus',
    'jaguar', 'land rover', 'volvo', 'mini', 'alfa romeo', 'maserati'];

  if (premiumBrands.includes(make) || engineCC > 2000) {
    return 'RON97';
  }
  return 'RON95';
}

/**
 * Calculate monthly fuel cost with 200L subsidy quota for RON95.
 * - First 200L at RM2.05 (subsidized)
 * - Remaining liters at RM4.02 (unsubsidized)
 * - RON97 users pay RM4.90 flat (no subsidy)
 */
function calculateFuelCostWithSubsidy(totalLiters, fuelType, hasSubsidy) {
  if (fuelType === 'RON97') {
    return {
      totalCost: totalLiters * FUEL_PRICES.RON97,
      subsidizedLiters: 0,
      unsubsidizedLiters: totalLiters,
      subsidizedCost: 0,
      unsubsidizedCost: totalLiters * FUEL_PRICES.RON97,
      effectivePrice: FUEL_PRICES.RON97,
      subsidyUsed: false
    };
  }

  // RON95 with subsidy
  if (hasSubsidy) {
    const subsidizedL = Math.min(totalLiters, SUBSIDY_QUOTA_LITERS);
    const unsubsidizedL = Math.max(0, totalLiters - SUBSIDY_QUOTA_LITERS);
    const subsidizedCost = subsidizedL * FUEL_PRICES.RON95_SUBSIDIZED;
    const unsubsidizedCost = unsubsidizedL * FUEL_PRICES.RON95_UNSUBSIDIZED;
    const totalCost = subsidizedCost + unsubsidizedCost;
    const effectivePrice = totalLiters > 0 ? totalCost / totalLiters : FUEL_PRICES.RON95_SUBSIDIZED;

    return {
      totalCost,
      subsidizedLiters: subsidizedL,
      unsubsidizedLiters: unsubsidizedL,
      subsidizedCost,
      unsubsidizedCost,
      effectivePrice: Math.round(effectivePrice * 100) / 100,
      subsidyUsed: true,
      quotaExceeded: totalLiters > SUBSIDY_QUOTA_LITERS
    };
  }

  // RON95 without subsidy (full unsubsidized price)
  return {
    totalCost: totalLiters * FUEL_PRICES.RON95_UNSUBSIDIZED,
    subsidizedLiters: 0,
    unsubsidizedLiters: totalLiters,
    subsidizedCost: 0,
    unsubsidizedCost: totalLiters * FUEL_PRICES.RON95_UNSUBSIDIZED,
    effectivePrice: FUEL_PRICES.RON95_UNSUBSIDIZED,
    subsidyUsed: false
  };
}

/**
 * Calculate adjusted fuel usage with real-world multipliers
 */
function getAdjustedFuel(baseLiters, traffic, driving, ac) {
  const tm = ADJUSTMENTS.traffic[traffic] || 1.0;
  const dm = ADJUSTMENTS.driving[driving] || 1.0;
  const am = ADJUSTMENTS.ac[ac] || 1.0;
  return baseLiters * tm * dm * am;
}

/**
 * Main fuel calculation function — returns structured output
 */
function calculateFuel(params) {
  const {
    car,
    dailyCommute = DEFAULT_DAILY_COMMUTE,
    fuelType: overrideFuelType,
    hasSubsidy = true,
    traffic = 'medium',
    driving = 'normal',
    ac = 'normal',
    customEfficiency
  } = params;

  // 1. Extract engine specs
  const engineCC = parseEngineCC(car);
  const baseEfficiency = customEfficiency || estimateEfficiency(engineCC);
  const fuelType = overrideFuelType || estimateFuelType(car, engineCC);

  // 2. Calculate distances
  const monthlyDistance = dailyCommute * WORKING_DAYS;

  // 3. Calculate base fuel usage
  const baseLitersUsed = monthlyDistance / baseEfficiency;

  // 4. Apply real-world adjustments
  const adjustedLiters = getAdjustedFuel(baseLitersUsed, traffic, driving, ac);

  // 5. Calculate costs with subsidy quota logic
  const costBreakdown = calculateFuelCostWithSubsidy(adjustedLiters, fuelType, hasSubsidy);
  const monthlyFuelCost = costBreakdown.totalCost;
  const annualFuelCost = monthlyFuelCost * 12;

  // 6. Calculate potential savings (what they'd pay without subsidy vs with)
  const noSubsidyCost = calculateFuelCostWithSubsidy(adjustedLiters, fuelType, false);
  const monthlySavingsFromSubsidy = noSubsidyCost.totalCost - monthlyFuelCost;

  // 7. Affordability insight
  const carModel = car ? `${car.make || car.brand || ''} ${car.model || ''}`.trim() : 'Unknown';
  let insight = '';
  if (costBreakdown.quotaExceeded) {
    const overL = Math.round(adjustedLiters - SUBSIDY_QUOTA_LITERS);
    insight = `⚠ ${carModel} uses ${Math.round(adjustedLiters)}L/mo — exceeding the 200L subsidy quota by ${overL}L. The extra ${overL}L costs RM${(overL * FUEL_PRICES.RON95_UNSUBSIDIZED).toFixed(0)} at unsubsidized RM${FUEL_PRICES.RON95_UNSUBSIDIZED}/L.`;
  } else if (monthlyFuelCost < 300) {
    insight = `${carModel} is very fuel-efficient. Monthly fuel cost is well within budget for most Malaysians.`;
  } else if (monthlyFuelCost < 600) {
    insight = `${carModel} has moderate fuel costs. Typical for a ${engineCC}cc engine with ${Math.round(dailyCommute)}km daily commute.`;
  } else if (monthlyFuelCost < 1000) {
    insight = `${carModel} fuel costs are above average. Consider eco driving or shorter routes to reduce monthly fuel spend.`;
  } else {
    insight = `${carModel} has high fuel costs at RM${Math.round(monthlyFuelCost)}/mo. This may significantly impact your budget.`;
  }

  // 8. Return structured output
  return {
    car_model: carModel,
    engine_cc: engineCC,
    fuel_efficiency_kml: Math.round(baseEfficiency * 10) / 10,
    fuel_type: fuelType,
    monthly_distance_km: monthlyDistance,
    fuel_price_per_liter: Math.round(costBreakdown.effectivePrice * 100) / 100,
    estimated_liters_used: Math.round(adjustedLiters * 10) / 10,
    base_liters_used: Math.round(baseLitersUsed * 10) / 10,
    monthly_fuel_cost: Math.round(monthlyFuelCost * 100) / 100,
    annual_fuel_cost: Math.round(annualFuelCost * 100) / 100,
    monthly_savings_from_subsidy: Math.round(monthlySavingsFromSubsidy * 100) / 100,
    // Subsidy breakdown
    subsidy: {
      hasSubsidy,
      quotaLiters: SUBSIDY_QUOTA_LITERS,
      subsidizedLiters: Math.round(costBreakdown.subsidizedLiters * 10) / 10,
      unsubsidizedLiters: Math.round(costBreakdown.unsubsidizedLiters * 10) / 10,
      subsidizedCost: Math.round(costBreakdown.subsidizedCost * 100) / 100,
      unsubsidizedCost: Math.round(costBreakdown.unsubsidizedCost * 100) / 100,
      quotaExceeded: !!costBreakdown.quotaExceeded,
      subsidizedPrice: FUEL_PRICES.RON95_SUBSIDIZED,
      unsubsidizedPrice: fuelType === 'RON97' ? FUEL_PRICES.RON97 : FUEL_PRICES.RON95_UNSUBSIDIZED
    },
    adjustments: { traffic, driving, ac },
    adjustment_multiplier: Math.round(
      (ADJUSTMENTS.traffic[traffic] || 1) *
      (ADJUSTMENTS.driving[driving] || 1) *
      (ADJUSTMENTS.ac[ac] || 1) * 1000
    ) / 1000,
    affordability_insight: insight
  };
}

// ============================================================
// AI-POWERED ENGINE SPEC ESTIMATION (calls /api/fuel-estimate)
// ============================================================
let _fuelAiCache = {};

async function aiFuelEstimate(car) {
  if (!car) return null;
  const cacheKey = `${car.make || car.brand}_${car.model}_${car.variant}_${car.year}`;
  if (_fuelAiCache[cacheKey]) return _fuelAiCache[cacheKey];

  try {
    const carName = `${car.year || ''} ${car.make || car.brand || ''} ${car.model || ''} ${car.variant || ''}`.trim();
    const response = await fetch('/api/fuel-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ car_name: carName })
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.engine_cc) {
      _fuelAiCache[cacheKey] = data;
      return data;
    }
  } catch (e) {
    console.warn('AI fuel estimate failed, using fallback:', e.message);
  }
  return null;
}

// ============================================================
// FUEL STATE — persists user selections for Step 04
// ============================================================
const fuelState = {
  dailyCommute: DEFAULT_DAILY_COMMUTE,
  fuelType: 'auto',       // 'auto', 'RON95', 'RON97'
  hasSubsidy: true,        // whether user has fuel subsidy (200L quota)
  traffic: 'medium',
  driving: 'normal',
  ac: 'normal',
  lastResult: null
};
