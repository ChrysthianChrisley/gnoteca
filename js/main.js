import { supabaseClient, MAX_LENGTH, PROJECT_BASE_PATH } from './config.js';
import { state, invalidateCache } from './state.js';
import { translate, setLanguage, currentLanguage, getTranslatedTitle } from './i18n.js';
import { slugify, updateAvatarDisplay, showActionFeedback, setDarkMode, getProfilePath, getHomePath } from './utils.js';
import { showAuthGate, hideAuthGate, handleGoogleSignIn, handleEmailSignIn, handleEmailSignUp, handleSignOut, refreshAuthState } from './auth.js';
import { updateProfileStats } from './favorites.js';
import { openEditNameDialog, openEditAvatarDialog, openSelectTitleDialog, saveProfileEdits, closeProfileEditDialog } from './profile.js';
import { loadIdeas, loadNextPage, handleFeedClick, confirmDeleteEntry, closeDeleteDialog } from './feed.js';
import { setupShareListeners } from './share.js';
import { initNotifications, openNotificationsDialog, closeNotificationsDialog, markAllNotificationsAsRead, markNotificationAsRead } from './notifications.js';
import { initCommunityPulse } from './pulse.js';
import { initSettings, openSettingsDialog, closeSettingsDialog } from './settings.js';

// Elementos Principais do DOM
const btnHome = document.getElementById('btn-home');
const btnWrite = document.getElementById('btn-write');
const btnRead = document.getElementById('btn-read');
const writeSection = document.getElementById('write-section');
const readSection = document.getElementById('read-section');
const ideaInput = document.getElementById('idea-input');
const btnSave = document.getElementById('btn-save');
const charCounter = document.getElementById('char-counter');
const feedbackMsg = document.getElementById('feedback-msg');
const ideasList = document.getElementById('ideas-list');
const profileSidebar = document.getElementById('profile-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const btnProfile = document.getElementById('btn-profile');
const loginTrigger = document.getElementById('login-trigger');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const btnSignout = document.getElementById('btn-signout');
const themeToggle = document.getElementById('theme-toggle');
const feedFilter = document.getElementById('feed-filter');
const backToFeed = document.getElementById('back-to-feed');
const overviewMenu = document.getElementById('overview-menu');
const favoritesMenu = document.getElementById('favorites-menu');
const languageOptions = document.querySelectorAll('[data-language]');
const emailSignIn = document.getElementById('email-sign-in');
const emailSignUp = document.getElementById('email-sign-up');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const googleSignIn = document.getElementById('google-sign-in');
const closeAuthGate = document.getElementById('close-auth-gate');
const authGate = document.getElementById('auth-gate');
const gateGoogleSignIn = document.getElementById('gate-google-sign-in');
const gateEmailSignIn = document.getElementById('gate-email-sign-in');
const gateEmailSignUp = document.getElementById('gate-email-sign-up');
const gateEmail = document.getElementById('gate-email');
const gatePassword = document.getElementById('gate-password');
const gateBannerAuth = document.getElementById('gate-banner-auth');
const gateBannerGoogle = document.getElementById('gate-banner-google');
const feedSentinel = document.getElementById('feed-sentinel');
const btnBackToTop = document.getElementById('btn-back-to-top');
const statFragments = document.getElementById('stat-fragments');
const statFavorites = document.getElementById('stat-favorites');
const btnEditName = document.getElementById('btn-edit-name');
const btnEditAvatar = document.getElementById('btn-edit-avatar');
const btnSelectTitle = document.getElementById('btn-select-title');
const closeEditDialog = document.getElementById('close-edit-dialog');
const btnSaveProfile = document.getElementById('btn-save-profile');
const cancelDelete = document.getElementById('cancel-delete');
const confirmDelete = document.getElementById('confirm-delete');
const deleteDialog = document.getElementById('delete-dialog');

// Navegação e Barra Lateral
export function toggleSidebar(isOpen) {
    if (!profileSidebar || !sidebarOverlay) return;
    profileSidebar.classList.toggle('open', isOpen);
    sidebarOverlay.classList.toggle('hidden', !isOpen);
    profileSidebar.setAttribute('aria-hidden', String(!isOpen));
    btnProfile?.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
        if (state.authenticatedUser) {
            const profileName = document.getElementById('profile-name');
            const headerUserName = document.getElementById('header-user-name');
            const profileAvatars = document.querySelectorAll('[data-profile-avatar]');
            if (profileName) profileName.textContent = state.authenticatedUser.name;
            if (headerUserName) headerUserName.textContent = state.authenticatedUser.name;
            profileAvatars.forEach(avatar => {
                updateAvatarDisplay(avatar, state.authenticatedUser.avatar_url, state.authenticatedUser.name);
            });
        }
        updateProfileStats();
    }
}

