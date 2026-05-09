// ============================================================
// CAR DATA & RENDERING
// ============================================================
let CAR_DATASET = [];
const trCars = (key, fallback) => {
  if (typeof window.i18nT === 'function') {
    const out = window.i18nT(key);
    if (out && out !== key) return out;
  }
  return fallback;
};

// Pagination state
const PAGE_SIZE = 12;
let currentPage = 1;
let filteredCars = [];

// Body type → emoji mapping
function bodyEmoji(bodyType) {
  const m = {
    'SUV': '🚙', 'MPV': '🚐', 'Sedan': '🚗', 'Hatchback': '🚗',
    'Wagon': '🚗', 'Coupe': '🏎️', 'Convertible': '🏎️',
    'Pickup': '🛻', 'Commercial': '🚚', 'Others': '🚗'
  };
  return m[bodyType] || '🚗';
}

// Populate filter dropdowns dynamically from dataset
function populateFilters() {
  const makes = [...new Set(CAR_DATASET.map(c => c.make))].sort();
  const makeSel = document.getElementById('filter-brand');
  makeSel.innerHTML = `<option value="">${trCars('p3.filter.allMakes', 'All Makes')}</option>` +
    makes.map(m => `<option value="${m}">${m}</option>`).join('');

  // Populate model dropdown (initially all)
  populateModelFilter('');
}

function populateModelFilter(make) {
  const models = [...new Set(
    CAR_DATASET.filter(c => !make || c.make === make).map(c => c.model)
  )].sort();
  const modelSel = document.getElementById('filter-model');
  modelSel.innerHTML = `<option value="">${trCars('p3.filter.allModels', 'All Models')}</option>` +
    models.map(m => `<option value="${m}">${m}</option>`).join('');
}

function onMakeChange() {
  const make = document.getElementById('filter-brand').value;
  populateModelFilter(make);
  document.getElementById('filter-model').value = '';
  currentPage = 1;
  applyFilters();
}

window.removePreference = function (key, value) {
  if (key === 'location') {
    state.userPrefs.location = '';
  } else {
    state.userPrefs[key] = state.userPrefs[key].filter(v => v !== value);
  }
  applyFilters();
}

