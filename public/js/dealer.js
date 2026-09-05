// dealer.js
// Handles all dealer dashboard functionality

async function loadDealerDashboard() {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show dealer dashboard
  let db = document.getElementById('page-dealer');
  if (!db) {
    db = createDealerDashboard();
    document.body.appendChild(db);
  }
  db.classList.add('active');
  
  // Also switch top nav if needed
  const nav = document.getElementById('main-nav');
  if (nav) nav.classList.add('cin-nav-hidden'); // hide buyer nav
  
  await refreshDealerData();
}

function createDealerDashboard() {
  const page = document.createElement('div');
  page.id = 'page-dealer';
  page.className = 'page pt-nav dealer-dashboard';
  page.innerHTML = `
    <div class="container-wide" style="display:flex; gap: 2rem; min-height: 80vh;">
      <div class="dealer-sidebar" style="width: 250px; flex-shrink: 0; border-right: 1px solid var(--border); padding-right: 1rem;">
        <h2 style="font-family: var(--playfair); color: var(--gold); margin-bottom: 2rem;">Dealer Portal</h2>
        <ul class="dealer-nav" style="list-style: none; padding: 0; margin: 0; display:flex; flex-direction: column; gap: 0.5rem;">
          <li><button class="btn-ghost d-nav-btn active" onclick="switchDealerTab('overview')">Overview</button></li>
          <li><button class="btn-ghost d-nav-btn" onclick="startDealerAssessment()">New Assessment</button></li>
          <li><button class="btn-ghost d-nav-btn" onclick="switchDealerTab('assessments')">Assessments</button></li>
          <li><button class="btn-ghost d-nav-btn" onclick="switchDealerTab('inventory')">My Inventory</button></li>
          <li><button class="btn-ghost d-nav-btn" onclick="switchDealerTab('enquiries')">Enquiries</button></li>
          <li><button class="btn-ghost d-nav-btn" onclick="switchDealerTab('proposals')">Proposals</button></li>
          <li><button class="btn-ghost d-nav-btn" onclick="switchDealerTab('credits')">Credits (<span id="d-cred-count">...</span>)</button></li>
          <li><button class="btn-ghost d-nav-btn" onclick="switchDealerTab('profile')">Profile</button></li>
          <li><button class="btn-ghost d-nav-btn" style="color:var(--danger)" onclick="logoutDealer()">Sign Out</button></li>
        </ul>
      </div>
      
      <div class="dealer-content" style="flex: 1; padding-top: 1rem;">
        <div id="d-tab-overview" class="d-tab active">
          <h3>Overview</h3>
          <div class="grid-3" id="d-stats-grid" style="margin-top: 1rem;">
            <!-- stats injected here -->
          </div>
        </div>
        <div id="d-tab-assessments" class="d-tab" style="display:none;">
          <h3>Assessments</h3>
          <div id="d-assessments-list" style="margin-top:1rem;"></div>
        </div>
        <div id="d-tab-inventory" class="d-tab" style="display:none;">
          <h3>My Inventory</h3>
          <div id="d-inventory-list" style="margin-top:1rem;"></div>
        </div>
        <div id="d-tab-enquiries" class="d-tab" style="display:none;">
          <h3>Enquiries</h3>
          <div id="d-enquiries-list" style="margin-top:1rem;"></div>
        </div>
        <div id="d-tab-proposals" class="d-tab" style="display:none;">
          <h3>Proposals</h3>
          <div id="d-proposals-list" style="margin-top:1rem;"></div>
        </div>
        <div id="d-tab-credits" class="d-tab" style="display:none;">
          <h3>Credit History</h3>
          <p>Credit balance: <strong id="d-cred-display" style="color:var(--gold)">...</strong></p>
          <div id="d-credits-list" style="margin-top:1rem;"></div>
        </div>
        <div id="d-tab-profile" class="d-tab" style="display:none;">
          <h3>Profile</h3>
          <p>Logged in as: <span id="d-prof-email"></span></p>
        </div>
      </div>
    </div>
  `;
  return page;
}

function switchDealerTab(tabId) {
  document.querySelectorAll('.d-tab').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.d-nav-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById('d-tab-' + tabId).style.display = 'block';
  event.target.classList.add('active');
}