export async function showFeed(feedType) {
    if (feedType !== 'global' && !state.authenticatedUser) {
        showAuthGate();
        return;
    }
    state.activeFeed = feedType;
    state.selectedProfileId = null;
    window.history.pushState({ feedType }, '', getHomePath());
    const isGlobal = feedType === 'global';
    writeSection?.classList.toggle('hidden', !state.authenticatedUser || !isGlobal);
    readSection?.classList.remove('hidden');
    await loadIdeas();
}

export async function showProfile(profileId) {
    if (!profileId) return;
    state.activeFeed = 'profile';
    state.selectedProfileId = profileId;

    let account = null;
    if (state.authenticatedUser && state.authenticatedUser.id === profileId) {
        account = state.authenticatedUser;
    } else {
        const { data: prof } = await supabaseClient
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', profileId)
            .maybeSingle();
        if (prof) {
            account = { id: prof.id, name: prof.display_name || prof.username, username: prof.username, avatar_url: prof.avatar_url };
        }
    }

    if (account) {
        window.history.pushState({ feedType: 'profile', profileId }, '', getProfilePath(account));
    }
    writeSection?.classList.add('hidden');
    readSection?.classList.remove('hidden');
    btnWrite?.classList.remove('active');
    btnRead?.classList.remove('active');
    await loadIdeas();
}

async function getAccountBySlug(slug) {
    if (state.authenticatedUser && (slugify(state.authenticatedUser.name) === slug || state.authenticatedUser.username === slug)) {
        return state.authenticatedUser;
    }
    try {
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .or(`username.eq.${slug},id.eq.${slug}`)
            .maybeSingle();

        if (profile) {
            return {
                id: profile.id,
                name: profile.display_name || profile.username,
                username: profile.username,
                avatar_url: profile.avatar_url
            };
        }
    } catch (err) {
        console.error('getAccountBySlug error:', err);
    }
    return null;
}

export async function loadRouteFromUrl() {
    const pathWithoutBase = window.location.pathname.slice(PROJECT_BASE_PATH.length);
    const hashSlug = window.location.hash.startsWith('#/') ? window.location.hash.slice(2).split('/')[0] : '';
    const slug = hashSlug || pathWithoutBase.split('/').filter(Boolean)[0];

    if (slug) {
        const account = await getAccountBySlug(slug);
        if (account) {
            state.activeFeed = 'profile';
            state.selectedProfileId = account.id;
            writeSection?.classList.add('hidden');
            readSection?.classList.remove('hidden');
            btnWrite?.classList.remove('active');
            btnRead?.classList.remove('active');
            await loadIdeas();
            return;
        } else {
            window.history.replaceState({ feedType: 'global' }, '', getHomePath());
            state.activeFeed = 'global';
            state.selectedProfileId = null;
        }
    }

    await loadIdeas();
}

