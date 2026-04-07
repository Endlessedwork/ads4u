import { registerRoute, api } from './app.js';
import { t } from './i18n.js';

export function register() {
  registerRoute('/orders', render);
}

async function render(container) {
  container.innerHTML = `<p class="text-gray-400">${t('common.loading')}</p>`;
  let currentPage = 1;
  let currentStatus = '';

  async function loadOrders() {
    const params = new URLSearchParams({ page: currentPage, limit: 20 });
    if (currentStatus) params.set('status', currentStatus);
    try {
      const res = await api(`/api/orders?${params}`);
      renderOrders(container, res.orders, res.pagination);
    } catch (err) {
      container.innerHTML = '';
      const errP = document.createElement('p');
      errP.className = 'text-red-500';
      errP.textContent = err.message;
      container.appendChild(errP);
    }
  }

  function renderOrders(container, orders, pagination) {
    container.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3';
    const title = document.createElement('h1');
    title.className = 'text-2xl font-bold text-gray-800';
    title.textContent = t('orders.title');
    const controls = document.createElement('div');
    controls.className = 'flex gap-3 items-center';

    const statusSelect = document.createElement('select');
    statusSelect.className = 'px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
    const statuses = ['', 'Pending', 'In progress', 'Completed', 'Cancelled', 'Partial'];
    for (const s of statuses) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s || t('orders.all');
      opt.selected = s === currentStatus;
      statusSelect.appendChild(opt);
    }
    statusSelect.onchange = () => { currentStatus = statusSelect.value; currentPage = 1; loadOrders(); };

    const newOrderBtn = document.createElement('a');
    newOrderBtn.href = '#/services';
    newOrderBtn.className = 'bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 transition';
    newOrderBtn.textContent = t('orders.new_order');

    controls.appendChild(statusSelect);
    controls.appendChild(newOrderBtn);
    header.appendChild(title);
    header.appendChild(controls);
    container.appendChild(header);

    if (orders.length === 0) {
      const noData = document.createElement('p');
      noData.className = 'text-gray-400 mt-4';
      noData.textContent = t('common.no_data');
      container.appendChild(noData);
      return;
    }

    const tableWrap = document.createElement('div');
    tableWrap.className = 'overflow-x-auto';
    const table = document.createElement('table');
    table.className = 'w-full bg-white rounded-xl shadow-sm border text-sm';
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr class="border-b bg-gray-50">
      <th class="px-4 py-3 text-left text-gray-500">${t('orders.id')}</th>
      <th class="px-4 py-3 text-left text-gray-500">${t('orders.service')}</th>
      <th class="px-4 py-3 text-left text-gray-500">${t('orders.link')}</th>
      <th class="px-4 py-3 text-left text-gray-500">${t('orders.quantity')}</th>
      <th class="px-4 py-3 text-left text-gray-500">${t('orders.status')}</th>
      <th class="px-4 py-3 text-left text-gray-500">${t('orders.charge')}</th>
      <th class="px-4 py-3 text-left text-gray-500">${t('orders.date')}</th>
      <th class="px-4 py-3 text-left text-gray-500">${t('orders.actions')}</th>
    </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const statusColors = {
      Pending: 'bg-yellow-100 text-yellow-800',
      'In progress': 'bg-blue-100 text-blue-800',
      Completed: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800',
      Partial: 'bg-orange-100 text-orange-800',
    };

    for (const order of orders) {
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-gray-50';

      addCell(tr, order.ads4u_order_id || order.id);

      const svcTd = document.createElement('td');
      svcTd.className = 'px-4 py-3 text-gray-700 max-w-[150px] truncate';
      svcTd.title = order.service_name;
      svcTd.textContent = order.service_name;
      tr.appendChild(svcTd);

      const linkTd = document.createElement('td');
      linkTd.className = 'px-4 py-3 max-w-[200px] truncate';
      const linkA = document.createElement('a');
      linkA.href = order.link;
      linkA.target = '_blank';
      linkA.rel = 'noopener';
      linkA.className = 'text-primary-600 hover:underline';
      linkA.textContent = order.link;
      linkTd.appendChild(linkA);
      tr.appendChild(linkTd);

      addCell(tr, order.quantity);

      const statusTd = document.createElement('td');
      statusTd.className = 'px-4 py-3';
      const badge = document.createElement('span');
      badge.className = `px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`;
      badge.textContent = order.status;
      statusTd.appendChild(badge);
      tr.appendChild(statusTd);

      addCell(tr, order.charge != null ? `$${order.charge}` : '-');
      addCell(tr, new Date(order.created_at).toLocaleDateString());

      const actionTd = document.createElement('td');
      actionTd.className = 'px-4 py-3';
      const actionDiv = document.createElement('div');
      actionDiv.className = 'flex gap-1';

      const checkBtn = createActionBtn(t('orders.check_status'), 'text-blue-600 hover:bg-blue-50', async () => {
        try {
          const res = await api(`/api/orders/${order.id}/status`);
          badge.textContent = res.status;
          badge.className = `px-2 py-1 rounded-full text-xs font-medium ${statusColors[res.status] || 'bg-gray-100 text-gray-800'}`;
        } catch (err) { alert(err.message); }
      });
      actionDiv.appendChild(checkBtn);

      if (order.status === 'Completed') {
        const refillBtn = createActionBtn(t('orders.refill'), 'text-green-600 hover:bg-green-50', async () => {
          try {
            const res = await api(`/api/orders/${order.id}/refill`, { method: 'POST' });
            alert(`Refill ID: ${res.refill}`);
          } catch (err) { alert(err.message); }
        });
        actionDiv.appendChild(refillBtn);
      }

      if (order.status === 'Pending' || order.status === 'In progress') {
        const cancelBtn = createActionBtn(t('orders.cancel'), 'text-red-600 hover:bg-red-50', async () => {
          if (!confirm(t('common.confirm') + '?')) return;
          try {
            await api(`/api/orders/${order.id}/cancel`, { method: 'POST' });
            loadOrders();
          } catch (err) { alert(err.message); }
        });
        actionDiv.appendChild(cancelBtn);
      }

      actionTd.appendChild(actionDiv);
      tr.appendChild(actionTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);

    if (pagination.pages > 1) {
      const paginationDiv = document.createElement('div');
      paginationDiv.className = 'flex justify-center gap-2 mt-4';
      if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'px-4 py-2 border rounded-lg text-sm hover:bg-gray-50';
        prevBtn.textContent = t('common.prev');
        prevBtn.onclick = () => { currentPage--; loadOrders(); };
        paginationDiv.appendChild(prevBtn);
      }
      const pageInfo = document.createElement('span');
      pageInfo.className = 'px-4 py-2 text-sm text-gray-500';
      pageInfo.textContent = `${currentPage} / ${pagination.pages}`;
      paginationDiv.appendChild(pageInfo);
      if (currentPage < pagination.pages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'px-4 py-2 border rounded-lg text-sm hover:bg-gray-50';
        nextBtn.textContent = t('common.next');
        nextBtn.onclick = () => { currentPage++; loadOrders(); };
        paginationDiv.appendChild(nextBtn);
      }
      container.appendChild(paginationDiv);
    }
  }

  await loadOrders();
}

function addCell(tr, text) {
  const td = document.createElement('td');
  td.className = 'px-4 py-3 text-gray-700';
  td.textContent = text;
  tr.appendChild(td);
}

function createActionBtn(text, colorClass, onclick) {
  const btn = document.createElement('button');
  btn.className = `px-2 py-1 rounded text-xs font-medium ${colorClass} transition`;
  btn.textContent = text;
  btn.onclick = onclick;
  return btn;
}