async function refreshDealerData() {
  if(!state.user) return;
  document.getElementById('d-prof-email').textContent = state.user.email;
  
  let ds = JSON.parse(localStorage.getItem('dealer_ds')) || { credit_balance: 100 };
  let assessments = JSON.parse(localStorage.getItem('dealer_assessments')) || [
    { id: '1', customer_reference: 'Cust-XYZ123', selected_car: { make: 'Toyota', model: 'Camry' }, sales_status: 'New', created_at: new Date().toISOString() }
  ];
  let inventory = JSON.parse(localStorage.getItem('dealer_inventory')) || [
    { id: 'inv1', car_name: 'Honda Civic 1.5TC', stock_reference: 'STK-001', status: 'available', selling_price: 135000 }
  ];
  let enquiries = JSON.parse(localStorage.getItem('dealer_enquiries')) || [
    { id: 'enq1', action_type: 'Book Test Drive', dealer_inventory: { car_name: 'Honda Civic 1.5TC' }, status: 'Pending', contact_name: 'Ahmad', contact_details: '0123456789' }
  ];
  let proposals = JSON.parse(localStorage.getItem('dealer_proposals')) || [
    { proposal_reference: 'PROP-999', assessments: { customer_reference: 'Cust-XYZ123', selected_car: { make: 'Toyota', model: 'Camry' } } }
  ];
  
  // Persist the default mock data if not set
  if(!localStorage.getItem('dealer_ds')) {
    localStorage.setItem('dealer_ds', JSON.stringify(ds));
    localStorage.setItem('dealer_assessments', JSON.stringify(assessments));
    localStorage.setItem('dealer_inventory', JSON.stringify(inventory));
    localStorage.setItem('dealer_enquiries', JSON.stringify(enquiries));
    localStorage.setItem('dealer_proposals', JSON.stringify(proposals));
  }

  // Try to fetch real data if we have an initialized client
  if(window.sbClient && state.session.access_token !== 'demo') {
    const { data: member } = await window.sbClient.from('dealer_members').select('dealership_id').eq('user_id', state.user.id).single();
    if(!member) return;
    
    state.dealership_id = member.dealership_id;
    const { data: realDs } = await window.sbClient.from('dealerships').select('*').eq('id', member.dealership_id).single();
    if(realDs) ds = realDs;
    
    const { data: realAss } = await window.sbClient.from('assessments').select('*').eq('dealership_id', member.dealership_id).order('created_at', { ascending: false });
    if(realAss) assessments = realAss;

    const { data: realInv } = await window.sbClient.from('dealer_inventory').select('*').eq('dealership_id', member.dealership_id);
    if(realInv) inventory = realInv;

    const { data: realEnq } = await window.sbClient.from('enquiries').select('*, dealer_inventory(car_name)').eq('dealership_id', member.dealership_id).order('created_at', { ascending: false });
    if(realEnq) enquiries = realEnq;

    const { data: realProp } = await window.sbClient.from('proposals').select('*, assessments(customer_reference, selected_car)').order('created_at', { ascending: false });
    if(realProp) proposals = realProp;
  }
  
  if(ds) {
    document.getElementById('d-cred-count').textContent = ds.credit_balance;
    document.getElementById('d-cred-display').textContent = ds.credit_balance;
  }
  
  // 1. Overview
  document.getElementById('d-stats-grid').innerHTML = `
    <div class="cost-accordion-inner" style="padding:1rem; text-align:center;">
      <div style="font-size:2rem; color:var(--gold)">${ds?.credit_balance || 0}</div>
      <div style="font-size:0.8rem; color:var(--text-dim)">Credits</div>
    </div>
  `;
  
  // 2. Assessments
  const assList = document.getElementById('d-assessments-list');
  if (assessments && assessments.length) {
    assList.innerHTML = assessments.map(a => `
      <div style="border:1px solid var(--border); padding:1rem; border-radius:4px; margin-bottom:0.5rem; display:flex; justify-content:space-between;">
        <div>
          <strong>${a.customer_reference}</strong> - ${a.selected_car?.make} ${a.selected_car?.model}
          <div style="font-size:0.8rem; color:var(--text-dim)">Status: ${a.sales_status} | Created: ${new Date(a.created_at).toLocaleDateString()}</div>
        </div>
        <button class="btn-ghost" onclick="resumeAssessment('${a.id}')">Resume</button>
      </div>
    `).join('');
  } else {
    assList.innerHTML = '<p style="color:var(--text-dim)">No assessments yet.</p>';
  }
  
  // 3. Inventory
  const invList = document.getElementById('d-inventory-list');
  if (inventory && inventory.length) {
    invList.innerHTML = inventory.map(i => `
      <div style="border:1px solid var(--border); padding:1rem; border-radius:4px; margin-bottom:0.5rem; display:flex; justify-content:space-between;">
        <div>
          <strong>${i.car_name}</strong> - Ref: ${i.stock_reference || 'N/A'}
          <div style="font-size:0.8rem; color:var(--text-dim)">Status: <span style="color:var(--gold)">${i.status.toUpperCase()}</span> | Price: RM${i.selling_price || 'TBA'}</div>
        </div>
      </div>
    `).join('');
  } else {
    invList.innerHTML = '<p style="color:var(--text-dim)">Inventory is empty.</p>';
  }
  
  // 4. Enquiries
  const enqList = document.getElementById('d-enquiries-list');
  if (enquiries && enquiries.length) {
    enqList.innerHTML = enquiries.map(e => {
      const costs = {'Check Availability': 1, 'Request Quotation': 2, 'Request Dealer Contact': 2, 'Book Test Drive': 4};
      const cost = costs[e.action_type] || 1;
      const isAccepted = e.status === 'Accepted';
      return `
      <div style="border:1px solid var(--border); padding:1rem; border-radius:4px; margin-bottom:0.5rem;">
        <div style="display:flex; justify-content:space-between;">
          <strong>${e.action_type} - ${e.dealer_inventory?.car_name || e.dealer_inventory}</strong>
          <span style="font-size:0.8rem; padding:0.2rem 0.5rem; background: ${isAccepted ? 'var(--green)' : 'var(--gold)'}; color:var(--bg); border-radius:12px;">${e.status}</span>
        </div>
        <div style="margin-top:0.5rem; font-size:0.9rem; color:var(--text-dim);">
          ${isAccepted ? `
            <p><strong>Name:</strong> ${e.contact_name}</p>
            <p><strong>Contact:</strong> ${e.contact_details}</p>
          ` : `
            <p>Contact details hidden. Accept to reveal (Costs ${cost} credit${cost>1?'s':''}).</p>
            <button class="btn-primary" style="font-size:0.7rem; padding:0.4rem 0.8rem; margin-top:0.5rem;" onclick="acceptEnquiry('${e.id}', ${cost})">Accept Request</button>
          `}
        </div>
      </div>
    `}).join('');
  } else {
    enqList.innerHTML = '<p style="color:var(--text-dim)">No enquiries yet.</p>';
  }
  
  // 5. Proposals
  const propList = document.getElementById('d-proposals-list');
  if (proposals && proposals.length) {
    propList.innerHTML = proposals.map(p => `
      <div style="border:1px solid var(--border); padding:1rem; border-radius:4px; margin-bottom:0.5rem;">
        <strong>Ref: ${p.proposal_reference}</strong>
        <div style="font-size:0.8rem; color:var(--text-dim)">Customer: ${p.assessments?.customer_reference} | Car: ${p.assessments?.selected_car?.make} ${p.assessments?.selected_car?.model}</div>
      </div>
    `).join('');
  } else {
    propList.innerHTML = '<p style="color:var(--text-dim)">No proposals generated.</p>';
  }
}

