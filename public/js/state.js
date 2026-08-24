// ============================================================
// STATE
// ============================================================
const state = {
  salary: 0, loans: 0, expenses: 0, savings: 0, emergency: 0,
  age: 28, dependents: 0, stability: 'medium',
  lang: 'en',
  mode: 'buyer',
  selectedCar: null, budget: 0, dti: 0, loanTermYears: 7,
  aiRecoIds: [], aiRecoReasons: {},
  currentPage: 1,
  analysisGenerated: false,
  analysisInProgress: false,
  userPrefs: {
    bodyType: [],
    seats: [],
    engineType: [],
    drivetrain: [],
    location: ''
  }
};

// Wealth-chart specific state
const wcState = { horizon: 5 };

// ============================================================
// GLOBAL FORMAT HELPER
// ============================================================
function fmt(n) { return 'RM ' + Math.round(n).toLocaleString(); }