function applyFilters() {
  const make = document.getElementById('filter-brand').value;
  const model = document.getElementById('filter-model').value;
  const cond = document.getElementById('filter-condition').value;
  const uiBodyType = document.getElementById('filter-body').value;
  const maxPrice = parseInt(document.getElementById('filter-price').value || '0');
  const sortBy = document.getElementById('filter-sort').value;
  const search = document.getElementById('filter-search').value.trim().toLowerCase();

  const prefs = state.userPrefs || {};
  let baseDataset = CAR_DATASET;
  const activeChips = [];

  // Create a helper to check if a car is AI recommended
  const isAiReco = (id) => state.aiRecoIds && state.aiRecoIds.includes(id);

  // 1. Location (Strict)
  if (prefs.location) {
    activeChips.push({ key: 'location', val: prefs.location, label: prefs.location });
    const norm = (loc) => {
      let l = loc.toLowerCase();
      if (l === 'kl') return 'kuala lumpur';
      if (l === 'penang') return 'pulau pinang';
      return l;
    };
    const targetLoc1 = norm(prefs.location);
    const targetLoc2 = prefs.location.toLowerCase() === 'penang' ? 'penang' : (prefs.location.toLowerCase() === 'kuala lumpur' ? 'kl' : targetLoc1);

    baseDataset = baseDataset.filter(c => {
      // AI recommendations bypass Car Preferences entirely
      if (isAiReco(c.id)) return true;
      // New cars are nationwide; do not filter them out by location
      if (c.condition === 'New') return true;

      const carLoc = norm(c.location || '');
      return carLoc.includes(targetLoc1) || carLoc.includes(targetLoc2);
    });
  }

  // 2. Body Type (Strict)
  if (prefs.bodyType && prefs.bodyType.length > 0) {
    prefs.bodyType.forEach(bt => activeChips.push({ key: 'bodyType', val: bt, label: bt }));
    baseDataset = baseDataset.filter(c => {
      if (isAiReco(c.id)) return true;
      const carBody = (c.bodyType || '').toLowerCase();
      return prefs.bodyType.some(bt => carBody.includes(bt.toLowerCase()));
    });
  }

  // 3. Seating Capacity (Strict)
  if (prefs.seats && prefs.seats.length > 0) {
    prefs.seats.forEach(st => activeChips.push({ key: 'seats', val: st, label: st + ' Seats' }));
    baseDataset = baseDataset.filter(c => {
      if (isAiReco(c.id)) return true;
      const carSeats = c.seats || 5; // Default to 5 if missing in DB
      return prefs.seats.some(seatPref => {
        if (seatPref === '2') return carSeats <= 2;
        if (seatPref === '4') return carSeats === 4;
        if (seatPref === '5') return carSeats === 5;
        if (seatPref === '7+') return carSeats >= 7;
        if (seatPref === '9+') return carSeats >= 9;
        return false;
      });
    });
  }

  // 4. Engine Type (Strict)
  if (prefs.engineType && prefs.engineType.length > 0) {
    prefs.engineType.forEach(et => activeChips.push({ key: 'engineType', val: et, label: et }));
    baseDataset = baseDataset.filter(c => {
      if (isAiReco(c.id)) return true;
      const isHybrid = (c.engineType === 'Hybrid' || c.engineType === 'Electric');
      const isPetrol = (c.engineType === 'Petrol' || c.engineType === 'Diesel');
      return prefs.engineType.some(et => {
        if (et === 'Hybrid' && isHybrid) return true;
        if (et === 'Petrol' && isPetrol) return true;
        return false;
      });
    });
  }

  // 5. Drive Config (Strict)
  if (prefs.drivetrain && prefs.drivetrain.length > 0) {
    prefs.drivetrain.forEach(dt => activeChips.push({ key: 'drivetrain', val: dt, label: dt }));
    baseDataset = baseDataset.filter(c => {
      if (isAiReco(c.id)) return true;
      const carDt = (c.drivetrain || '').toLowerCase();
      return prefs.drivetrain.some(dt => carDt.includes(dt.toLowerCase()));
    });
  }

  // Render Active Filters UI
  const filtersContainer = document.getElementById('active-filters-container');
  const chipsEl = document.getElementById('active-filters-chips');
  if (filtersContainer && chipsEl) {
    if (activeChips.length > 0) {
      filtersContainer.style.display = 'block';
      chipsEl.innerHTML = activeChips.map(chip =>
        `<span style="display:inline-flex; align-items:center; background:rgba(201,168,76,0.15); border:1px solid var(--gold-dim); color:var(--gold); padding:0.2rem 0.5rem; border-radius:12px; font-size:0.6rem; font-family:var(--mono);">
           ${chip.label}
           <span style="margin-left:0.3rem; cursor:pointer; font-weight:bold; font-size:0.7rem;" onclick="removePreference('${chip.key}', '${chip.val}')">×</span>
         </span>`
      ).join('');
    } else {
      filtersContainer.style.display = 'none';
      chipsEl.innerHTML = '';
    }
  }

  // Combine with explicit Page 3 filters
  filteredCars = baseDataset.filter(c => {
    // Exclude AI recommended cars from normal listings
    if (isAiReco(c.id)) return false;

    if (make && c.make !== make) return false;
    if (model && c.model !== model) return false;
    if (cond && c.condition !== cond) return false;
    if (uiBodyType && c.bodyType !== uiBodyType) return false;
    if (maxPrice && c.price > maxPrice) return false;
    if (search && !(
      c.make.toLowerCase().includes(search) ||
      c.model.toLowerCase().includes(search) ||
      c.variant.toLowerCase().includes(search)
    )) return false;
    return true;
  });

  // Calculate pref scores for sorting (only affordability matters now since rest are strict filters)
  filteredCars.forEach(car => {
    car._prefScore = 0;
    if (state.budget > 0) {
      const loanTermMonths = (state.loanTermYears || 7) * 12;
      const estMonthly = (car.price * 0.9 * 1.035 * (state.loanTermYears || 7)) / loanTermMonths;
      if (estMonthly <= state.budget * 1.1) car._prefScore += 5;
    }
  });

  // Sort
  if (sortBy === 'price-asc') filteredCars.sort((a, b) => a.price - b.price);
  else if (sortBy === 'price-desc') filteredCars.sort((a, b) => b.price - a.price);
  else if (sortBy === 'year-desc') filteredCars.sort((a, b) => b.year - a.year);
  else if (sortBy === 'year-asc') filteredCars.sort((a, b) => a.year - b.year);
  else {
    filteredCars.sort((a, b) => b._prefScore - a._prefScore);
  }

  currentPage = 1;
  renderCars();
  updateLocationWarning();
}

