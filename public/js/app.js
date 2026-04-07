import { initI18n, t, toggleLang, getLang } from './i18n.js';

let currentUser = null;

// --- SVG Icon helpers (Heroicons outline, 20x20) ---
const icons = {
  dashboard: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" /></svg>',
  services: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>',
  orders: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>',
  admin: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>',
  globe: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>',
  logout: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>',
};

// --- API helper ---
export async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// --- Router ---
const routes = {};

export function registerRoute(hash, renderFn) {
  routes[hash] = renderFn;
}

async function navigate() {
  const hash = location.hash.slice(1) || '/dashboard';
  const content = document.getElementById('content');

  // Highlight active nav
  document.querySelectorAll('#sidebarNav a').forEach(a => {
    const isActive = a.getAttribute('href') === `#${hash}`;
    a.classList.toggle('active', isActive);
  });

  const renderFn = routes[hash];
  if (renderFn) {
    content.innerHTML = '';
    await renderFn(content);
  }

  // Close mobile sidebar after navigation
  closeMobileSidebar();
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (window.innerWidth < 768) {
    sidebar.classList.add('hidden');
    overlay.classList.add('hidden');
  }
}

// --- Build sidebar ---
function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '';

  const items = [
    { hash: '/dashboard', icon: icons.dashboard, labelKey: 'nav.dashboard' },
    { hash: '/services', icon: icons.services, labelKey: 'nav.services' },
    { hash: '/orders', icon: icons.orders, labelKey: 'nav.orders' },
  ];

  if (currentUser?.role === 'admin') {
    items.push({ hash: '/admin', icon: icons.admin, labelKey: 'nav.admin_users' });
  }

  for (const item of items) {
    const a = document.createElement('a');
    a.href = `#${item.hash}`;
    a.className = 'sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 text-sm font-medium cursor-pointer';
    a.innerHTML = item.icon;
    const span = document.createElement('span');
    span.textContent = t(item.labelKey);
    a.appendChild(span);
    nav.appendChild(a);
  }

  // Spacer
  const spacer = document.createElement('div');
  spacer.className = 'flex-1 min-h-[24px]';
  nav.appendChild(spacer);

  // Divider
  const divider = document.createElement('div');
  divider.className = 'border-t border-slate-100 my-2';
  nav.appendChild(divider);

  // Lang toggle
  const langBtn = document.createElement('button');
  langBtn.className = 'sidebar-link flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 text-xs font-medium w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500';
  langBtn.innerHTML = icons.globe;
  const langSpan = document.createElement('span');
  langSpan.textContent = getLang() === 'th' ? 'English' : 'ภาษาไทย';
  langBtn.appendChild(langSpan);
  langBtn.onclick = async () => {
    await toggleLang();
    buildSidebar();
    navigate();
  };
  nav.appendChild(langBtn);

  // Logout
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'sidebar-link flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 text-xs font-medium w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500';
  logoutBtn.innerHTML = icons.logout;
  const logoutSpan = document.createElement('span');
  logoutSpan.textContent = t('nav.logout');
  logoutBtn.appendChild(logoutSpan);
  logoutBtn.onclick = async () => {
    await fetch('/auth/logout', { method: 'POST' });
    location.reload();
  };
  nav.appendChild(logoutBtn);

  // User info
  const userInfo = document.getElementById('userInfo');
  userInfo.innerHTML = '';
  if (currentUser) {
    const img = document.createElement('img');
    img.src = currentUser.avatar_url;
    img.className = 'w-8 h-8 rounded-full ring-2 ring-slate-100 flex-shrink-0';
    img.alt = currentUser.name;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-sm text-slate-700 font-medium truncate';
    nameSpan.textContent = currentUser.name;

    const roleBadge = document.createElement('span');
    roleBadge.className = currentUser.role === 'admin'
      ? 'text-[10px] font-semibold uppercase tracking-wider text-primary-600'
      : 'text-[10px] font-medium uppercase tracking-wider text-slate-400';
    roleBadge.textContent = currentUser.role;

    const textDiv = document.createElement('div');
    textDiv.className = 'flex flex-col min-w-0';
    textDiv.appendChild(nameSpan);
    textDiv.appendChild(roleBadge);

    userInfo.appendChild(img);
    userInfo.appendChild(textDiv);
  }
}

// --- Init ---
async function init() {
  await initI18n();

  try {
    currentUser = await api('/api/me');
  } catch {
    document.getElementById('loginView').classList.remove('hidden');
    document.getElementById('appView').classList.add('hidden');

    document.getElementById('langToggleLogin')?.addEventListener('click', async () => {
      await toggleLang();
    });
    return;
  }

  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');

  // Mobile menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  menuToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
    overlay.classList.toggle('hidden');
  });

  overlay?.addEventListener('click', closeMobileSidebar);

  // Dynamically import page modules
  const [dashboardMod, servicesMod, ordersMod, adminMod] = await Promise.all([
    import('./dashboard.js'),
    import('./services.js'),
    import('./orders.js'),
    import('./admin.js'),
  ]);

  dashboardMod.register();
  servicesMod.register();
  ordersMod.register();
  adminMod.register();

  buildSidebar();
  window.addEventListener('hashchange', navigate);
  navigate();
}

export function getUser() {
  return currentUser;
}

init();
