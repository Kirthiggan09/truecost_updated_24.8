// ============================================================
// MAIN ENTRY POINT
// Loads car data, then initialises filters and renders the grid.
// All modules (state, finance, cars, charts, ai, ui) must be
// loaded before this file via <script> tags in index.html.
// ============================================================



async function initApp() {
  try {
    const res = await fetch('/api/cars');
    const data = await res.json();

    CAR_DATASET = data.map(car => {
      // Basic extraction from title: "2024 Toyota Vios 1.5 G Sedan" -> Model: "Vios", Variant: "1.5 G Sedan"
      let model = car.title;
      let variant = '';
      const brandIndex = car.title.indexOf(car.brand);
      if (brandIndex !== -1) {
        const rest = car.title.substring(brandIndex + car.brand.length).trim();
        const parts = rest.split(' ');
        if (parts.length > 0) {
          model = parts[0]; // e.g. Vios
          variant = parts.slice(1).join(' '); // e.g. 1.5 G Sedan
        }
      }

      // Extract engine CC from title — e.g. "1.5 G Sedan" → 1500, "2.0 Turbo" → 2000
      let engineCC = 1500; // fallback
      let engineLabel = 'N/A';
      const titleStr = car.title || '';
      // Match patterns like "1.5", "2.0", "1.8", "3.0" in the title
      const ccMatch = titleStr.match(/\b(\d\.\d)\b/);
      if (ccMatch) {
        const liters = parseFloat(ccMatch[1]);
        if (liters >= 0.6 && liters <= 6.5) {
          engineCC = Math.round(liters * 1000);
          engineLabel = liters.toFixed(1) + 'L';
        }
      }
      // Also check for "1498cc" or "2000cc" patterns
      if (engineLabel === 'N/A') {
        const ccDirect = titleStr.match(/(\d{3,4})\s*cc/i);
        if (ccDirect) {
          engineCC = parseInt(ccDirect[1]);
          engineLabel = (engineCC / 1000).toFixed(1) + 'L';
        }
      }

      // Handle mileage carefully: 0 should be treated as a number, not as falsy for "Not Specified"
      const rawMileage = (car.mileage !== null && car.mileage !== undefined) ? Number(car.mileage) : null;

      // Determine condition: prioritising 'condition' column, then falling back to mileage logic
      let condition = 'Used';
      if (car.condition) {
        const c = car.condition.toLowerCase();
        if (c.includes('new')) condition = 'New';
        else if (c.includes('recond')) condition = 'Recond';
      } else if (rawMileage !== null && rawMileage < 1000) {
        condition = 'New';
      }

      if (car.engine_capacity) {
        engineCC = car.engine_capacity;
        engineLabel = (engineCC / 1000).toFixed(1) + 'L';
      }

      return {
        id: car.id,
        make: car.brand,
        model: model,
        variant: variant,
        condition: condition,
        year: car.year,
        price: car.price,
        transmission: car.transmission,
        engine: engineLabel,
        engineCC: engineCC,
        engineType: car.engine_type || 'Petrol',
        seats: car.seat_capacity || 5,
        drivetrain: car.drivetrain || '2WD',
        origin: car.country_of_origin || 'Unknown',
        bodyType: car.body_type,
        location: car.location,
        mileage: (rawMileage !== null) ? rawMileage.toLocaleString() + ' km' : 'Not Specified',
        warranty: car.title.toLowerCase().includes('warranty') ? 'Warranty Available' : 'No Warranty',
        image: car.image_url || car.image,
        title: car.title // preserve full title for fuel parsing
      };
    });

    // ── Inject mock new cars at the front (temporary) ──
    CAR_DATASET = [...CAR_DATASET];
    populateFilters();
    applyFilters();
  } catch (err) {
    // If Supabase fails, still show mock new cars so the app is usable
    console.error('Failed to load car data from Supabase:', err);
    populateFilters();
    applyFilters();
  }
}

initApp();

// ============================================================
// ACCORDION TOGGLE — Step 04 Cost Categories
// ============================================================
function toggleAccordion(itemId) {
  const item = document.getElementById(itemId);
  if (!item) return;
  const isOpen = item.classList.contains('is-open');
  // Close all others
  document.querySelectorAll('.cost-accordion-item.is-open').forEach(el => {
    el.classList.remove('is-open');
  });
  // Toggle current
  if (!isOpen) {
    item.classList.add('is-open');
  }
}

// ============================================================
// CAR PREFERENCES — Step 07 (page-7) Logic
// ============================================================

/**
 * Toggle a preference chip (multi-select per category).
 * @param {HTMLElement} el  - the clicked .pref-chip element
 * @param {string} key      - state.userPrefs key (e.g. 'bodyType')
 * @param {string} value    - the value to toggle
 */
