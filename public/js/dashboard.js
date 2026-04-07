import { registerRoute, api, getUser } from './app.js';
import { t } from './i18n.js';

export function register() {
  registerRoute('/dashboard', render);
}

async function render(container) {
  container.innerHTML = `<p class="text-gray-400">${t('common.loading')}</p>`;

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

  container.innerHTML = '';

  const title = document.createElement('h1');
  title.className = 'text-2xl font-bold text-gray-800 mb-6';
  title.textContent = t('dashboard.title');
  container.appendChild(title);

  const statsRow = document.createElement('div');
  statsRow.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8';

  const statusCounts = { Pending: 0, 'In progress': 0, Completed: 0 };
  for (const o of orders) {
    if (statusCounts[o.status] !== undefined) statusCounts[o.status]++;
  }

  const cards = [
    { label: t('dashboard.pending'), value: statusCounts.Pending, color: 'yellow' },
    { label: t('dashboard.in_progress'), value: statusCounts['In progress'], color: 'blue' },
    { label: t('dashboard.completed'), value: statusCounts.Completed, color: 'green' },
  ];

  if (balance) {
    cards.unshift({ label: t('dashboard.balance'), value: `${balance.balance} ${balance.currency || ''}`, color: 'primary' });
  }

  for (const card of cards) {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-xl shadow-sm border p-5';
    const label = document.createElement('p');
    label.className = 'text-sm text-gray-500';
    label.textContent = card.label;
    const value = document.createElement('p');
    value.className = 'text-2xl font-bold text-gray-800 mt-1';
    value.textContent = card.value;
    div.appendChild(label);
    div.appendChild(value);
    statsRow.appendChild(div);
  }
  container.appendChild(statsRow);

  const recentTitle = document.createElement('h2');
  recentTitle.className = 'text-lg font-semibold text-gray-700 mb-3';
  recentTitle.textContent = t('dashboard.recent_orders');
  container.appendChild(recentTitle);

  if (orders.length === 0) {
    const noData = document.createElement('p');
    noData.className = 'text-gray-400';
    noData.textContent = t('common.no_data');
    container.appendChild(noData);
    return;
  }

  const table = document.createElement('table');
  table.className = 'w-full bg-white rounded-xl shadow-sm border text-sm';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr class="border-b bg-gray-50">
    <th class="px-4 py-3 text-left text-gray-500">${t('orders.id')}</th>
    <th class="px-4 py-3 text-left text-gray-500">${t('orders.service')}</th>
    <th class="px-4 py-3 text-left text-gray-500">${t('orders.link')}</th>
    <th class="px-4 py-3 text-left text-gray-500">${t('orders.status')}</th>
    <th class="px-4 py-3 text-left text-gray-500">${t('orders.date')}</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const order of orders) {
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-gray-50';
    const cells = [order.ads4u_order_id || order.id, order.service_name, order.link, order.status, new Date(order.created_at).toLocaleDateString()];
    for (const cellText of cells) {
      const td = document.createElement('td');
      td.className = 'px-4 py-3 text-gray-700 truncate max-w-[200px]';
      td.textContent = cellText;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}
