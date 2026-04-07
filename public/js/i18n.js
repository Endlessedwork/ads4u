let currentLang = localStorage.getItem('lang') || 'th';
let translations = {};

export async function initI18n() {
  await loadTranslations(currentLang);
}

async function loadTranslations(lang) {
  const res = await fetch(`/locales/${lang}.json`);
  translations = await res.json();
  currentLang = lang;
  localStorage.setItem('lang', lang);
  applyTranslations();
}

export function t(key) {
  const keys = key.split('.');
  let val = translations;
  for (const k of keys) {
    val = val?.[k];
  }
  return val || key;
}

export function getLang() {
  return currentLang;
}

export async function toggleLang() {
  const newLang = currentLang === 'th' ? 'en' : 'th';
  await loadTranslations(newLang);
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val !== key) {
      el.textContent = val;
    }
  });
}
