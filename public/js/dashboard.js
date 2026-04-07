import { registerRoute, api, getUser } from './app.js';
import { t } from './i18n.js';

export function register() {
  registerRoute('/dashboard', render);
}

function createSkeletonCards(count) {
  const row = document.createElement('div');
  row.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl border border-slate-200 p-5';
    card.innerHTML = '<div class="skeleton h-4 w-20 rounded mb-3"></div><div class="skeleton h-8 w-28 rounded"></div>';
    row.appendChild(card);
  }
  return row;
}

async function render(container) {
  container.innerHTML = '';

  const title = document.createElement('h1');
  title.className = 'text-xl font-bold text-slate-800 mb-6';
  title.textContent = t('dashboard.title');
  container.appendChild(title);

  // Show skeleton while loading
  const skeletonCards = createSkeletonCards(4);
  container.appendChild(skeletonCards);

  const user = getUser();

  let orders = [];
  try {
    const res = await api('/api/orders?limit=5');
    orders = res.orders || [];
  } catch { /* empty */ }

  let balance = null;
  if (user?.role === 'admin') {
    try {
      balance = await api('/api/balance');
    } catch { /* empty */ }
  }

  // Remove skeleton
  skeletonCards.remove();

  // Stats cards
  const statsRow = document.createElement('div');
  statsRow.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8';

  const statusCounts = { Pending: 0, 'In progress': 0, Completed: 0 };
  for (const o of orders) {
    if (statusCounts[o.status] !== undefined) statusCounts[o.status]++;
  }

  const cards = [];

  if (balance) {
    cards.push({
      label: t('dashboard.balance'),
      value: `$${balance.balance || '0'}`,
      color: 'primary',
      iconSvg: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>',
    });
  }

  cards.push(
    {
      label: t('dashboard.pending'),
      value: String(statusCounts.Pending),
      color: 'amber',
      iconSvg: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>',
    },
    {
      label: t('dashboard.in_progress'),
      value: String(statusCounts['In progress']),
      color: 'blue',
      iconSvg: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>',
    },
    {
      label: t('dashboard.completed'),
      value: String(statusCounts.Completed),
      color: 'emerald',
      iconSvg: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>',
    },
  );

  const colorMap = {
    primary: { bg: 'bg-primary-50', text: 'text-primary-600', icon: 'text-primary-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
  };

  for (const card of cards) {
    const colors = colorMap[card.color];
    const div = document.createElement('div');
    div.className = 'bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:shadow-slate-100 transition-shadow duration-200';

    const topRow = document.createElement('div');
    topRow.className = 'flex items-center justify-between mb-3';

    const label = document.createElement('p');
    label.className = 'text-sm font-medium text-slate-500';
    label.textContent = card.label;

    const iconWrap = document.createElement('div');
    iconWrap.className = `w-9 h-9 ${colors.bg} rounded-lg flex items-center justify-center ${colors.icon}`;
    iconWrap.innerHTML = card.iconSvg;

    topRow.appendChild(label);
    topRow.appendChild(iconWrap);

    const value = document.createElement('p');
    value.className = `text-2xl font-bold ${colors.text} tabular-nums`;
    value.textContent = card.value;

    div.appendChild(topRow);
    div.appendChild(value);
    statsRow.appendChild(div);
  }

  container.appendChild(statsRow);

  // Recent orders
  const sectionHeader = document.createElement('div');
  sectionHeader.className = 'flex items-center justify-between mb-4';

  const recentTitle = document.createElement('h2');
  recentTitle.className = 'text-base font-semibold text-slate-700';
  recentTitle.textContent = t('dashboard.recent_orders');

  const viewAllLink = document.createElement('a');
  viewAllLink.href = '#/orders';
  viewAllLink.className = 'text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer';
  viewAllLink.textContent = t('orders.title') + ' →';

  sectionHeader.appendChild(recentTitle);
  sectionHeader.appendChild(viewAllLink);
  container.appendChild(sectionHeader);

  if (orders.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'bg-white rounded-xl border border-slate-200 p-12 text-center';
    emptyState.innerHTML = `
      <svg class="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" /></svg>
      <p class="text-slate-400 text-sm">${t('common.no_data')}</p>
    `;
    container.appendChild(emptyState);
    return;
  }

  const tableWrap = document.createElement('div');
  tableWrap.className = 'bg-white rounded-xl border border-slate-200 overflow-hidden';

  const table = document.createElement('table');
  table.className = 'w-full text-sm';

  const thead = document.createElement('thead');
  thead.className = 'bg-slate-50 border-b border-slate-200';
  thead.innerHTML = `<tr>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">${t('orders.id')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">${t('orders.service')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">${t('orders.link')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">${t('orders.status')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">${t('orders.date')}</th>
  </tr>`;
  table.appendChild(thead);

  const statusColors = {
    Pending: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10',
    'In progress': 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/10',
    Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10',
    Cancelled: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10',
    Partial: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/10',
  };

  const tbody = document.createElement('tbody');
  tbody.className = 'divide-y divide-slate-100';

  for (const order of orders) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/50 transition-colors duration-150';

    const idTd = document.createElement('td');
    idTd.className = 'px-4 py-3 text-slate-600 tabular-nums font-mono text-xs';
    idTd.textContent = order.ads4u_order_id || order.id;
    tr.appendChild(idTd);

    const svcTd = document.createElement('td');
    svcTd.className = 'px-4 py-3 text-slate-800 font-medium truncate max-w-[180px]';
    svcTd.textContent = order.service_name;
    svcTd.title = order.service_name;
    tr.appendChild(svcTd);

    const linkTd = document.createElement('td');
    linkTd.className = 'px-4 py-3 hidden sm:table-cell truncate max-w-[200px]';
    const linkA = document.createElement('a');
    linkA.href = order.link;
    linkA.target = '_blank';
    linkA.rel = 'noopener';
    linkA.className = 'text-primary-600 hover:text-primary-700 hover:underline text-xs';
    linkA.textContent = order.link;
    linkTd.appendChild(linkA);
    tr.appendChild(linkTd);

    const statusTd = document.createElement('td');
    statusTd.className = 'px-4 py-3';
    const badge = document.createElement('span');
    badge.className = `inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[order.status] || 'bg-slate-100 text-slate-700'}`;
    badge.textContent = order.status;
    statusTd.appendChild(badge);
    tr.appendChild(statusTd);

    const dateTd = document.createElement('td');
    dateTd.className = 'px-4 py-3 text-slate-500 text-xs hidden md:table-cell tabular-nums';
    dateTd.textContent = new Date(order.created_at).toLocaleDateString();
    tr.appendChild(dateTd);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  container.appendChild(tableWrap);
}