function updateLocationWarning() {
  const userLoc = state.userPrefs && state.userPrefs.location ? state.userPrefs.location : '';
  const titleEl = document.querySelector('#page-3 .page-title');
  if (titleEl) {
    if (userLoc) {
      titleEl.textContent = `Recommended Cars Near ${userLoc}`;
    } else {
      titleEl.textContent = `Select Your Car`;
    }
  }
}


// legacy alias
function filterCars() { applyFilters(); }

function renderCars() {
  const grid = document.getElementById('cars-grid');
  const total = filteredCars.length;

  document.getElementById('car-count').textContent = total;

  if (total === 0) {
    const prefs = state.userPrefs || {};
    const hasOnlyLocation = prefs.location && (!prefs.bodyType?.length && !prefs.seats?.length && !prefs.engineType?.length && !prefs.drivetrain?.length);

    grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; background: var(--surface); border: 1px dashed var(--border); border-radius: 8px;">
      <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
      <div style="font-family: var(--mono); font-size: 0.9rem; color: var(--text); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
        ${hasOnlyLocation ? `No used/recon cars found in ${prefs.location}` : 'No cars match your selected preferences'}
      </div>
      <div style="font-size: 0.8rem; color: var(--text-dim);">Try reducing some filters or expanding your search criteria.</div>
    </div>`;
    document.getElementById('pagination-row').innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageCars = filteredCars.slice(start, start + PAGE_SIZE);

  window.renderCarCardHTML = function (c) {
    const rankLabels = ['BEST MATCH', 'RUNNER UP', 'ALSO CONSIDER'];
    const recoIndex = state.aiRecoIds ? state.aiRecoIds.findIndex(id => Number(id) === Number(c.id)) : -1;
    const isReco = recoIndex !== -1;
    const isSelected = state.selectedCar && state.selectedCar.id === c.id;
    const condBadgeColor = c.condition === 'New' ? '#c9a84c' : c.condition === 'Recond' ? '#4c8ecf' : '#4caf7d';
    const mileageStr = c.mileage && c.mileage !== 'Not Specified' ? c.mileage : (c.condition === 'New' ? '0 km' : '—');
    return `<div class="car-card ${isSelected ? 'selected' : ''} ${isReco ? 'ai-recommended' : ''}" id="car-${c.id}" onclick="selectCar(${c.id})">
    ${isReco ? `<div class="ai-reco-badge">✦ AI Recommended<span class="ai-reco-rank">${rankLabels[recoIndex] || ''}</span></div>` : ''}
    <div class="car-img-wrap" style="position:relative">
      <img src="${c.image}" alt="${c.make} ${c.model}" style="width:100%;height:100%;object-fit:cover;">
      <span style="position:absolute;top:8px;right:8px;font-family:var(--mono);font-size:0.55rem;font-weight:700;letter-spacing:0.08em;padding:2px 7px;border-radius:3px;background:${condBadgeColor};color:#000">${c.condition.toUpperCase()}</span>
    </div>
    <div class="car-info">
      <div class="car-name">${c.make} ${c.model}</div>
      <div class="car-meta">${c.year} · ${c.variant} · ${c.bodyType}</div>
      <div class="car-price">RM ${c.price.toLocaleString()}</div>
      <div class="car-specs">
        <span>⚙️ ${c.engine}</span>
        <span>🔄 ${c.transmission}</span>
        ${mileageStr !== '—' ? `<span>📍 ${mileageStr}</span>` : ''}
        ${c.location ? `<span>📌 ${c.location}</span>` : ''}
      </div>
      ${c.warranty && c.warranty !== 'No Warranty' ? `<div style="margin-top:6px;font-family:var(--mono);font-size:0.6rem;color:var(--green)">✓ ${c.warranty}</div>` : ''}
      ${isReco && state.aiRecoReasons && state.aiRecoReasons[c.id] ? `<div style="margin-top:0.5rem;padding:0.45rem 0.6rem;background:rgba(76,175,125,0.08);border-left:2px solid var(--green);font-size:0.7rem;color:var(--text-dim);line-height:1.4">${state.aiRecoReasons[c.id]}</div>` : ''}
    </div>
    <div class="car-actions"><button class="car-btn ${isSelected ? 'active' : ''}" onclick="event.stopPropagation();selectCar(${c.id})">${isSelected ? trCars('p3.car.selected', '✓ Selected') : trCars('p3.car.selectThis', 'Select This Car')}</button></div>
  </div>`;
  };

  grid.innerHTML = pageCars.map(window.renderCarCardHTML).join('');

  // Pagination controls
  let paginationHtml = '';
  if (totalPages > 1) {
    paginationHtml = `<div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:1.5rem;flex-wrap:wrap">
      <button class="btn-ghost" style="padding:0.4rem 0.9rem;font-size:0.65rem" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity:0.3;padding:0.4rem 0.9rem;font-size:0.65rem"' : ''}>${trCars('p3.page.prev', '← Prev')}</button>
      <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text-faint)">${trCars('p3.page.label', 'Page')} ${currentPage} ${trCars('p3.page.of', 'of')} ${totalPages} · ${total} ${trCars('p3.page.cars', 'cars')}</span>
      <button class="btn-ghost" style="padding:0.4rem 0.9rem;font-size:0.65rem" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled style="opacity:0.3;padding:0.4rem 0.9rem;font-size:0.65rem"' : ''}>${trCars('p3.page.next', 'Next →')}</button>
    </div>`;
  }
  document.getElementById('pagination-row').innerHTML = paginationHtml;
}

function changePage(p) {
  const totalPages = Math.ceil(filteredCars.length / PAGE_SIZE);
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  renderCars();
  document.getElementById('page-3').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showCarSelectedPopup(car) {
  const modal = document.createElement('div');
  modal.id = 'car-selected-popup';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '10000';
  modal.style.backdropFilter = 'blur(4px)';

  const content = document.createElement('div');
  content.style.backgroundColor = 'var(--charcoal)';
  content.style.padding = '2rem';
  content.style.borderRadius = '8px';
  content.style.border = '1px solid var(--gold)';
  content.style.maxWidth = '400px';
  content.style.textAlign = 'center';
  content.style.color = 'var(--white)';
  content.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
  content.style.position = 'relative';

  // Close button (X)
  const closeBtn = document.createElement('span');
  closeBtn.textContent = '×';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '10px';
  closeBtn.style.right = '15px';
  closeBtn.style.fontSize = '1.5rem';
  closeBtn.style.color = 'var(--text-dim)';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.transition = 'color 0.2s';
  closeBtn.onmouseover = () => closeBtn.style.color = 'var(--gold)';
  closeBtn.onmouseout = () => closeBtn.style.color = 'var(--text-dim)';
  closeBtn.onclick = () => {
    document.body.removeChild(modal);
    // Cancel selection
    state.selectedCar = null;
    const btnNext = document.getElementById('btn-next-4');
    if (btnNext) {
      btnNext.disabled = true;
      btnNext.style.opacity = '0.5';
    }
    renderCars();
  };

  const title = document.createElement('h3');
  title.textContent = 'Car Selected!';
  title.style.color = 'var(--gold)';
  title.style.marginBottom = '1rem';
  title.style.fontFamily = 'var(--display-font, inherit)';

  const desc = document.createElement('p');
  desc.textContent = `You have selected the ${car.make} ${car.model}.`;
  desc.style.marginBottom = '2rem';
  desc.style.fontSize = '0.9rem';
  desc.style.color = 'var(--text-dim)';

  const btn = document.createElement('button');
  btn.textContent = 'View TrueCost';
  btn.style.backgroundColor = 'var(--gold)';
  btn.style.color = 'var(--black)';
  btn.style.border = 'none';
  btn.style.padding = '0.75rem 1.5rem';
  btn.style.borderRadius = '4px';
  btn.style.cursor = 'pointer';
  btn.style.fontWeight = 'bold';
  btn.style.transition = 'all 0.2s';
  btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
  btn.onmouseout = () => btn.style.transform = 'scale(1)';
  btn.onclick = () => {
    document.body.removeChild(modal);
    if (typeof goPage === 'function') {
      goPage(4); // Proceed to Step 4
    }
  };

  content.appendChild(closeBtn);
  content.appendChild(title);
  content.appendChild(desc);
  content.appendChild(btn);
  modal.appendChild(content);
  document.body.appendChild(modal);
}

function selectCar(id) {
  state.selectedCar = CAR_DATASET.find(c => c.id === id);
  // Normalise fields expected by calcTrueCost / calcScenarios
  if (state.selectedCar) {
    state.selectedCar.type = state.selectedCar.condition.toLowerCase(); // 'new','used','recond'
    state.selectedCar.brand = state.selectedCar.make;
    state.selectedCar.engine = state.selectedCar.engineCC;
  }
  const btn = document.getElementById('btn-next-4');
  if (btn) {
    btn.disabled = false;
    btn.style.opacity = '1';
  }
  renderCars();

  if (state.selectedCar) {
    showCarSelectedPopup(state.selectedCar);
  }

  // Also re-render AI cards if visible to update the highlight state
  if (state.aiRecoIds && state.aiRecoIds.length > 0) {
    const aiCars = state.aiRecoIds.map(aiId => CAR_DATASET.find(c => c.id === aiId)).filter(Boolean);
    const newRecs = aiCars.filter(c => c.condition === 'New');
    const usedRecs = aiCars.filter(c => c.condition !== 'New');

    const newGrid = document.getElementById('ai-new-cars-grid');
    const usedGrid = document.getElementById('ai-used-cars-grid');
    if (newGrid && newGrid.innerHTML.trim() !== '') newGrid.innerHTML = newRecs.map(window.renderCarCardHTML).join('');
    if (usedGrid && usedGrid.innerHTML.trim() !== '') usedGrid.innerHTML = usedRecs.map(window.renderCarCardHTML).join('');
  }
}

// ============================================================
// FIND TRACK B CAR — cheapest alternative from dataset
// ============================================================
function findTrackBCar(selectedCar) {
  if (!selectedCar) return null;
  const price = selectedCar.price;
  const make = selectedCar.make || selectedCar.brand;
  const model = selectedCar.model;
  const bodyType = selectedCar.bodyType;

  let candidates = [];
  const maxAffordable = state.maxPrice || price;

  // Strategy 1: Same make + model, USED only, cheaper & affordable
  candidates = CAR_DATASET.filter(c =>
    c.make === make &&
    c.model === model &&
    c.condition === 'Used' &&
    c.price < price &&
    c.price <= maxAffordable &&
    c.id !== selectedCar.id
  );
  if (candidates.length > 0) {
    // Pick the one closest to selected car price (most similar)
    candidates.sort((a, b) => Math.abs(price - a.price) - Math.abs(price - b.price));
    return candidates[0];
  }

  // Strategy 2: Same make + same body type, USED only, within 40-80% price range & affordable
  candidates = CAR_DATASET.filter(c =>
    c.make === make &&
    c.bodyType === bodyType &&
    c.condition === 'Used' &&
    c.price >= price * 0.40 &&
    c.price <= price * 0.80 &&
    c.price <= maxAffordable &&
    c.id !== selectedCar.id
  );
  if (candidates.length > 0) {
    // Pick the highest priced one (best quality in the range)
    candidates.sort((a, b) => b.price - a.price);
    return candidates[0];
  }

  // Strategy 3: Same body type (any make), USED only, within 40-75% price range & affordable
  candidates = CAR_DATASET.filter(c =>
    c.bodyType === bodyType &&
    c.condition === 'Used' &&
    c.price >= price * 0.40 &&
    c.price <= price * 0.75 &&
    c.price <= maxAffordable &&
    c.id !== selectedCar.id
  );
  if (candidates.length > 0) {
    // Pick the one with best value (highest price in range = newer/better condition)
    candidates.sort((a, b) => b.price - a.price);
    return candidates[0];
  }

  // Strategy 4: Fallback - any USED car within 50-70% price range & affordable
  candidates = CAR_DATASET.filter(c =>
    c.condition === 'Used' &&
    c.price >= price * 0.50 &&
    c.price <= price * 0.70 &&
    c.price <= maxAffordable &&
    c.id !== selectedCar.id
  );
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.price - a.price);
    return candidates[0];
  }

  // No suitable car found - return null (will use 65% estimate)
  return null;
}

function renderTrackACarCard() {
  const car = state.selectedCar;
  let container = document.getElementById('tracka-car-card');
  if (!container || !car) return;

  const mileageStr = car.mileage && car.mileage !== 'Not Specified' ? car.mileage : (car.condition === 'New' ? '0 km' : '—');
  const condColor = car.condition === 'New' ? '#c9a84c' : car.condition === 'Recond' ? '#4c8ecf' : '#4caf7d';
  const engineStr = car.engine || `${car.engineCC}cc`;

  container.innerHTML = `
    <div style="margin-top:12px;padding:12px;background:#1a0d0d;border:1px solid #3a1e1e;border-radius:6px">
      ${car.image ? `<div style="margin-bottom:10px;height:120px;overflow:hidden;border-radius:4px"><img src="${car.image}" style="width:100%;height:100%;object-fit:cover;"></div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="font-size:0.88rem;font-weight:700;color:var(--text)">${car.make} ${car.model}</div>
          <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text-faint);margin-top:2px">${car.variant}</div>
        </div>
        <span style="font-family:var(--mono);font-size:0.55rem;font-weight:700;letter-spacing:0.08em;
          padding:2px 7px;border-radius:3px;background:${condColor};color:#000;flex-shrink:0">
          ${car.condition.toUpperCase()}
        </span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:10px">
        <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text-faint)">📅 ${car.year}</div>
        <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text-faint)">⚙️ ${engineStr}</div>
        <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text-faint)">📍 ${mileageStr}</div>
        <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text-faint)">📌 ${car.location || '—'}</div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;
        padding-top:8px;border-top:1px solid #3a1e1e">
        <div>
          <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text-faint)">PRICE</div>
          <div style="font-family:var(--mono);font-size:1rem;font-weight:700;color:var(--gold)">
            RM ${car.price.toLocaleString()}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text-faint)">STATUS</div>
          <div style="font-family:var(--mono);font-size:0.85rem;font-weight:700;color:var(--red)">
            Selected
          </div>
        </div>
      </div>

      ${car.warranty && car.warranty !== 'No Warranty'
      ? `<div style="margin-top:6px;font-family:var(--mono);font-size:0.6rem;color:var(--green)">✓ ${car.warranty}</div>`
      : `<div style="margin-top:6px;font-family:var(--mono);font-size:0.6rem;color:var(--red)">✗ No Warranty</div>`}
    </div>`;
}

function renderTrackBCarCard() {
  const car = state.trackBCar;
  const selectedPrice = state.selectedCar ? state.selectedCar.price : 0;

  // Find or create the card container inside the Track B .wc-sc column
  let container = document.getElementById('trackb-car-card');
  if (!container) return; // element must exist in HTML

  if (!car) {
    container.innerHTML = `
      <div style="padding:10px 0 4px;border-top:1px solid #1e1e1e;margin-top:8px">
        <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text-faint);letter-spacing:0.08em;margin-bottom:6px">ESTIMATED ALTERNATIVE</div>
        <div style="font-size:0.78rem;color:var(--text-dim)">~65% of selected car price</div>
        <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text-faint);margin-top:4px">No matching used car found in dataset</div>
      </div>`;
    return;
  }

  const savingsPct = Math.round((1 - car.price / selectedPrice) * 100);
  const mileageStr = car.mileage && car.mileage !== 'Not Specified' ? car.mileage : '—';
  const condColor = car.condition === 'Used' ? '#4caf7d' : '#4c8ecf';
  const engineStr = car.engine || `${car.engineCC}cc`;

  container.innerHTML = `
    <div style="margin-top:12px;padding:12px;background:#0d1a12;border:1px solid #1e3a28;border-radius:6px">
      ${car.image ? `<div style="margin-bottom:10px;height:120px;overflow:hidden;border-radius:4px"><img src="${car.image}" style="width:100%;height:100%;object-fit:cover;"></div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="font-size:0.88rem;font-weight:700;color:var(--text)">${car.make} ${car.model}</div>
          <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text-faint);margin-top:2px">${car.variant}</div>
        </div>
        <span style="font-family:var(--mono);font-size:0.55rem;font-weight:700;letter-spacing:0.08em;
          padding:2px 7px;border-radius:3px;background:${condColor};color:#000;flex-shrink:0">
          ${car.condition.toUpperCase()}
        </span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:10px">
        <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text-faint)">📅 ${car.year}</div>
        <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text-faint)">⚙️ ${engineStr}</div>
        <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text-faint)">📍 ${mileageStr}</div>
        <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text-faint)">📌 ${car.location || '—'}</div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;
        padding-top:8px;border-top:1px solid #1e3a28">
        <div>
          <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text-faint)">PRICE</div>
          <div style="font-family:var(--mono);font-size:1rem;font-weight:700;color:var(--green)">
            RM ${car.price.toLocaleString()}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text-faint)">YOU SAVE</div>
          <div style="font-family:var(--mono);font-size:1rem;font-weight:700;color:var(--gold)">
            ${savingsPct}% cheaper
          </div>
        </div>
      </div>

      ${car.warranty && car.warranty !== 'No Warranty'
      ? `<div style="margin-top:6px;font-family:var(--mono);font-size:0.6rem;color:var(--green)">✓ ${car.warranty}</div>`
      : `<div style="margin-top:6px;font-family:var(--mono);font-size:0.6rem;color:var(--red)">✗ No Warranty</div>`}
    </div>`;
}

function resetFilters() {
  document.getElementById('filter-brand').value = '';
  document.getElementById('filter-model').value = '';
  document.getElementById('filter-condition').value = '';
  document.getElementById('filter-body').value = '';
  document.getElementById('filter-price').value = '';
  document.getElementById('filter-sort').value = '';
  document.getElementById('filter-search').value = '';
  currentPage = 1;
  applyFilters();
}
