import { registerRoute, api, getUser } from './app.js';
import { t } from './i18n.js';

export function register() {
  registerRoute('/admin', render);
}

async function render(container) {
  const user = getUser();
  if (user?.role !== 'admin') {
    container.innerHTML = '';
    const denied = document.createElement('p');
    denied.className = 'text-red-500';
    denied.textContent = 'Access denied';
    container.appendChild(denied);
    return;
  }

  container.innerHTML = `<p class="text-gray-400">${t('common.loading')}</p>`;

  let users = [];
  try {
    users = await api('/api/admin/users');
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
  title.textContent = t('admin.title');
  container.appendChild(title);

  const table = document.createElement('table');
  table.className = 'w-full bg-white rounded-xl shadow-sm border text-sm';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr class="border-b bg-gray-50">
    <th class="px-4 py-3 text-left text-gray-500"></th>
    <th class="px-4 py-3 text-left text-gray-500">${t('admin.name')}</th>
    <th class="px-4 py-3 text-left text-gray-500">${t('admin.email')}</th>
    <th class="px-4 py-3 text-left text-gray-500">${t('admin.role')}</th>
    <th class="px-4 py-3 text-left text-gray-500">${t('admin.joined')}</th>
    <th class="px-4 py-3 text-left text-gray-500"></th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const u of users) {
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-gray-50';

    const avatarTd = document.createElement('td');
    avatarTd.className = 'px-4 py-3';
    if (u.avatar_url) {
      const img = document.createElement('img');
      img.src = u.avatar_url;
      img.className = 'w-8 h-8 rounded-full';
      img.alt = u.name;
      avatarTd.appendChild(img);
    }
    tr.appendChild(avatarTd);

    const nameTd = document.createElement('td');
    nameTd.className = 'px-4 py-3 text-gray-700 font-medium';
    nameTd.textContent = u.name;
    tr.appendChild(nameTd);

    const emailTd = document.createElement('td');
    emailTd.className = 'px-4 py-3 text-gray-600';
    emailTd.textContent = u.email;
    tr.appendChild(emailTd);

    const roleTd = document.createElement('td');
    roleTd.className = 'px-4 py-3';
    const roleBadge = document.createElement('span');
    roleBadge.className = u.role === 'admin'
      ? 'px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800'
      : 'px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
    roleBadge.textContent = u.role;
    roleTd.appendChild(roleBadge);
    tr.appendChild(roleTd);

    const joinedTd = document.createElement('td');
    joinedTd.className = 'px-4 py-3 text-gray-500';
    joinedTd.textContent = new Date(u.created_at).toLocaleDateString();
    tr.appendChild(joinedTd);

    const actionTd = document.createElement('td');
    actionTd.className = 'px-4 py-3';
    if (u.id !== user.id) {
      const newRole = u.role === 'admin' ? 'member' : 'admin';
      const btn = document.createElement('button');
      btn.className = 'px-3 py-1 rounded-lg text-xs font-medium border hover:bg-gray-50 transition';
      btn.textContent = `${t('admin.change_role')} \u2192 ${newRole}`;
      btn.onclick = async () => {
        const msg = t('admin.confirm_role').replace('{role}', newRole);
        if (!confirm(msg)) return;
        try {
          await api(`/api/admin/users/${u.id}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
          render(container);
        } catch (err) { alert(err.message); }
      };
      actionTd.appendChild(btn);
    }
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}