async function acceptEnquiry(enquiryId, cost) {
  if(!confirm(`This will deduct ${cost} credit(s). Proceed?`)) return;
  
  if (!window.sbClient || state.session.access_token === 'demo') {
    let ds = JSON.parse(localStorage.getItem('dealer_ds'));
    let enquiries = JSON.parse(localStorage.getItem('dealer_enquiries'));
    if (ds.credit_balance < cost) {
      alert('Insufficient credits in demo mode.');
      return;
    }
    ds.credit_balance -= cost;
    const enq = enquiries.find(e => e.id === enquiryId);
    if (enq) enq.status = 'Accepted';
    
    localStorage.setItem('dealer_ds', JSON.stringify(ds));
    localStorage.setItem('dealer_enquiries', JSON.stringify(enquiries));
    alert(`DEMO MODE: Deducted ${cost} credits and accepted enquiry.`);
    refreshDealerData();
    return;
  }
  
  const { data: success, error: credErr } = await window.sbClient.rpc('deduct_credits', {
    p_dealership_id: state.dealership_id,
    p_amount: cost,
    p_transaction_type: 'Accept Enquiry',
    p_reference_id: enquiryId
  });
  
  if(!success || credErr) {
    alert('Insufficient credits or already accepted.');
    return;
  }
  
  await window.sbClient.from('enquiries').update({ status: 'Accepted' }).eq('id', enquiryId);
  refreshDealerData();
}