function togglePref(el, key, value) {
  const prefs = state.userPrefs;
  if (!Array.isArray(prefs[key])) prefs[key] = [];

  const idx = prefs[key].indexOf(value);
  if (idx === -1) {
    prefs[key].push(value);
    el.classList.add('selected');
  } else {
    prefs[key].splice(idx, 1);
    el.classList.remove('selected');
  }
  updatePrefSummary();
}

/**
 * Update the summary bar below the preference chips.
 */
function updatePrefSummary() {
  const prefs = state.userPrefs;
  const bar = document.getElementById('pref-summary-bar');
  const chipsEl = document.getElementById('pref-summary-chips');
  if (!bar || !chipsEl) return;

  const tags = [];
  ['bodyType', 'seats', 'engineType', 'drivetrain'].forEach(key => {
    (prefs[key] || []).forEach(v => tags.push(v));
  });
  if (prefs.location) tags.push(prefs.location);

  if (tags.length === 0) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = '';
  chipsEl.innerHTML = tags
    .map(t => `<span class="pref-summary-chip">${t}</span>`)
    .join('');
}

/**
 * Apply preferences as filters on the Car Selection page, then navigate to page 3.
 */
function applyPrefsAndGo() {
  const prefs = state.userPrefs;

  // Apply body type filter if exactly one selected
  const bodyFilter = document.getElementById('filter-body');
  if (bodyFilter && prefs.bodyType && prefs.bodyType.length === 1) {
    bodyFilter.value = prefs.bodyType[0];
  } else if (bodyFilter) {
    bodyFilter.value = '';
  }

  // Pre-score cars using preferences and re-sort
  if (typeof applyFilters === 'function') applyFilters();

  // Navigate to car selection
  goPage(3);

  // After navigation, highlight preference-matched cars
  setTimeout(() => highlightPrefMatchedCars(), 200);
}

/**
 * Score and visually highlight cars that match user preferences.
 */
function highlightPrefMatchedCars() {
  if (!CAR_DATASET || !CAR_DATASET.length) return;
  const prefs = state.userPrefs;

  // Body type map: normalize common variants
  const bodyMap = {
    'sedan': 'Sedan', 'hatchback': 'Hatchback', 'suv': 'SUV',
    'mpv': 'MPV', 'pickup': 'Pickup', 'coupe': 'Coupe'
  };

  // Score each card in the DOM
  document.querySelectorAll('.car-card').forEach(card => {
    const carId = parseInt(card.dataset.id);
    const car = CAR_DATASET.find(c => c.id === carId);
    if (!car) return;

    let score = 0;

    // Body type match
    if (prefs.bodyType && prefs.bodyType.length > 0) {
      const carBody = (car.bodyType || '').toLowerCase();
      const matched = prefs.bodyType.some(bt => carBody.includes(bt.toLowerCase()));
      if (matched) score += 3;
    }

    // Engine type match (Hybrid detection using new DB column)
    if (prefs.engineType && prefs.engineType.length > 0) {
      const isHybrid = (car.engineType === 'Hybrid' || car.engineType === 'Electric');
      if (prefs.engineType.includes('Hybrid') && isHybrid) score += 2;
      if (prefs.engineType.includes('Petrol') && !isHybrid) score += 1;
    }

    // Location match
    if (prefs.location && car.location) {
      const carLoc = (car.location || '').toLowerCase();
      if (carLoc.includes(prefs.location.toLowerCase())) score += 2;
    }

    // Affordability match
    if (state.budget > 0) {
      const loanTermMonths = (state.loanTermYears || 7) * 12;
      const estMonthly = (car.price * 0.9 * 1.035 * (state.loanTermYears || 7)) / loanTermMonths;
      if (estMonthly <= state.budget * 1.1) score += 2;
    }

    // Apply highlight border for good matches
    if (score >= 3) {
      card.style.boxShadow = '0 0 0 2px rgba(201,168,76,0.4)';
      card.style.borderColor = 'var(--gold-dim)';
      // Add preference badge if not already present
      if (!card.querySelector('.pref-match-badge')) {
        const badge = document.createElement('div');
        badge.className = 'pref-match-badge';
        badge.style.cssText = `
          position:absolute;top:0;left:0;
          font-family:var(--mono);font-size:0.5rem;
          letter-spacing:0.08em;text-transform:uppercase;
          background:rgba(201,168,76,0.85);color:#000;
          padding:0.2rem 0.45rem;font-weight:600;z-index:5;
        `;
        badge.textContent = '✦ Matches Prefs';
        card.style.position = 'relative';
        card.prepend(badge);
      }
    }
  });
}

// Expose globally
window.togglePref = togglePref;
window.updatePrefSummary = updatePrefSummary;
window.applyPrefsAndGo = applyPrefsAndGo;
window.toggleAccordion = toggleAccordion;
