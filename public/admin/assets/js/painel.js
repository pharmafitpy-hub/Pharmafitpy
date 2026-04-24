/* painel.js — PharmaFit B2C Admin Panel */

// ── STATE ─────────────────────────────────────────────────────────────────────
window.App = {
  admin:      null,
  vendedoras: [],
  cupons:     [],
  admins:     [],
  view:       'vendedoras',
};

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const saved = localStorage.getItem('pharmafit_b2c_admin');
  if (!saved) return (window.location.href = 'index.html');
  App.admin = JSON.parse(saved);
  document.getElementById('admin-nome').textContent = App.admin.nome || App.admin.email;

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => setView(btn.dataset.view))
  );

  // Clone nav to mobile strip
  const mobileNav = document.querySelector('.admin-nav-mobile');
  if (mobileNav) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const clone = btn.cloneNode(true);
      clone.addEventListener('click', () => setView(clone.dataset.view));
      mobileNav.appendChild(clone);
    });
  }

  showLoading(true);
  await loadAll();
  showLoading(false);
  setView('vendedoras');

  // PWA install
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    window._installPrompt = e;
    document.getElementById('install-banner')?.classList.remove('hidden');
  });
});

// ── LOADING ───────────────────────────────────────────────────────────────────
function showLoading(on) {
  document.getElementById('loading-overlay').classList.toggle('hidden', !on);
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast-${type} toast-visible`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('toast-visible'), 2800);
}

// ── LOAD ALL ──────────────────────────────────────────────────────────────────
async function loadAll() {
  try {
    const [rv, rc, ra] = await Promise.all([
      API.listarVendedoras(),
      API.listarCupons(),
      API.listarAdmins(),
    ]);
    if (rv.ok) App.vendedoras = rv.vendedoras || [];
    if (rc.ok) App.cupons     = rc.cupons     || [];
    if (ra.ok) App.admins     = ra.admins     || [];
  } catch (err) {
    toast('Erro ao carregar dados', 'error');
  }
}

// ── SET VIEW ──────────────────────────────────────────────────────────────────
function setView(v) {
  App.view = v;
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${v}`)?.classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === v);
  });

  if (v === 'vendedoras') renderVendedoras();
  if (v === 'cupons')     renderCupons();
  if (v === 'admins')     renderAdmins();
}