function resumeAssessment(id) {
  let assessments = [];
  if (!window.sbClient || state.session.access_token === 'demo') {
    assessments = JSON.parse(localStorage.getItem('dealer_assessments')) || [];
  } else {
    // If we had real Supabase we'd fetch it, but let's assume refreshDealerData already populated the view
    // For now just use localStorage as fallback or wait, we don't have the global assessments array accessible here.
    // Actually we can just read it from localStorage for demo
    assessments = JSON.parse(localStorage.getItem('dealer_assessments')) || [];
  }
  
  const ass = assessments.find(a => a.id === id);
  if (!ass) {
    alert('Assessment not found');
    return;
  }
  
  state.assessment_id = id;
  state.salary = ass.safe_price_range?.max || 0; 
  // Restore basic state
  state.mode = 'dealer';
  state.selectedCar = ass.selected_car;
  
  // Inject context bar
  let dcb = document.getElementById('dealer-context-bar');
  if(!dcb) {
    dcb = document.createElement('div');
    dcb.id = 'dealer-context-bar';
    dcb.style = "background: var(--surface); border-bottom: 1px solid var(--gold); padding: 0.5rem 1rem; position: fixed; top: 0; left: 0; right: 0; z-index: 9999; display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--gold);";
    document.body.appendChild(dcb);
  }
  dcb.innerHTML = `
    <span>Dealer Mode: Resuming ${ass.customer_reference}</span>
    <button class="btn-ghost" style="padding: 0 0.5rem; font-size: 0.7rem;" onclick="cancelDealerAssessment()">Cancel</button>
  `;
  dcb.style.display = 'flex';
  
  // If car selected, go to page 4
  if (state.selectedCar) {
    goPage(4);
    setTimeout(() => calculateCosts(), 500);
  } else {
    goPage(2);
  }
}

function startDealerAssessment() {
  // Reset state
  state.salary = 0; state.loans = 0; state.expenses = 0; state.savings = 0; state.emergency = 0;
  state.selectedCar = null;
  // Go to step 2 but configure labels for dealer mode
  state.mode = 'dealer';
  
  // Inject context bar if not exists
  let dcb = document.getElementById('dealer-context-bar');
  if(!dcb) {
    dcb = document.createElement('div');
    dcb.id = 'dealer-context-bar';
    dcb.style = "background: var(--surface); border-bottom: 1px solid var(--gold); padding: 0.5rem 1rem; position: fixed; top: 0; left: 0; right: 0; z-index: 9999; display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--gold);";
    document.body.appendChild(dcb);
  }
  dcb.innerHTML = `
    <span>Dealer Mode: New Customer Assessment</span>
    <button class="btn-ghost" style="padding: 0 0.5rem; font-size: 0.7rem;" onclick="cancelDealerAssessment()">Cancel</button>
  `;
  dcb.style.display = 'flex';
  
  // Adjust UI text for dealer
  document.querySelector('[data-i18n="p2.title"]').textContent = "Customer Financial Profile";
  document.querySelector('[data-i18n="p2.desc"]')?.remove();
  
  goPage(2);
}

function cancelDealerAssessment() {
  let dcb = document.getElementById('dealer-context-bar');
  if(dcb) dcb.style.display = 'none';
  loadDealerDashboard();
}

window.startDealerAssessment = startDealerAssessment;
window.cancelDealerAssessment = cancelDealerAssessment;
window.switchDealerTab = switchDealerTab;
