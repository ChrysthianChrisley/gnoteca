import { PROJECT_BASE_PATH, STORAGE_KEYS } from './config.js';
import { translate } from './i18n.js';

// Utilitários de Segurança e Formatação

/**
 * Escapa caracteres especiais HTML para prevenir XSS.
 * @param {string} str - String a ser escapada.
 * @returns {string}
 */
export function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Converte um nome/string em slug URL-amigável (ASCII, lowercase, hífens).
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
    return (name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// Manipulação de Exibição de Avatar
/**
 * Atualiza um elemento de avatar com imagem ou inicial do nome.
 * @param {HTMLElement} avatarEl - O elemento que representa o avatar.
 * @param {string|null} avatarUrl - URL da imagem do avatar.
 * @param {string} name - Nome do usuário (usado como fallback).
 */
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
/**
 * Exibe uma mensagem toast temporária de feedback de ação (3 segundos).
 * @param {string} message - Mensagem a exibir.
 */
export function showActionFeedback(message) {
    const actionFeedback = document.getElementById('action-feedback');
    if (!actionFeedback) return;
    actionFeedback.textContent = message;
    actionFeedback.classList.remove('hidden');
    setTimeout(() => actionFeedback.classList.add('hidden'), 3000);
}

// Controle do Tema Escuro
/**
 * Ativa ou desativa o modo escuro na aplicação.
 * @param {boolean} isDark
 */
export function setDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(isDark));
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
/**
 * Gera o caminho de perfil de um usuário baseado no seu username.
 * @param {{ username?: string, name?: string }} account
 * @returns {string}
 */
export function getProfilePath(account) {
    const profileSlug = slugify(account.username || account.name || '');
    return window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
        ? `${PROJECT_BASE_PATH}/#/${profileSlug}`
        : `${PROJECT_BASE_PATH}/${profileSlug}`;
}

/**
 * Retorna o caminho raíz da aplicação.
 * @returns {string}
 */
export function getHomePath() {
    return `${PROJECT_BASE_PATH}/`;
}
