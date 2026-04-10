import { registerRoute, api } from './app.js';
import { t } from './i18n.js';

let pollInterval = null;

export function register() {
  registerRoute('/orders', render);
}

const statusColors = {
  Pending: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10',
  'In progress': 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/10',
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10',
  Cancelled: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10',
  Partial: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/10',
};

async function render(container) {
  // Clear any previous poll interval
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  container.innerHTML = '';
  let currentPage = 1;
  let currentStatus = '';

  async function loadOrders() {
    const params = new URLSearchParams({ page: currentPage, limit: 20 });
    if (currentStatus) params.set('status', currentStatus);

    container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3';

    const titleDiv = document.createElement('h1');
    titleDiv.className = 'text-xl font-bold text-slate-800';
    titleDiv.textContent = t('orders.title');

    const controls = document.createElement('div');
    controls.className = 'flex gap-2.5 items-center';

    const statusSelect = document.createElement('select');
    statusSelect.className = 'px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow duration-200 cursor-pointer';
    statusSelect.setAttribute('aria-label', t('orders.filter_status'));
    const statuses = ['', 'Pending', 'In progress', 'Completed', 'Cancelled', 'Partial'];
    for (const s of statuses) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s || t('orders.all');
      opt.selected = s === currentStatus;
      statusSelect.appendChild(opt);
    }
    statusSelect.onchange = () => {
      currentStatus = statusSelect.value;
      currentPage = 1;
      loadOrders();
    };

    const newOrderBtn = document.createElement('a');
    newOrderBtn.href = '#/services';
    newOrderBtn.className = 'inline-flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer';
    newOrderBtn.innerHTML = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>';
    const btnSpan = document.createElement('span');
    btnSpan.textContent = t('orders.new_order');
    newOrderBtn.appendChild(btnSpan);

    controls.appendChild(statusSelect);
    controls.appendChild(newOrderBtn);
    header.appendChild(titleDiv);
    header.appendChild(controls);
    container.appendChild(header);

    // Loading skeleton
    const skeleton = document.createElement('div');
    skeleton.className = 'bg-white rounded-xl border border-slate-200 p-4';
    skeleton.innerHTML = Array(3).fill('<div class="skeleton h-12 rounded mb-2"></div>').join('');
    container.appendChild(skeleton);

    try {
      const res = await api(`/api/orders?${params}`);
      skeleton.remove();
      renderOrders(container, res.orders, res.pagination, loadOrders);
    } catch (err) {
      skeleton.remove();
      const errDiv = document.createElement('div');
      errDiv.className = 'bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm';
      errDiv.textContent = err.message;
      container.appendChild(errDiv);
    }
  }

  await loadOrders();

  // Start auto-polling for status updates every 15 seconds
  pollInterval = setInterval(async () => {
    // Only poll if we're still on the orders page
    if (!location.hash.startsWith('#/orders')) {
      clearInterval(pollInterval);
      pollInterval = null;
      return;
    }
    try {
      await api('api/orders/sync', { method: 'POST' });
      // Reload the list to reflect updated statuses
      const params = new URLSearchParams({ page: currentPage, limit: 20 });
      if (currentStatus) params.set('status', currentStatus);
      const res = await api(`api/orders?${params}`);
      // Update table body in-place if it exists
      const tbody = container.querySelector('tbody');
      if (tbody) {
        updateOrderRows(tbody, res.orders);
      }
    } catch {
      // Silently ignore poll errors
    }
  }, 15000);
}

