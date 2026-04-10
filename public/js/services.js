import { registerRoute, api } from './app.js';
import { t } from './i18n.js';

let allServices = [];

export function register() {
  registerRoute('/services', render);
}

async function render(container) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5';

  const title = document.createElement('h1');
  title.className = 'text-xl font-bold text-slate-800';
  title.textContent = t('services.title');
  header.appendChild(title);

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = t('services.search');
  searchInput.className = 'w-full sm:w-80 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow duration-200';
  searchInput.setAttribute('aria-label', t('services.search'));
  header.appendChild(searchInput);

  container.appendChild(header);

  // Loading skeleton
  const skeleton = document.createElement('div');
  skeleton.className = 'bg-white rounded-xl border border-slate-200 p-4';
  skeleton.innerHTML = Array(5).fill('<div class="skeleton h-10 rounded mb-2"></div>').join('');
  container.appendChild(skeleton);

  try {
    allServices = await api('/api/services');
  } catch (err) {
    skeleton.remove();
    const errDiv = document.createElement('div');
    errDiv.className = 'bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm';
    errDiv.textContent = err.message;
    container.appendChild(errDiv);
    return;
  }

  skeleton.remove();

  const tableWrap = document.createElement('div');
  tableWrap.className = 'bg-white rounded-xl border border-slate-200 overflow-hidden';

  const tableScroll = document.createElement('div');
  tableScroll.className = 'overflow-x-auto';

  const table = document.createElement('table');
  table.className = 'w-full text-sm';

  const thead = document.createElement('thead');
  thead.className = 'bg-slate-50 border-b border-slate-200';
  thead.innerHTML = `<tr>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">${t('services.id')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">${t('services.name')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">${t('services.category')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">${t('services.rate')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">${t('services.min')}/${t('services.max')}</th>
    <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
  </tr>`;
  table.appendChild(thead);

  const tableBody = document.createElement('tbody');
  tableBody.className = 'divide-y divide-slate-100';
  table.appendChild(tableBody);
  tableScroll.appendChild(table);
  tableWrap.appendChild(tableScroll);

  // Count badge
  const countBadge = document.createElement('div');
  countBadge.className = 'px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400';
  countBadge.id = 'serviceCount';
  tableWrap.appendChild(countBadge);

  container.appendChild(tableWrap);

  renderTable(tableBody, '');
  searchInput.oninput = () => renderTable(tableBody, searchInput.value);

  // Order modal
  const modal = document.createElement('div');
  modal.id = 'orderModal';
  modal.className = 'hidden fixed inset-0 z-50 flex items-center justify-center';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <div class="absolute inset-0 bg-slate-900/30" id="orderModalBackdrop"></div>
    <div class="relative bg-white rounded-2xl shadow-2xl shadow-slate-300/50 p-6 max-w-md w-full mx-4 border border-slate-200">
      <h2 class="text-lg font-bold text-slate-800 mb-1" id="orderModalTitle"></h2>
      <p class="text-sm text-slate-500 mb-5" id="orderModalSubtitle"></p>
      <form id="orderForm" class="space-y-4">
        <input type="hidden" id="orderServiceId" />
        <input type="hidden" id="orderServiceName" />
        <div>
          <label for="orderLink" class="block text-sm font-medium text-slate-700 mb-1.5">${t('order_form.link')}</label>
          <input type="url" id="orderLink" required class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow duration-200" placeholder="${t('order_form.link_placeholder')}" />
        </div>
        <div>
          <label for="orderQuantity" class="block text-sm font-medium text-slate-700 mb-1.5">${t('order_form.quantity')}</label>
          <input type="number" id="orderQuantity" required min="1" class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow duration-200 tabular-nums" />
          <p class="text-xs text-slate-400 mt-1" id="orderQuantityHint"></p>
        </div>
        <div id="orderCommentsGroup" class="hidden">
          <label for="orderComments" class="block text-sm font-medium text-slate-700 mb-1.5">${t('order_form.comments')}</label>
          <textarea id="orderComments" rows="4" class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow duration-200 resize-y" placeholder="${t('order_form.comments_placeholder')}"></textarea>
          <p class="text-xs text-slate-400 mt-1">${t('order_form.comments_hint')}</p>
        </div>
        <div id="orderMessage" class="text-sm hidden rounded-lg px-3 py-2"></div>
        <div class="flex gap-3 pt-1">
          <button type="submit" class="flex-1 bg-primary-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer">${t('order_form.submit')}</button>
          <button type="button" id="orderCancel" class="flex-1 bg-white border border-slate-200 text-slate-600 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer">${t('common.cancel')}</button>
        </div>
      </form>
    </div>
  `;
  container.appendChild(modal);

  document.getElementById('orderModalBackdrop').onclick = () => modal.classList.add('hidden');
  document.getElementById('orderCancel').onclick = () => modal.classList.add('hidden');
  document.getElementById('orderForm').onsubmit = handleOrderSubmit;
}

function renderTable(tbody, query) {
  tbody.innerHTML = '';
  const q = query.toLowerCase();
  const filtered = allServices.filter(s =>
    !q || s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) || String(s.service).includes(q)
  );

  const countEl = document.getElementById('serviceCount');
  if (countEl) {
    countEl.textContent = `${filtered.length} / ${allServices.length} services`;
  }

  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'px-4 py-12 text-center';
    td.innerHTML = `
      <svg class="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
      <p class="text-slate-400 text-sm">${t('common.no_data')}</p>
    `;
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const svc of filtered) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/50 transition-colors duration-150';

    const idTd = document.createElement('td');
    idTd.className = 'px-4 py-3 text-slate-500 tabular-nums font-mono text-xs';
    idTd.textContent = svc.service;
    tr.appendChild(idTd);

    const nameTd = document.createElement('td');
    nameTd.className = 'px-4 py-3 text-slate-800 font-medium text-sm max-w-[300px]';
    nameTd.textContent = svc.name;
    nameTd.title = svc.name;
    tr.appendChild(nameTd);

    const catTd = document.createElement('td');
    catTd.className = 'px-4 py-3 text-slate-500 text-xs hidden md:table-cell';
    catTd.textContent = svc.category || '-';
    tr.appendChild(catTd);

    const rateTd = document.createElement('td');
    rateTd.className = 'px-4 py-3 text-slate-700 font-medium tabular-nums text-sm';
    rateTd.textContent = `$${svc.rate}`;
    tr.appendChild(rateTd);

    const rangeTd = document.createElement('td');
    rangeTd.className = 'px-4 py-3 text-slate-500 tabular-nums text-xs hidden sm:table-cell';
    rangeTd.textContent = `${svc.min} – ${svc.max}`;
    tr.appendChild(rangeTd);

    const actionTd = document.createElement('td');
    actionTd.className = 'px-4 py-3 text-right';
    const orderBtn = document.createElement('button');
    orderBtn.className = 'inline-flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 transition-colors duration-200 cursor-pointer';
    orderBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>';
    const btnText = document.createElement('span');
    btnText.textContent = t('services.order');
    orderBtn.appendChild(btnText);
    orderBtn.onclick = () => openOrderModal(svc);
    actionTd.appendChild(orderBtn);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  }
}

function isCommentService(service) {
  const text = `${service.name || ''} ${service.category || ''}`.toLowerCase();
  return text.includes('comment') || text.includes('คอมเม้น');
}

function openOrderModal(service) {
  document.getElementById('orderServiceId').value = service.service;
  document.getElementById('orderServiceName').value = service.name;
  document.getElementById('orderModalTitle').textContent = t('order_form.title');
  document.getElementById('orderModalSubtitle').textContent = service.name;
  document.getElementById('orderLink').value = '';
  document.getElementById('orderQuantity').value = service.min || '';
  document.getElementById('orderQuantity').min = service.min || 1;
  document.getElementById('orderQuantity').max = service.max || '';
  document.getElementById('orderQuantityHint').textContent = `Min: ${service.min || 1} / Max: ${service.max || '∞'}`;
  document.getElementById('orderMessage').classList.add('hidden');

  const commentsGroup = document.getElementById('orderCommentsGroup');
  const commentsInput = document.getElementById('orderComments');
  if (isCommentService(service)) {
    commentsGroup.classList.remove('hidden');
    commentsInput.required = true;
  } else {
    commentsGroup.classList.add('hidden');
    commentsInput.required = false;
  }
  commentsInput.value = '';

  document.getElementById('orderModal').classList.remove('hidden');
  document.getElementById('orderLink').focus();
}

async function handleOrderSubmit(e) {
  e.preventDefault();
  const msgEl = document.getElementById('orderMessage');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  const comments = document.getElementById('orderComments').value.trim();
  const body = {
    serviceId: document.getElementById('orderServiceId').value,
    serviceName: document.getElementById('orderServiceName').value,
    link: document.getElementById('orderLink').value,
    quantity: document.getElementById('orderQuantity').value,
    ...(comments && { comments }),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = '...';

  try {
    await api('/api/orders', { method: 'POST', body: JSON.stringify(body) });
    msgEl.textContent = t('order_form.success');
    msgEl.className = 'text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2';
    msgEl.classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('orderModal').classList.add('hidden');
      location.hash = '#/orders';
    }, 1000);
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.className = 'text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2';
    msgEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = t('order_form.submit');
  }
}
