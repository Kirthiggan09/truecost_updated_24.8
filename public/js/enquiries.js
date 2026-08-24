// Enquiries logic for buyers
async function checkDealerInventory(carName) {
  if(!window.supabase) return [];
  try {
    const { data } = await supabase
      .from('dealer_inventory')
      .select('id, dealership_id, dealerships(name)')
      .eq('car_name', carName)
      .eq('status', 'available');
    return data || [];
  } catch(e) {
    return [];
  }
}

async function renderDealerActions() {
  if (state.mode === 'dealer') return; // Dealers don't enquire to themselves
  const car = state.selectedCar;
  if(!car) return;
  const carName = `${car.make || car.brand} ${car.model}`;
  
  const dealers = await checkDealerInventory(carName);
  let container = document.getElementById('dealer-actions-container');
  if(!container) {
    container = document.createElement('div');
    container.id = 'dealer-actions-container';
    
    // Inject it in page 4, above bottom nav
    const p4Container = document.querySelector('#page-4 .container');
    if(p4Container) {
      const bottomNav = p4Container.querySelector('.bottom-nav');
      if(bottomNav) p4Container.insertBefore(container, bottomNav);
      else p4Container.appendChild(container);
    }
  }
  
  if(dealers.length > 0) {
    let html = `
      <div style="background:var(--surface); border:1px solid var(--gold); padding:1rem; border-radius:8px; margin:2rem 0;">
        <h3 style="color:var(--gold); font-family:var(--playfair); margin-bottom:1rem; font-size:1.2rem;">Available at Verified Dealers</h3>
        <p style="font-size:0.8rem; color:var(--text-dim); margin-bottom:1rem;">This car is available in stock. Select an action to contact the dealer.</p>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
    `;
      
    dealers.forEach(d => {
      // Sometimes joined tables return arrays, handle both
      const dName = d.dealerships?.name || (Array.isArray(d.dealerships) ? d.dealerships[0]?.name : 'Authorized Dealer');
      html += `
        <div style="border:1px solid var(--border); padding:1rem; border-radius:4px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <strong style="color:var(--text);">${dName}</strong>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn-ghost" style="font-size:0.7rem; padding:0.4rem 0.8rem; border:1px solid var(--border);" onclick="openEnquiryModal('${d.id}', '${d.dealership_id}', 'Check Availability')">Check Availability</button>
            <button class="btn-ghost" style="font-size:0.7rem; padding:0.4rem 0.8rem; border:1px solid var(--border);" onclick="openEnquiryModal('${d.id}', '${d.dealership_id}', 'Request Quotation')">Quotation</button>
            <button class="btn-ghost" style="font-size:0.7rem; padding:0.4rem 0.8rem; border:1px solid var(--border);" onclick="openEnquiryModal('${d.id}', '${d.dealership_id}', 'Request Dealer Contact')">Contact Me</button>
            <button class="btn-primary" style="font-size:0.7rem; padding:0.4rem 0.8rem;" onclick="openEnquiryModal('${d.id}', '${d.dealership_id}', 'Book Test Drive')">Test Drive</button>
          </div>
        </div>
      `;
    });
    
    html += `</div></div>`;
    container.innerHTML = html;
  } else {
    container.innerHTML = '';
  }
}

function openEnquiryModal(inventoryId, dealershipId, actionType) {
  let modal = document.getElementById('enquiry-modal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'enquiry-modal';
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center;";
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div style="background:var(--surface); padding:2rem; border-radius:8px; border:1px solid var(--gold); width:90%; max-width:400px;">
      <h3 style="font-family:var(--playfair); color:var(--gold); margin-bottom:1rem;">${actionType}</h3>
      <p style="font-size:0.8rem; color:var(--text-dim); margin-bottom:1rem;">Please provide your details. By submitting, you explicitly consent to sharing this information with the dealer so they can assist you.</p>
      <input type="text" id="eq-name" class="form-input" placeholder="Your Name" style="margin-bottom:1rem; width:100%;" />
      <input type="text" id="eq-contact" class="form-input" placeholder="Phone Number / Email" style="margin-bottom:1rem; width:100%;" />
      <div id="eq-error" style="color:var(--danger); font-size:0.8rem; margin-bottom:1rem; display:none;"></div>
      <button class="btn-primary" style="width:100%; margin-bottom:1rem;" onclick="submitEnquiry('${inventoryId}', '${dealershipId}', '${actionType}')">Confirm Request</button>
      <button class="btn-ghost" style="width:100%;" onclick="document.getElementById('enquiry-modal').style.display='none'">Cancel</button>
    </div>
  `;
  modal.style.display = 'flex';
}

async function submitEnquiry(inventoryId, dealershipId, actionType) {
  const name = document.getElementById('eq-name').value;
  const contact = document.getElementById('eq-contact').value;
  const err = document.getElementById('eq-error');
  
  if(!name || !contact) {
    err.textContent = 'Name and contact are required.';
    err.style.display = 'block';
    return;
  }
  
  const btn = document.querySelector('#enquiry-modal .btn-primary');
  btn.textContent = 'Submitting...';
  btn.disabled = true;
  
  const { error } = await supabase.from('enquiries').insert({
    inventory_id: inventoryId,
    dealership_id: dealershipId,
    action_type: actionType,
    contact_name: name,
    contact_details: contact,
    status: 'Pending'
  });
  
  if(error) {
    err.textContent = error.message;
    err.style.display = 'block';
    btn.textContent = 'Confirm Request';
    btn.disabled = false;
  } else {
    document.getElementById('enquiry-modal').innerHTML = `
      <div style="background:var(--surface); padding:2rem; border-radius:8px; border:1px solid var(--green); width:90%; max-width:400px; text-align:center;">
        <h3 style="color:var(--green); margin-bottom:1rem; font-family:var(--playfair);">Request Sent!</h3>
        <p style="font-size:0.9rem; color:var(--text-dim); margin-bottom:1.5rem;">The dealer has been notified and will contact you shortly.</p>
        <button class="btn-primary" style="width:100%;" onclick="document.getElementById('enquiry-modal').style.display='none'">Done</button>
      </div>
    `;
  }
}

window.renderDealerActions = renderDealerActions;
window.openEnquiryModal = openEnquiryModal;
window.submitEnquiry = submitEnquiry;
