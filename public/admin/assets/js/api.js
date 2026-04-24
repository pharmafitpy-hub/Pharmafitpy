/* api.js — Wrapper GAS para o Admin B2C Panel */

const API = {
  async call(params) {
    const admin = window.App?.admin;
    if (admin) {
      if (!params.email) params.email = admin.email;
      if (!params.token) params.token = admin.token;
    }
    const url = new URL(SHEETS_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.erro === 'Não autorizado' && admin) {
      localStorage.removeItem('pharmafit_b2c_admin');
      alert('Sessão expirada. Faça login novamente.');
      window.location.href = 'index.html';
    }
    return data;
  },

  listarVendedoras:  ()      => API.call({ action: 'listar_vendedoras_admin' }),
  listarCupons:      ()      => API.call({ action: 'listar_cupons_admin' }),
  toggleCupom:       (codigo) => API.call({ action: 'toggle_cupom_admin', codigo }),
  apagarCupom:       (codigo) => API.call({ action: 'apagar_cupom_admin', codigo }),
  criarCupom:        (p)     => API.call({ action: 'criar_cupom_admin', ...p }),
  listarAdmins:      ()      => API.call({ action: 'listar_admins' }),
};