export function applyLanguage(language, reload = true) {
    setLanguage(language);
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const translated = translate(element.dataset.i18n);
        if (element.classList.contains('topic-pill')) {
            element.textContent = element.dataset.tag === 'Todos' ? translated : `#${translated}`;
        } else if (element.tagName === 'OPTION' && element.closest('#write-tag-select')) {
            element.textContent = element.value === '__custom__' || element.value === 'Todos' ? translated : `#${translated}`;
        } else {
            element.textContent = translated;
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        element.placeholder = translate(element.dataset.i18nPlaceholder);
    });
    languageOptions.forEach(option => option.classList.toggle('selected', option.dataset.language === currentLanguage));
    const themeLabel = document.getElementById('theme-label');
    if (themeLabel) {
        themeLabel.textContent = document.body.classList.contains('dark-mode') ? translate('lightMode') : translate('nightMode');
    }
    const profileSubtitle = document.getElementById('profile-subtitle');
    if (profileSubtitle && state.authenticatedUser) {
        profileSubtitle.textContent = getTranslatedTitle(state.authenticatedUser.title);
    }
    if (reload) {
        loadIdeas();
    }
}

// Configuração dos Event Listeners Globais
function setupEventListeners() {
    // Menu e Sidebar
    btnProfile?.addEventListener('click', () => toggleSidebar(true));
    btnCloseSidebar?.addEventListener('click', () => toggleSidebar(false));
    sidebarOverlay?.addEventListener('click', () => toggleSidebar(false));
    btnHome?.addEventListener('click', () => showFeed('global'));
    overviewMenu?.addEventListener('click', () => {
        toggleSidebar(false);
        showFeed('global');
    });
    favoritesMenu?.addEventListener('click', () => {
        toggleSidebar(false);
        showFeed('favorites');
    });
    backToFeed?.addEventListener('click', () => showFeed('global'));
    feedFilter?.addEventListener('change', () => loadIdeas());

    // Tema Noturno (Sidebar e Header Rápido)
    const btnThemeQuickToggle = document.getElementById('btn-theme-quick-toggle');
    const toggleTheme = () => setDarkMode(!document.body.classList.contains('dark-mode'));
    themeToggle?.addEventListener('click', toggleTheme);
    btnThemeQuickToggle?.addEventListener('click', toggleTheme);

    // Idiomas
    languageOptions.forEach(option => option.addEventListener('click', () => {
        applyLanguage(option.dataset.language);
    }));

    // Autenticação
    loginTrigger?.addEventListener('click', showAuthGate);
    closeAuthGate?.addEventListener('click', hideAuthGate);
    authGate?.addEventListener('click', event => {
        if (event.target === authGate) hideAuthGate();
    });
    googleSignIn?.addEventListener('click', handleGoogleSignIn);
    gateGoogleSignIn?.addEventListener('click', handleGoogleSignIn);
    gateBannerGoogle?.addEventListener('click', handleGoogleSignIn);
    gateBannerAuth?.addEventListener('click', showAuthGate);

    emailSignIn?.addEventListener('click', () => {
        handleEmailSignIn(authEmail?.value.trim(), authPassword?.value, false);
    });
    emailSignUp?.addEventListener('click', () => {
        handleEmailSignUp(authEmail?.value.trim(), authPassword?.value, false);
    });
    gateEmailSignIn?.addEventListener('click', () => {
        handleEmailSignIn(gateEmail?.value.trim(), gatePassword?.value, true);
    });
    gateEmailSignUp?.addEventListener('click', () => {
        handleEmailSignUp(gateEmail?.value.trim(), gatePassword?.value, true);
    });

    btnSignout?.addEventListener('click', async () => {
        await handleSignOut(async () => {
            toggleSidebar(false);
            const writeSec = document.getElementById('write-section');
            writeSec?.classList.add('hidden');
            await showFeed('global');
        });
    });

    // Estatísticas Clicáveis no Perfil
    statFragments?.addEventListener('click', () => {
        if (state.authenticatedUser?.username) {
            window.location.hash = '#/' + state.authenticatedUser.username;
            toggleSidebar(false);
        }
    });
    statFavorites?.addEventListener('click', () => {
        if (state.authenticatedUser) {
            toggleSidebar(false);
            showFeed('favorites');
        }
    });

    // Edição de Perfil
    btnEditName?.addEventListener('click', openEditNameDialog);
    btnEditAvatar?.addEventListener('click', openEditAvatarDialog);
    btnSelectTitle?.addEventListener('click', openSelectTitleDialog);
    closeEditDialog?.addEventListener('click', closeProfileEditDialog);
    btnSaveProfile?.addEventListener('click', saveProfileEdits);

    // Criação de Fragmentos
    ideaInput?.addEventListener('input', () => {
        const currentLength = ideaInput.value.length;
        if (charCounter) {
            charCounter.textContent = `${currentLength} / ${MAX_LENGTH}`;
            charCounter.classList.toggle('limit-reached', currentLength >= MAX_LENGTH);
        }
    });

    btnWrite?.addEventListener('click', () => {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
        writeSection?.classList.remove('hidden');
        readSection?.classList.add('hidden');
        btnWrite?.classList.add('active');
        btnRead?.classList.remove('active');
        ideaInput?.focus();
    });

    btnRead?.addEventListener('click', () => {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
        showFeed('mine');
    });

    btnSave?.addEventListener('click', async () => {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
        const text = ideaInput?.value.trim();
        if (!text) return;

        const tagSelect = document.getElementById('write-tag-select');
        const customTagInput = document.getElementById('write-custom-tag');
        let selectedTag = tagSelect?.value || 'Geral';
        if (selectedTag === '__custom__') {
            const customVal = customTagInput?.value.trim().replace(/^#+/, '');
            selectedTag = customVal ? customVal.slice(0, 20) : 'Geral';
        }

        btnSave.disabled = true;
        try {
            const { error } = await supabaseClient
                .from('entries')
                .insert([{
                    content: text,
                    tag: selectedTag,
                    author_id: state.authenticatedUser.id
                }]);

            if (error) {
                console.error('Error saving entry:', error);
                showActionFeedback(error.message || translate('errorSaving'));
                return;
            }

            if (ideaInput) ideaInput.value = '';
            if (customTagInput) customTagInput.value = '';
            if (tagSelect) tagSelect.value = 'Geral';
            customTagInput?.classList.add('hidden');
            if (charCounter) {
                charCounter.textContent = `0 / ${MAX_LENGTH}`;
                charCounter.classList.remove('limit-reached');
            }
            if (feedbackMsg) {
                feedbackMsg.classList.remove('hidden');
                setTimeout(() => feedbackMsg.classList.add('hidden'), 2000);
            }

            invalidateCache();
            await loadIdeas();
            await updateProfileStats();
            showFeed('global');
        } catch (err) {
            console.error('Save idea error:', err);
            showActionFeedback(translate('errorSaving'));
        } finally {
            btnSave.disabled = false;
        }
    });

    // Barra de Filtro de Tópicos
    const topicFilterBar = document.getElementById('topic-filter-bar');
    topicFilterBar?.addEventListener('click', async event => {
        const pill = event.target.closest('.topic-pill');
        if (!pill) return;
        const tag = pill.dataset.tag || 'Todos';
        state.selectedTag = tag;
        topicFilterBar.querySelectorAll('.topic-pill').forEach(p => {
            p.classList.toggle('active', p === pill);
        });
        await loadIdeas();
    });

    // Seletor de Tópicos e Campo Personalizado
    const writeTagSelect = document.getElementById('write-tag-select');
    const writeCustomTag = document.getElementById('write-custom-tag');
    writeTagSelect?.addEventListener('change', () => {
        if (writeTagSelect.value === '__custom__') {
            writeCustomTag?.classList.remove('hidden');
            writeCustomTag?.focus();
        } else {
            writeCustomTag?.classList.add('hidden');
            if (writeCustomTag) writeCustomTag.value = '';
        }
    });

    // Feed Event Delegation
    ideasList?.addEventListener('click', event => {
        handleFeedClick(event, showProfile);
    });

    // Exclusão de Fragmentos
    cancelDelete?.addEventListener('click', closeDeleteDialog);
    confirmDelete?.addEventListener('click', confirmDeleteEntry);
    deleteDialog?.addEventListener('click', event => {
        if (event.target === deleteDialog) closeDeleteDialog();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && deleteDialog && !deleteDialog.classList.contains('hidden')) {
            closeDeleteDialog();
        }
    });

    // Roteamento de Histórico
    window.addEventListener('popstate', loadRouteFromUrl);

    // Botão Flutuante Voltar ao Topo
    window.addEventListener('scroll', () => {
        if (btnBackToTop) {
            btnBackToTop.classList.toggle('hidden', window.scrollY <= 400);
        }
    }, { passive: true });

    btnBackToTop?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Rolagem Infinita via Intersection Observer
    if (feedSentinel && 'IntersectionObserver' in window) {
        const infiniteScrollObserver = new IntersectionObserver(entries => {
            const [entry] = entries;
            if (entry.isIntersecting && state.authenticatedUser && state.hasMorePages && !state.isFetchingPage) {
                loadNextPage();
            }
        }, { rootMargin: '250px' });
        infiniteScrollObserver.observe(feedSentinel);
    }

    // Modal de Compartilhamento Direto
    setupShareListeners();

    // Notificações
    const btnNotifications = document.getElementById('btn-notifications');
    const notificationsMenu = document.getElementById('notifications-menu');
    const closeNotificationsDialogBtn = document.getElementById('close-notifications-dialog');
    const btnMarkAllRead = document.getElementById('btn-mark-all-read');
    const notificationsDialog = document.getElementById('notifications-dialog');
    const notificationsListContainer = document.getElementById('notifications-list-container');

    btnNotifications?.addEventListener('click', openNotificationsDialog);
    notificationsMenu?.addEventListener('click', () => {
        toggleSidebar(false);
        openNotificationsDialog();
    });
    closeNotificationsDialogBtn?.addEventListener('click', closeNotificationsDialog);
    btnMarkAllRead?.addEventListener('click', markAllNotificationsAsRead);
    notificationsDialog?.addEventListener('click', event => {
        if (event.target === notificationsDialog) closeNotificationsDialog();
    });

    // Configurações
    const settingsMenu = document.getElementById('settings-menu');
    settingsMenu?.addEventListener('click', () => {
        toggleSidebar(false);
        openSettingsDialog();
    });

    notificationsListContainer?.addEventListener('click', async event => {
        const item = event.target.closest('.notification-item');
        if (!item) return;

        const notifId = Number(item.dataset.notifId);
        const entryId = item.dataset.entryId ? Number(item.dataset.entryId) : null;
        const notifType = item.dataset.type || '';

        if (notifId) await markNotificationAsRead(notifId);
        closeNotificationsDialog();

        if (entryId) {
            let targetCard = document.querySelector(`.idea-card [data-idea-id="${entryId}"]`)?.closest('.idea-card')
                || document.getElementById(`comment-${entryId}`);

            if (!targetCard && state.activeFeed !== 'global') {
                await showFeed('global');
                targetCard = document.querySelector(`.idea-card [data-idea-id="${entryId}"]`)?.closest('.idea-card')
                    || document.getElementById(`comment-${entryId}`);
            }

            if (notifType === 'comment' || notifType === 'reply') {
                const commentBtn = targetCard?.querySelector('[data-action="toggle-comments"]');
                if (commentBtn && !commentBtn.classList.contains('open')) {
                    commentBtn.click();
                }
            }

            if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetCard.classList.remove('notif-target-pulse');
                void targetCard.offsetWidth;
                targetCard.classList.add('notif-target-pulse');
                setTimeout(() => { targetCard.classList.remove('notif-target-pulse'); }, 2800);
            }
        }
    });

    // Escuta mudanças na autenticação do Supabase
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            toggleSidebar(false);
            const writeSec = document.getElementById('write-section');
            writeSec?.classList.add('hidden');
            await handleSignOut(async () => {
                await showFeed('global');
            });
            initNotifications();
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
            await refreshAuthState(session?.user || undefined);
            initNotifications();
        }
    });
}

// Inicialização Principal da Aplicação
export async function initApp() {
    setDarkMode(localStorage.getItem('gnoteca_dark_mode') === 'true');
    applyLanguage(currentLanguage, false);
    setupEventListeners();
    initSettings();
    initCommunityPulse();
    await refreshAuthState(undefined, async () => {
        await loadRouteFromUrl();
        initNotifications();
    });
}

// Executar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
