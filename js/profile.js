import { supabaseClient, STORAGE_KEYS } from './config.js';
import { state } from './state.js';
import { refreshAuthState } from './auth.js';
import { getTranslatedTitle, translate } from './i18n.js';

// Gerenciamento e Diálogo de Edição de Perfil
export function closeProfileEditDialog() {
    const editProfileDialog = document.getElementById('edit-profile-dialog');
    const editNameSection = document.getElementById('edit-name-section');
    const editAvatarSection = document.getElementById('edit-avatar-section');
    const editTitleSection = document.getElementById('edit-title-section');
    const editProfileFeedback = document.getElementById('edit-profile-feedback');

    editProfileDialog?.classList.add('hidden');
    editNameSection?.classList.add('hidden');
    editAvatarSection?.classList.add('hidden');
    editTitleSection?.classList.add('hidden');
    if (editProfileFeedback) editProfileFeedback.textContent = '';
}

export function openEditNameDialog() {
    if (!state.authenticatedUser) return;
    const inputEditName = document.getElementById('input-edit-name');
    const editNameSection = document.getElementById('edit-name-section');
    const editAvatarSection = document.getElementById('edit-avatar-section');
    const editTitleSection = document.getElementById('edit-title-section');
    const editProfileDialog = document.getElementById('edit-profile-dialog');
    const btnSaveProfile = document.getElementById('btn-save-profile');

    if (inputEditName) inputEditName.value = state.authenticatedUser.name;
    editNameSection?.classList.remove('hidden');
    editAvatarSection?.classList.add('hidden');
    editTitleSection?.classList.add('hidden');
    editProfileDialog?.classList.remove('hidden');
    if (btnSaveProfile) btnSaveProfile.dataset.mode = 'name';
}

export function openEditAvatarDialog() {
    if (!state.authenticatedUser) return;
    const inputEditAvatar = document.getElementById('input-edit-avatar');
    const editAvatarSection = document.getElementById('edit-avatar-section');
    const editNameSection = document.getElementById('edit-name-section');
    const editTitleSection = document.getElementById('edit-title-section');
    const editProfileDialog = document.getElementById('edit-profile-dialog');
    const btnSaveProfile = document.getElementById('btn-save-profile');

    if (inputEditAvatar) inputEditAvatar.value = state.authenticatedUser.avatar_url || '';
    editAvatarSection?.classList.remove('hidden');
    editNameSection?.classList.add('hidden');
    editTitleSection?.classList.add('hidden');
    editProfileDialog?.classList.remove('hidden');
    if (btnSaveProfile) btnSaveProfile.dataset.mode = 'avatar';
}

export async function openSelectTitleDialog() {
    if (!state.authenticatedUser) return;
    const editTitleSection = document.getElementById('edit-title-section');
    const editNameSection = document.getElementById('edit-name-section');
    const editAvatarSection = document.getElementById('edit-avatar-section');
    const editProfileDialog = document.getElementById('edit-profile-dialog');
    const btnSaveProfile = document.getElementById('btn-save-profile');
    const selectEditTitle = document.getElementById('select-edit-title');
    const ideasCount = document.getElementById('ideas-count');
    const favoritesCount = document.getElementById('favorites-count');

    editTitleSection?.classList.remove('hidden');
    editNameSection?.classList.add('hidden');
    editAvatarSection?.classList.add('hidden');
    editProfileDialog?.classList.remove('hidden');
    if (btnSaveProfile) btnSaveProfile.dataset.mode = 'title';
    if (selectEditTitle) selectEditTitle.innerHTML = '<option>Carregando...</option>';

    const fragments = parseInt(ideasCount?.textContent || '0', 10) || 0;
    const favoritesStr = favoritesCount?.textContent || '0';
    const favorites = parseInt(favoritesStr.split('/')[0], 10) || 0;

    const unlocked = ['Explorador de Conhecimento'];
    if (fragments >= 3) unlocked.push('Curador de Ideias');
    if (fragments >= 10 && favorites >= 1) unlocked.push('Arquiteto do Saber');
    if (fragments >= 20) unlocked.push('Luz da Gnoteca');

    if (selectEditTitle) {
        selectEditTitle.innerHTML = '';
        unlocked.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = getTranslatedTitle(t);
            if (t === state.authenticatedUser.title) opt.selected = true;
            selectEditTitle.appendChild(opt);
        });
    }
}

export async function saveProfileEdits() {
    if (!state.authenticatedUser) return;
    const btnSaveProfile = document.getElementById('btn-save-profile');
    const editProfileFeedback = document.getElementById('edit-profile-feedback');
    const inputEditName = document.getElementById('input-edit-name');
    const inputEditAvatar = document.getElementById('input-edit-avatar');
    const selectEditTitle = document.getElementById('select-edit-title');

    if (btnSaveProfile) btnSaveProfile.disabled = true;
    if (editProfileFeedback) {
        editProfileFeedback.textContent = 'Salvando...';
        editProfileFeedback.style.color = 'var(--muted-color)';
    }

    const mode = btnSaveProfile?.dataset.mode;
    try {
        const updateData = {};

        if (mode === 'name') {
            const val = inputEditName?.value.trim();
            if (!val) throw new Error('O nome não pode ficar vazio.');
            updateData.display_name = val;
        } else if (mode === 'avatar') {
            updateData.avatar_url = inputEditAvatar?.value.trim() || null;
        } else if (mode === 'title') {
            updateData.current_title = selectEditTitle?.value || 'Explorador de Conhecimento';
        }

        const { error } = await supabaseClient
            .from('profiles')
            .update(updateData)
            .eq('id', state.authenticatedUser.id);

        if (error) {
            if (error.code === '23505') throw new Error('Este arroba (@) já está em uso.');
            throw error;
        }

        if (editProfileFeedback) {
            editProfileFeedback.textContent = 'Salvo com sucesso!';
            editProfileFeedback.style.color = 'var(--accent-color)';
        }

        if (mode === 'name') state.authenticatedUser.name = updateData.display_name;
        if (mode === 'avatar') state.authenticatedUser.avatar_url = updateData.avatar_url;
        if (mode === 'title') state.authenticatedUser.title = updateData.current_title;

        try {
            const rawCached = localStorage.getItem(STORAGE_KEYS.PROFILE_CACHE(state.authenticatedUser.id));
            const existingData = rawCached ? (JSON.parse(rawCached).data || JSON.parse(rawCached)) : {};
            localStorage.setItem(STORAGE_KEYS.PROFILE_CACHE(state.authenticatedUser.id), JSON.stringify({
                data: { ...existingData, ...updateData },
                cachedAt: Date.now()
            }));
        } catch (e) {}

        setTimeout(async () => {
            closeProfileEditDialog();
            await refreshAuthState();
        }, 1000);
    } catch (e) {
        if (editProfileFeedback) {
            editProfileFeedback.textContent = e.message || 'Erro ao salvar.';
            editProfileFeedback.style.color = 'var(--danger-color)';
        }
    } finally {
        if (btnSaveProfile) btnSaveProfile.disabled = false;
    }
}
