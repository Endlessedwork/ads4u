import { registerRoute, api } from './app.js';
import { t } from './i18n.js';

let allServices = [];

export function register() {
  registerRoute('/services', render);
}

async function render(container) {
  container.innerHTML = `<p class="text-gray-400">${t('common.loading')}</p>`;
  try {
    allServices = await api('/api/services');
  } catch (err) {
    container.innerHTML = '';
    const errP = document.createElement('p');
    errP.className = 'text-red-500';
    errP.textContent = err.message;
    container.appendChild(errP);
    return;
  }

  container.innerHTML = '';

  const title = document.createElement('h1');
  title.className = 'text-2xl font-bold text-gray-800 mb-4';
  title.textContent = t('services.title');
  container.appendChild(title);

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = t('services.search');
  searchInput.className = 'w-full md:w-96 px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500';
  searchInput.oninput = () => renderTable(tableBody, searchInput.value);
  container.appendChild(searchInput);

  const table = document.createElement('table');
  table.className = 'w-full bg-white rounded-xl shadow-sm border text-sm';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr class="border-b bg-gray-50">
    <th class="px-4 py-3 text-left text-gray-500">${t('services.id')}</th>
    <th class="px-4 py-3 text-left text-gray-500">${t('services.name')}</th>
    <th class="px-4 py-3 text-left text-gray-500">${t('services.category')}</th>
    <th class="px-4 py-3 text-left text-gray-500">${t('services.rate')}</th>
    <th class="px-4 py-3 text-left text-gray-500">${t('services.min')}/${t('services.max')}</th>
    <th class="px-4 py-3 text-left text-gray-500"></th>
  </tr>`;
  table.appendChild(thead);
  const tableBody = document.createElement('tbody');
  table.appendChild(tableBody);
  container.appendChild(table);
  renderTable(tableBody, '');

  const modal = document.createElement('div');
  modal.id = 'orderModal';
  modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
      <h2 class="text-lg font-bold text-gray-800 mb-4" id="orderModalTitle"></h2>
      <form id="orderForm" class="space-y-4">
        <input type="hidden" id="orderServiceId" />
        <input type="hidden" id="orderServiceName" />
        <div>
          <label class="block text-sm text-gray-600 mb-1">${t('order_form.link')}</label>
          <input type="url" id="orderLink" required class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="${t('order_form.link_placeholder')}" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">${t('order_form.quantity')}</label>
          <input type="number" id="orderQuantity" required min="1" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div id="orderMessage" class="text-sm hidden"></div>
        <div class="flex gap-3">
          <button type="submit" class="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition">${t('order_form.submit')}</button>
          <button type="button" id="orderCancel" class="flex-1 border py-2 rounded-lg hover:bg-gray-50 transition">${t('common.cancel')}</button>
        </div>
      </form>
    </div>
  `;
  container.appendChild(modal);
  document.getElementById('orderCancel').onclick = () => modal.classList.add('hidden');
  document.getElementById('orderForm').onsubmit = handleOrderSubmit;
}

function renderTable(tbody, query) {
  tbody.innerHTML = '';
  const q = query.toLowerCase();
  const filtered = allServices.filter(s =>
    !q || s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) || String(s.service).includes(q)
  );
  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'px-4 py-8 text-center text-gray-400';
    td.textContent = t('common.no_data');
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  for (const svc of filtered) {
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-gray-50';
    const cells = [svc.service, svc.name, svc.category || '-', `$${svc.rate}`, `${svc.min} / ${svc.max}`];
    for (const cellText of cells) {
      const td = document.createElement('td');
      td.className = 'px-4 py-3 text-gray-700';
      td.textContent = cellText;
      tr.appendChild(td);
    }
    const actionTd = document.createElement('td');
    actionTd.className = 'px-4 py-3';
    const orderBtn = document.createElement('button');
    orderBtn.className = 'bg-primary-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-primary-700 transition';
    orderBtn.textContent = t('services.order');
    orderBtn.onclick = () => openOrderModal(svc);
    actionTd.appendChild(orderBtn);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  }
}

function openOrderModal(service) {
  document.getElementById('orderServiceId').value = service.service;
  document.getElementById('orderServiceName').value = service.name;
  document.getElementById('orderModalTitle').textContent = service.name;
  document.getElementById('orderLink').value = '';
  document.getElementById('orderQuantity').value = service.min || '';
  document.getElementById('orderQuantity').min = service.min || 1;
  document.getElementById('orderQuantity').max = service.max || '';
  document.getElementById('orderMessage').classList.add('hidden');
  document.getElementById('orderModal').classList.remove('hidden');
}

async function handleOrderSubmit(e) {
  e.preventDefault();
  const msgEl = document.getElementById('orderMessage');
  const body = {
    serviceId: document.getElementById('orderServiceId').value,
    serviceName: document.getElementById('orderServiceName').value,
    link: document.getElementById('orderLink').value,
    quantity: document.getElementById('orderQuantity').value,
  };
  try {
    await api('/api/orders', { method: 'POST', body: JSON.stringify(body) });
    msgEl.textContent = t('order_form.success');
    msgEl.className = 'text-sm text-green-600';
    msgEl.classList.remove('hidden');
    setTimeout(() => { document.getElementById('orderModal').classList.add('hidden'); location.hash = '#/orders'; }, 1000);
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.className = 'text-sm text-red-600';
    msgEl.classList.remove('hidden');
  }
}
