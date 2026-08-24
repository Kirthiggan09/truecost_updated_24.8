// Supabase setup
let sbClient = null;

async function initSupabase() {
  if (sbClient) return sbClient;
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
      sbClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    }
  } catch (err) {
    console.error('Failed to init Supabase client', err);
  }
  return sbClient;
}

// Dealer login
async function loginDealer(email, password) {
  const sb = await initSupabase();
  
  // If Supabase is missing, use DEMO MODE
  if (!sb) {
    console.warn("DEMO MODE: Bypassing Supabase Auth");
    state.mode = 'dealer';
    state.session = { access_token: 'demo' };
    state.user = { id: 'demo-dealer', email: email || 'demo@dealer.com' };
    state.dealership_id = 'demo-dealership'; // mock id
    
    await loadDealerDashboard();
    return { success: true };
  }
  
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  
  // Verify role
  const { data: profile, error: profError } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
  if (profError || (profile.role !== 'dealer' && profile.role !== 'admin')) {
    await sb.auth.signOut();
    return { error: 'Unauthorized. Only dealers can sign in here.' };
  }
  
  state.mode = 'dealer';
  state.session = data.session;
  state.user = data.user;
  
  await loadDealerDashboard();
  return { success: true };
}

// Dealer logout
async function logoutDealer() {
  const sb = await initSupabase();
  if (sb) await sb.auth.signOut();
  state.mode = 'buyer';
  state.session = null;
  state.user = null;
  goPage(1);
}

// Check session on load
window.addEventListener('DOMContentLoaded', async () => {
  const sb = await initSupabase();
  if (sb) {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).single();
      if (profile && (profile.role === 'dealer' || profile.role === 'admin')) {
        state.mode = 'dealer';
        state.session = session;
        state.user = session.user;
        loadDealerDashboard();
      }
    }
  }
});

function showDealerLogin() {
  let modal = document.getElementById('dealer-login-modal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'dealer-login-modal';
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center;";
    modal.innerHTML = `
      <div style="background:var(--surface); padding:2rem; border-radius:8px; border:1px solid var(--gold); width:90%; max-width:400px; text-align:center;">
        <h2 style="font-family:var(--playfair); color:var(--gold); margin-bottom:1rem;">Dealer Sign In</h2>
        <input type="email" id="dl-email" class="form-input" placeholder="Email" style="margin-bottom:1rem; width:100%;" />
        <input type="password" id="dl-pass" class="form-input" placeholder="Password" style="margin-bottom:1rem; width:100%;" />
        <div id="dl-error" style="color:var(--danger); font-size:0.8rem; margin-bottom:1rem; display:none;"></div>
        <button class="btn-primary" style="width:100%; margin-bottom:1rem;" onclick="handleDealerLoginSubmit()">Sign In</button>
        <button class="btn-ghost" style="width:100%;" onclick="hideDealerLogin()">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
}

function hideDealerLogin() {
  const modal = document.getElementById('dealer-login-modal');
  if(modal) modal.style.display = 'none';
}

async function handleDealerLoginSubmit() {
  const email = document.getElementById('dl-email').value;
  const pass = document.getElementById('dl-pass').value;
  const errDiv = document.getElementById('dl-error');
  
  if(!email || !pass) {
    errDiv.textContent = 'Please enter email and password';
    errDiv.style.display = 'block';
    return;
  }
  
  const btn = document.querySelector('#dealer-login-modal .btn-primary');
  btn.textContent = 'Signing in...';
  btn.disabled = true;
  
  const res = await loginDealer(email, pass);
  
  btn.textContent = 'Sign In';
  btn.disabled = false;
  
  if(res.error) {
    errDiv.textContent = res.error;
    errDiv.style.display = 'block';
  } else {
    hideDealerLogin();
  }
}

window.showDealerLogin = showDealerLogin;
window.hideDealerLogin = hideDealerLogin;
window.handleDealerLoginSubmit = handleDealerLoginSubmit;

