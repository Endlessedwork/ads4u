import { registerRoute, api, getUser } from './app.js';
import { t } from './i18n.js';

export function register() {
  registerRoute('/admin', render);
}

async function render(container) {
  const user = getUser();
  if (user?.role !== 'admin') {
    container.innerHTML = '';
    const denied = document.createElement('div');
    denied.className = 'bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2';
    denied.innerHTML = '<svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>';
    const span = document.createElement('span');
    span.textContent = 'Access denied';
    denied.appendChild(span);
    container.appendChild(denied);
    return;
  }

  container.innerHTML = '';

  const title = document.createElement('h1');
  title.className = 'text-xl font-bold text-slate-800 mb-5';
  title.textContent = t('admin.title');
  container.appendChild(title);

  // Loading skeleton
  const skeleton = document.createElement('div');
  skeleton.className = 'bg-white rounded-xl border border-slate-200 p-4';
  skeleton.innerHTML = Array(3).fill('<div class="skeleton h-14 rounded mb-2"></div>').join('');
  container.appendChild(skeleton);

  let users = [];
  try {
    users = await api('/api/admin/users');
  } catch (err) {
    skeleton.remove();
    const errDiv = document.createElement('div');
    errDiv.className = 'bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm';
    errDiv.textContent = err.message;
    container.appendChild(errDiv);
    return;
  }

  skeleton.remove();

  if (users.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'bg-white rounded-xl border border-slate-200 p-12 text-center';
    emptyState.innerHTML = `
      <svg class="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
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
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-12"></th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">${t('admin.name')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">${t('admin.email')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">${t('admin.role')}</th>
    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">${t('admin.joined')}</th>
    <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  tbody.className = 'divide-y divide-slate-100';

  for (const u of users) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/50 transition-colors duration-150';

    const avatarTd = document.createElement('td');
    avatarTd.className = 'px-4 py-3';
    if (u.avatar_url) {
      const img = document.createElement('img');
      img.src = u.avatar_url;
      img.className = 'w-8 h-8 rounded-full ring-2 ring-slate-100';
      img.alt = u.name;
      avatarTd.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-medium';
      placeholder.textContent = u.name?.charAt(0)?.toUpperCase() || '?';
      avatarTd.appendChild(placeholder);
    }
    tr.appendChild(avatarTd);

    const nameTd = document.createElement('td');
    nameTd.className = 'px-4 py-3';
    const nameText = document.createElement('p');
    nameText.className = 'text-slate-800 font-medium';
    nameText.textContent = u.name;
    nameTd.appendChild(nameText);
    // Show email below name on mobile
    const emailMobile = document.createElement('p');
    emailMobile.className = 'text-xs text-slate-400 sm:hidden';
    emailMobile.textContent = u.email;
    nameTd.appendChild(emailMobile);
    tr.appendChild(nameTd);

    const emailTd = document.createElement('td');
    emailTd.className = 'px-4 py-3 text-slate-500 hidden sm:table-cell';
    emailTd.textContent = u.email;
    tr.appendChild(emailTd);

    const roleTd = document.createElement('td');
    roleTd.className = 'px-4 py-3';
    const roleBadge = document.createElement('span');
    roleBadge.className = u.role === 'admin'
      ? 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/10'
      : 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600';
    roleBadge.textContent = u.role;
    roleTd.appendChild(roleBadge);
    tr.appendChild(roleTd);

    const joinedTd = document.createElement('td');
    joinedTd.className = 'px-4 py-3 text-slate-500 text-xs hidden md:table-cell tabular-nums';
    joinedTd.textContent = new Date(u.created_at).toLocaleDateString();
    tr.appendChild(joinedTd);

    const actionTd = document.createElement('td');
    actionTd.className = 'px-4 py-3 text-right';

    if (u.id !== user.id) {
      const newRole = u.role === 'admin' ? 'member' : 'admin';
      const btn = document.createElement('button');
      btn.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 transition-colors duration-200 cursor-pointer';
      btn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>';
      const btnText = document.createElement('span');
      btnText.textContent = `→ ${newRole}`;
      btn.appendChild(btnText);
      btn.onclick = async () => {
        const msg = t('admin.confirm_role').replace('{role}', newRole);
        if (!confirm(msg)) return;
        try {
          await api(`/api/admin/users/${u.id}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole }),
          });
          render(container);
        } catch (err) {
          alert(err.message);
        }
      };
      actionTd.appendChild(btn);
    } else {
      const selfLabel = document.createElement('span');
      selfLabel.className = 'text-xs text-slate-400 italic';
      selfLabel.textContent = 'You';
      actionTd.appendChild(selfLabel);
    }

    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  container.appendChild(tableWrap);
}