// ── RELOAD ────────────────────────────────────────────────────────────────────
async function reloadView() {
  showLoading(true);
  await loadAll();
  showLoading(false);
  setView(App.view);
  toast('Atualizado');
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────
function logout() {
  if (!confirm('Sair do painel?')) return;
  localStorage.removeItem('pharmafit_b2c_admin');
  window.location.href = 'index.html';
}

// ── VENDEDORAS ────────────────────────────────────────────────────────────────
function renderVendedoras(filter = '') {
  const list = App.vendedoras.filter(v =>
    !filter || v.nome?.toLowerCase().includes(filter) || v.email?.toLowerCase().includes(filter)
  );

  const stats = document.getElementById('vend-stats');
  stats.innerHTML = `
    <div class="stat-card"><div class="stat-val">${App.vendedoras.length}</div><div class="stat-lbl">Vendedoras</div></div>
  `;

  const grid = document.getElementById('vend-grid');
  if (!list.length) {
    grid.innerHTML = '<p class="empty-msg">Nenhuma vendedora encontrada</p>';
    return;
  }

  grid.innerHTML = list.map(v => {
    const inicial = (v.nome || v.email || '?')[0].toUpperCase();
    const criado  = v.criado ? new Date(v.criado).toLocaleDateString('pt-BR') : '—';
    return `
      <div class="admin-card">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="vend-avatar">${inicial}</div>
          <div>
            <div class="vend-card-name">${esc(v.nome || '—')}</div>
            <div class="vend-card-email">${esc(v.email || '—')}</div>
          </div>
        </div>
        <div class="vend-card-info">
          <span>📅 Cadastro: ${criado}</span>
          <span>🎟️ Cupons: ${contarCuponsVendedora(v.nome)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function contarCuponsVendedora(nome) {
  return App.cupons.filter(c => c.vendedora === nome && c.deletado !== 'SIM').length;
}

document.getElementById('vend-search')?.addEventListener('input', e => {
  renderVendedoras(e.target.value.trim().toLowerCase());
});

// ── CUPONS ────────────────────────────────────────────────────────────────────
function renderCupons(filter = '') {
  const list = App.cupons.filter(c =>
    !filter ||
    c.codigo?.toLowerCase().includes(filter) ||
    c.vendedora?.toLowerCase().includes(filter)
  );

  const ativos    = App.cupons.filter(c => c.deletado !== 'SIM').length;
  const inativos  = App.cupons.filter(c => c.deletado === 'SIM').length;
  const totalUsos = App.cupons.reduce((s, c) => s + (Number(c.usos) || 0), 0);

  document.getElementById('cupom-stats').innerHTML = `
    <div class="stat-card"><div class="stat-val">${ativos}</div><div class="stat-lbl">Ativos</div></div>
    <div class="stat-card"><div class="stat-val">${inativos}</div><div class="stat-lbl">Inativos</div></div>
    <div class="stat-card"><div class="stat-val">${totalUsos}</div><div class="stat-lbl">Usos totais</div></div>
  `;

  const grid = document.getElementById('cupom-grid');
  if (!list.length) {
    grid.innerHTML = '<p class="empty-msg">Nenhum cupom encontrado</p>';
    return;
  }

  grid.innerHTML = list.map(c => {
    const ativo    = c.deletado !== 'SIM';
    const validade = c.validade ? `Válido até ${c.validade}` : 'Sem validade';
    let desc = '';
    if (c.tipo === 'percentual') desc = `${c.valor}% de desconto`;
    else if (c.tipo === 'fixo')  desc = `R$ ${c.valor} de desconto`;
    else desc = c.tipo || '—';

    return `
      <div class="admin-card" style="${ativo ? '' : 'opacity:.5'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="cupom-card-code">${esc(c.codigo)}</div>
          <span class="badge ${ativo ? 'badge-on' : 'badge-off'}">${ativo ? 'Ativo' : 'Inativo'}</span>
        </div>
        <div class="cupom-card-type">${desc}</div>
        <div class="cupom-card-validity">${validade}</div>
        <div class="cupom-card-validity" style="margin-top:2px">
          👤 ${esc(c.vendedora || '—')} &nbsp;·&nbsp; 🔢 ${c.usos || 0} usos
        </div>
        <div class="admin-card-footer">
          <button class="btn-xs" onclick="toggleCupom('${esc(c.codigo)}')">
            ${ativo ? '🔴 Desativar' : '🟢 Ativar'}
          </button>
          <button class="btn-xs btn-danger" onclick="apagarCupom('${esc(c.codigo)}')">🗑️ Apagar</button>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('cupom-search')?.addEventListener('input', e => {
  renderCupons(e.target.value.trim().toLowerCase());
});

async function toggleCupom(codigo) {
  try {
    const r = await API.toggleCupom(codigo);
    if (r.ok) {
      const c = App.cupons.find(x => x.codigo === codigo);
      if (c) c.deletado = c.deletado === 'SIM' ? 'NAO' : 'SIM';
      renderCupons(document.getElementById('cupom-search')?.value.trim().toLowerCase() || '');
      toast(r.status === 'SIM' ? 'Cupom desativado' : 'Cupom ativado');
    } else toast(r.erro || 'Erro', 'error');
  } catch { toast('Erro de conexão', 'error'); }
}

async function apagarCupom(codigo) {
  if (!confirm(`Apagar cupom "${codigo}" permanentemente?`)) return;
  try {
    const r = await API.apagarCupom(codigo);
    if (r.ok) {
      App.cupons = App.cupons.filter(c => c.codigo !== codigo);
      renderCupons();
      toast('Cupom apagado');
    } else toast(r.erro || 'Erro', 'error');
  } catch { toast('Erro de conexão', 'error'); }
}

// ── CRIAR CUPOM ───────────────────────────────────────────────────────────────
function abrirCriarCupom() {
  openModal('modal-cupom');
  document.getElementById('novo-cupom-form')?.reset();
}

async function criarCupom() {
  const codigo    = document.getElementById('nc-codigo').value.trim().toUpperCase();
  const tipo      = document.getElementById('nc-tipo').value;
  const valor     = document.getElementById('nc-valor').value.trim();
  const validade  = document.getElementById('nc-validade').value.trim();
  const vendedora = document.getElementById('nc-vendedora').value.trim();

  if (!codigo || !tipo || !valor) return toast('Preencha código, tipo e valor', 'error');

  try {
    const r = await API.criarCupom({ codigo, tipo, valor, validade, vendedora });
    if (r.ok) {
      closeModal('modal-cupom');
      await loadAll();
      setView('cupons');
      toast('Cupom criado!');
    } else toast(r.erro || 'Erro', 'error');
  } catch { toast('Erro de conexão', 'error'); }
}

// ── ADMINS ────────────────────────────────────────────────────────────────────
function renderAdmins() {
  const grid = document.getElementById('admins-grid');
  if (!App.admins.length) {
    grid.innerHTML = '<p class="empty-msg">Nenhum admin cadastrado</p>';
    return;
  }

  grid.innerHTML = App.admins.map(a => {
    const inicial = (a.nome || a.email || '?')[0].toUpperCase();
    return `
      <div class="admin-card">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="vend-avatar" style="background:rgba(245,158,11,.2)">${inicial}</div>
          <div>
            <div class="vend-card-name">${esc(a.nome || '—')}</div>
            <div class="vend-card-email">${esc(a.email || '—')}</div>
          </div>
        </div>
        <div class="vend-card-info">
          <span>🏷️ Cargo: ${esc(a.cargo || 'Admin')}</span>
          <span>📅 Criado: ${a.criado ? new Date(a.criado).toLocaleDateString('pt-BR') : '—'}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.getElementById('modal-overlay')?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.getElementById('modal-overlay')?.classList.remove('open');
}

document.getElementById('modal-overlay')?.addEventListener('click', () => {
  document.querySelectorAll('.modal-box.open').forEach(m => m.classList.remove('open'));
  document.getElementById('modal-overlay')?.classList.remove('open');
});

// ── PWA INSTALL ───────────────────────────────────────────────────────────────
function installPwa() {
  const p = window._installPrompt;
  if (!p) return;
  p.prompt();
  p.userChoice.then(() => {
    window._installPrompt = null;
    document.getElementById('install-banner')?.classList.add('hidden');
  });
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── SW ────────────────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
