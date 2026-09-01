import { PROJECT_BASE_PATH } from './config.js';
import { translate } from './i18n.js';

// Utilitários de Segurança e Formatação
export function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function slugify(name) {
    return (name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// Manipulação de Exibição de Avatar
export function updateAvatarDisplay(avatarEl, avatarUrl, name) {
    if (!avatarEl) return;
    const initial = (name || 'U').charAt(0).toUpperCase();
    if (avatarUrl) {
        avatarEl.innerHTML = `<img src="${escapeHTML(avatarUrl)}" alt="${escapeHTML(name || '')}" referrerpolicy="no-referrer">`;
        const img = avatarEl.querySelector('img');
        if (img) {
            img.onerror = () => {
                avatarEl.textContent = initial;
            };
        }
    } else {
        avatarEl.textContent = initial;
    }
}

// Notificações Toast / Action Feedback
export function showActionFeedback(message) {
    const actionFeedback = document.getElementById('action-feedback');
    if (!actionFeedback) return;
    actionFeedback.textContent = message;
    actionFeedback.classList.remove('hidden');
    setTimeout(() => actionFeedback.classList.add('hidden'), 3000);
}

// Controle do Tema Escuro
export function setDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('gnoteca_dark_mode', String(isDark));
    const themeLabel = document.getElementById('theme-label');
    const themeToggle = document.getElementById('theme-toggle');
    const iconSun = document.getElementById('theme-icon-sun');
    const iconMoon = document.getElementById('theme-icon-moon');

    if (themeLabel) {
        themeLabel.textContent = isDark ? translate('lightMode') : translate('nightMode');
    }
    if (themeToggle) {
        themeToggle.setAttribute('aria-pressed', String(isDark));
    }
    if (iconSun && iconMoon) {
        iconSun.classList.toggle('hidden', !isDark);
        iconMoon.classList.toggle('hidden', isDark);
    }
}

// Helpers de Rotas e URLs
export function getProfilePath(account) {
    const profileSlug = slugify(account.username || account.name || '');
    return window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
        ? `${PROJECT_BASE_PATH}/#/${profileSlug}`
        : `${PROJECT_BASE_PATH}/${profileSlug}`;
}

export function getHomePath() {
    return `${PROJECT_BASE_PATH}/`;
}