function renderOrders(container, orders, pagination, reload) {
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

  const tableScroll = document.createElement('div');
  tableScroll.className = 'overflow-x-auto';

  const table = document.createElement('table');
  table.className = 'w-full text-sm';

  const thead = document.createElement('thead');
  thead.className = 'bg-slate-50 border-b border-slate-200';
  thead.innerHTML = `<tr>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">${t('orders.id')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">${t('orders.service')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">${t('orders.link')}</th>
    <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">${t('orders.quantity')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">${t('orders.status')}</th>
    <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">${t('orders.charge')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">${t('orders.date')}</th>
    <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">${t('orders.actions')}</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  tbody.className = 'divide-y divide-slate-100';

  for (const order of orders) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/50 transition-colors duration-150';
    tr.dataset.orderId = String(order.id);

    const idTd = document.createElement('td');
    idTd.className = 'px-4 py-3 text-slate-600 tabular-nums font-mono text-xs';
    idTd.textContent = order.ads4u_order_id || order.id;
    tr.appendChild(idTd);

    const svcTd = document.createElement('td');
    svcTd.className = 'px-4 py-3 text-slate-800 font-medium max-w-[150px] truncate';
    svcTd.title = order.service_name;
    svcTd.textContent = order.service_name;
    tr.appendChild(svcTd);

    const linkTd = document.createElement('td');
    linkTd.className = 'px-4 py-3 hidden lg:table-cell max-w-[200px] truncate';
    const linkA = document.createElement('a');
    linkA.href = order.link;
    linkA.target = '_blank';
    linkA.rel = 'noopener';
    linkA.className = 'text-primary-600 hover:text-primary-700 hover:underline text-xs';
    linkA.textContent = order.link;
    linkTd.appendChild(linkA);
    tr.appendChild(linkTd);

    const qtyTd = document.createElement('td');
    qtyTd.className = 'px-4 py-3 text-right text-slate-600 tabular-nums hidden sm:table-cell';
    qtyTd.textContent = order.quantity?.toLocaleString();
    tr.appendChild(qtyTd);

    const statusTd = document.createElement('td');
    statusTd.className = 'px-4 py-3';
    const badge = document.createElement('span');
    badge.className = `inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[order.status] || 'bg-slate-100 text-slate-700'}`;
    badge.textContent = order.status;
    statusTd.appendChild(badge);
    tr.appendChild(statusTd);

    const chargeTd = document.createElement('td');
    chargeTd.className = 'px-4 py-3 text-right text-slate-600 tabular-nums hidden md:table-cell';
    chargeTd.textContent = order.charge != null ? `$${order.charge}` : '-';
    tr.appendChild(chargeTd);

    const dateTd = document.createElement('td');
    dateTd.className = 'px-4 py-3 text-slate-500 text-xs hidden md:table-cell tabular-nums';
    dateTd.textContent = new Date(order.created_at).toLocaleDateString();
    tr.appendChild(dateTd);

    const actionTd = document.createElement('td');
    actionTd.className = 'px-4 py-3 text-right';
    const actionDiv = document.createElement('div');
    actionDiv.className = 'flex gap-1 justify-end';

    // Check status button
    const checkBtn = createActionBtn(
      t('orders.check_status'),
      'text-blue-600 hover:bg-blue-50',
      '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>',
      async () => {
        try {
          const res = await api(`/api/orders/${order.id}/status`);
          badge.textContent = res.status;
          badge.className = `inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[res.status] || 'bg-slate-100 text-slate-700'}`;
        } catch (err) { alert(err.message); }
      }
    );
    actionDiv.appendChild(checkBtn);

    if (order.status === 'Completed') {
      const refillBtn = createActionBtn(
        t('orders.refill'),
        'text-emerald-600 hover:bg-emerald-50',
        '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>',
        async () => {
          try {
            const res = await api(`/api/orders/${order.id}/refill`, { method: 'POST' });
            alert(`Refill ID: ${res.refill}`);
          } catch (err) { alert(err.message); }
        }
      );
      actionDiv.appendChild(refillBtn);
    }

    if (order.status === 'Pending' || order.status === 'In progress') {
      const cancelBtn = createActionBtn(
        t('orders.cancel'),
        'text-red-500 hover:bg-red-50',
        '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>',
        async () => {
          if (!confirm(t('common.confirm') + '?')) return;
          try {
            await api(`/api/orders/${order.id}/cancel`, { method: 'POST' });
            reload();
          } catch (err) { alert(err.message); }
        }
      );
      actionDiv.appendChild(cancelBtn);
    }

    actionTd.appendChild(actionDiv);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableScroll.appendChild(table);
  tableWrap.appendChild(tableScroll);
  container.appendChild(tableWrap);

  // Pagination
  if (pagination.pages > 1) {
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'flex items-center justify-center gap-2 mt-4';

    if (pagination.page > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.className = 'px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200 cursor-pointer';
      prevBtn.textContent = t('common.prev');
      prevBtn.onclick = () => { pagination.page--; reload(); };
      paginationDiv.appendChild(prevBtn);
    }

    const pageInfo = document.createElement('span');
    pageInfo.className = 'px-3 py-2 text-sm text-slate-500 tabular-nums';
    pageInfo.textContent = `${pagination.page} / ${pagination.pages}`;
    paginationDiv.appendChild(pageInfo);

    if (pagination.page < pagination.pages) {
      const nextBtn = document.createElement('button');
      nextBtn.className = 'px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200 cursor-pointer';
      nextBtn.textContent = t('common.next');
      nextBtn.onclick = () => { pagination.page++; reload(); };
      paginationDiv.appendChild(nextBtn);
    }

    container.appendChild(paginationDiv);
  }
}

function updateOrderRows(tbody, orders) {
  for (const order of orders) {
    const tr = tbody.querySelector(`tr[data-order-id="${order.id}"]`);
    if (!tr) continue;

    // Update status badge (5th cell, index 4)
    const statusTd = tr.children[4];
    if (statusTd) {
      const badge = statusTd.querySelector('span');
      if (badge && badge.textContent !== order.status) {
        badge.textContent = order.status;
        badge.className = `inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[order.status] || 'bg-slate-100 text-slate-700'}`;
        // Flash animation for changed status
        tr.style.transition = 'background-color 0.5s';
        tr.style.backgroundColor = '#eff6ff';
        setTimeout(() => { tr.style.backgroundColor = ''; }, 1500);
      }
    }

    // Update charge (6th cell, index 5)
    const chargeTd = tr.children[5];
    if (chargeTd) {
      chargeTd.textContent = order.charge != null ? `$${order.charge}` : '-';
    }
  }
}

function createActionBtn(title, colorClass, iconHtml, onclick) {
  const btn = document.createElement('button');
  btn.className = `inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium ${colorClass} transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1`;
  btn.title = title;
  btn.innerHTML = iconHtml;
  const span = document.createElement('span');
  span.className = 'hidden xl:inline';
  span.textContent = title;
  btn.appendChild(span);
  btn.onclick = onclick;
  return btn;
}
