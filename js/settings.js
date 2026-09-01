// Gerenciador de Configurações da Experiência do Usuário
import { state } from './state.js';
import { STORAGE_KEYS } from './config.js';


// Estado das Configurações
export const userSettings = {
    pulseEnabled: true,
    feedDensity: 'comfortable',
    fontSize: 'normal',
    autosaveDraft: true,
    confirmDelete: true
};

// Carrega as Configurações do LocalStorage
export function loadSettings() {
    userSettings.pulseEnabled = localStorage.getItem(STORAGE_KEYS.PULSE) !== 'false';
    userSettings.feedDensity = localStorage.getItem(STORAGE_KEYS.DENSITY) || 'comfortable';
    userSettings.fontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || 'normal';
    userSettings.autosaveDraft = localStorage.getItem(STORAGE_KEYS.AUTOSAVE) !== 'false';
    userSettings.confirmDelete = localStorage.getItem(STORAGE_KEYS.CONFIRM_DELETE) !== 'false';

    applyAllSettings();
}

// Aplica as Configurações na Interface
export function applyAllSettings() {
    // 1. Pulso da Comunidade (Apenas visível se o usuário estiver autenticado)
    const pulseBar = document.getElementById('community-pulse-bar');
    if (pulseBar) {
        if (state.authenticatedUser && userSettings.pulseEnabled) {
            pulseBar.classList.remove('hidden');
        } else {
            pulseBar.classList.add('hidden');
        }
    }

    // 2. Densidade do Feed
    const feedContainer = document.getElementById('ideas-list');
    if (feedContainer) {
        if (userSettings.feedDensity === 'compact') {
            feedContainer.classList.add('feed-compact');
        } else {
            feedContainer.classList.remove('feed-compact');
        }
    }

    // 3. Tamanho da Tipografia
    document.body.dataset.fontSize = userSettings.fontSize;

    // Sincroniza os controles do formulário
    syncFormControls();
}

// Sincroniza os Inputs do Modal com o Estado
function syncFormControls() {
    const togglePulse = document.getElementById('setting-toggle-pulse');
    if (togglePulse) togglePulse.checked = userSettings.pulseEnabled;

    const selectDensity = document.getElementById('setting-select-density');
    if (selectDensity) selectDensity.value = userSettings.feedDensity;

    const selectFont = document.getElementById('setting-select-font');
    if (selectFont) selectFont.value = userSettings.fontSize;

    const toggleAutosave = document.getElementById('setting-toggle-autosave');
    if (toggleAutosave) toggleAutosave.checked = userSettings.autosaveDraft;

    const toggleConfirmDelete = document.getElementById('setting-toggle-confirm-delete');
    if (toggleConfirmDelete) toggleConfirmDelete.checked = userSettings.confirmDelete;
}

// Abre o Modal de Configurações
export function openSettingsDialog() {
    const dialog = document.getElementById('settings-dialog');
    if (!dialog) return;

    syncFormControls();
    dialog.classList.remove('hidden');
}

// Fecha o Modal de Configurações
export function closeSettingsDialog() {
    const dialog = document.getElementById('settings-dialog');
    dialog?.classList.add('hidden');
}

// Configura o Autosave de Rascunho no Campo de Escrita
function setupDraftAutosave() {
    const textarea = document.getElementById('idea-input');
    const charCounter = document.getElementById('char-counter');
    if (!textarea) return;

    // Restaura rascunho anterior se houver
    if (userSettings.autosaveDraft) {
        const savedDraft = localStorage.getItem(STORAGE_KEYS.DRAFT);
        if (savedDraft && !textarea.value) {
            textarea.value = savedDraft;
            if (charCounter) {
                charCounter.textContent = `${savedDraft.length} / 280`;
            }
        }
    }

    // Salva rascunho enquanto digita
    textarea.addEventListener('input', () => {
        if (userSettings.autosaveDraft) {
            localStorage.setItem(STORAGE_KEYS.DRAFT, textarea.value);
        }
    });

    // Limpa rascunho ao publicar com sucesso
    const btnSave = document.getElementById('btn-save');
    btnSave?.addEventListener('click', () => {
        setTimeout(() => {
            if (!textarea.value.trim()) {
                localStorage.removeItem(STORAGE_KEYS.DRAFT);
            }
        }, 600);
    });
}

// Inicialização Principal das Configurações
export function initSettings() {
    loadSettings();
    setupDraftAutosave();

    // Eventos dos Controles
    const togglePulse = document.getElementById('setting-toggle-pulse');
    togglePulse?.addEventListener('change', e => {
        userSettings.pulseEnabled = e.target.checked;
        localStorage.setItem(STORAGE_KEYS.PULSE, userSettings.pulseEnabled);
        applyAllSettings();
    });

    const selectDensity = document.getElementById('setting-select-density');
    selectDensity?.addEventListener('change', e => {
        userSettings.feedDensity = e.target.value;
        localStorage.setItem(STORAGE_KEYS.DENSITY, userSettings.feedDensity);
        applyAllSettings();
    });

    const selectFont = document.getElementById('setting-select-font');
    selectFont?.addEventListener('change', e => {
        userSettings.fontSize = e.target.value;
        localStorage.setItem(STORAGE_KEYS.FONT_SIZE, userSettings.fontSize);
        applyAllSettings();
    });

    const toggleAutosave = document.getElementById('setting-toggle-autosave');
    toggleAutosave?.addEventListener('change', e => {
        userSettings.autosaveDraft = e.target.checked;
        localStorage.setItem(STORAGE_KEYS.AUTOSAVE, userSettings.autosaveDraft);
    });

    const toggleConfirmDelete = document.getElementById('setting-toggle-confirm-delete');
    toggleConfirmDelete?.addEventListener('change', e => {
        userSettings.confirmDelete = e.target.checked;
        localStorage.setItem(STORAGE_KEYS.CONFIRM_DELETE, userSettings.confirmDelete);
    });

    // Fechamento do Modal
    const closeBtn = document.getElementById('close-settings-dialog');
    closeBtn?.addEventListener('click', closeSettingsDialog);

    const btnSaveSettings = document.getElementById('btn-save-settings');
    btnSaveSettings?.addEventListener('click', closeSettingsDialog);

    const dialog = document.getElementById('settings-dialog');
    dialog?.addEventListener('click', e => {
        if (e.target === dialog) closeSettingsDialog();
    });
}
