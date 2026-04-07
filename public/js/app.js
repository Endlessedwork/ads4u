import { initI18n, t, toggleLang, getLang } from './i18n.js';

let currentUser = null;

export async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const routes = {};

export function registerRoute(hash, renderFn) {
  routes[hash] = renderFn;
}

async function navigate() {
  const hash = location.hash.slice(1) || '/dashboard';
  const content = document.getElementById('content');
  document.querySelectorAll('#sidebarNav a').forEach(a => {
    a.classList.toggle('bg-primary-50', a.getAttribute('href') === `#${hash}`);
    a.classList.toggle('text-primary-700', a.getAttribute('href') === `#${hash}`);
  });
  const renderFn = routes[hash];
  if (renderFn) {
    content.innerHTML = '';
    await renderFn(content);
  }
}

function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '';
  const items = [
    { hash: '/dashboard', icon: '\u{1F4CA}', labelKey: 'nav.dashboard' },
    { hash: '/services', icon: '\u{1F6CD}\uFE0F', labelKey: 'nav.services' },
    { hash: '/orders', icon: '\u{1F4CB}', labelKey: 'nav.orders' },
  ];
  if (currentUser?.role === 'admin') {
    items.push({ hash: '/admin', icon: '\u{1F465}', labelKey: 'nav.admin_users' });
  }
  for (const item of items) {
    const a = document.createElement('a');
    a.href = `#${item.hash}`;
    a.className = 'flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition';
    a.textContent = `${item.icon} ${t(item.labelKey)}`;
    nav.appendChild(a);
  }
  const langBtn = document.createElement('button');
  langBtn.className = 'flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition text-sm mt-2';
  langBtn.textContent = `\u{1F310} ${getLang() === 'th' ? 'English' : '\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22'}`;
  langBtn.onclick = async () => { await toggleLang(); buildSidebar(); navigate(); };
  nav.appendChild(langBtn);
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition text-sm mt-1';
  logoutBtn.textContent = `\u{1F6AA} ${t('nav.logout')}`;
  logoutBtn.onclick = async () => { await fetch('/auth/logout', { method: 'POST' }); location.reload(); };
  nav.appendChild(logoutBtn);
  const userInfo = document.getElementById('userInfo');
  userInfo.innerHTML = '';
  if (currentUser) {
    const img = document.createElement('img');
    img.src = currentUser.avatar_url;
    img.className = 'w-8 h-8 rounded-full';
    img.alt = currentUser.name;
    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-sm text-gray-700 truncate';
    nameSpan.textContent = currentUser.name;
    const roleSpan = document.createElement('span');
    roleSpan.className = 'text-xs text-gray-400';
    roleSpan.textContent = currentUser.role;
    const textDiv = document.createElement('div');
    textDiv.className = 'flex flex-col min-w-0';
    textDiv.appendChild(nameSpan);
    textDiv.appendChild(roleSpan);
    userInfo.appendChild(img);
    userInfo.appendChild(textDiv);
  }
}

async function init() {
  await initI18n();
  try {
    currentUser = await api('/api/me');
  } catch {
    document.getElementById('loginView').classList.remove('hidden');
    document.getElementById('appView').classList.add('hidden');
    document.getElementById('langToggleLogin')?.addEventListener('click', async () => { await toggleLang(); });
    return;
  }
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('hidden');
  });
  const [dashboardMod, servicesMod, ordersMod, adminMod] = await Promise.all([
    import('./dashboard.js'), import('./services.js'), import('./orders.js'), import('./admin.js'),
  ]);
  dashboardMod.register();
  servicesMod.register();
  ordersMod.register();
  adminMod.register();
  buildSidebar();
  window.addEventListener('hashchange', navigate);
  navigate();
}

export function getUser() { return currentUser; }

init();
