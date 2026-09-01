import { supabaseClient, MAX_LENGTH, PROJECT_BASE_PATH } from './config.js';
import { state, invalidateCache } from './state.js';
import { translate, setLanguage, currentLanguage, getTranslatedTitle } from './i18n.js';
import { slugify, updateAvatarDisplay, showActionFeedback, setDarkMode, getProfilePath, getHomePath } from './utils.js';
import { showAuthGate, hideAuthGate, setAuthGateMode, handleGateAuthSubmit, handleGoogleSignIn, handleEmailSignIn, handleEmailSignUp, handleSignOut, refreshAuthState, updatePasswordChecklist, showResetPasswordDialog, hideResetPasswordDialog, handleResetPasswordSubmit, handleSettingsChangePassword } from './auth.js';
import { updateProfileStats } from './favorites.js';
import { openEditNameDialog, openEditAvatarDialog, openSelectTitleDialog, saveProfileEdits, closeProfileEditDialog } from './profile.js';
import { loadIdeas, loadNextPage, handleFeedClick, confirmDeleteEntry, closeDeleteDialog, fetchComments, renderCommentsContent } from './feed.js';
import { setupShareListeners } from './share.js';
import { initNotifications, openNotificationsDialog, closeNotificationsDialog, markAllNotificationsAsRead, markNotificationAsRead, clearAllNotifications } from './notifications.js';
import { fetchCommunityPulse, initCommunityPulse } from './pulse.js';
import { initSettings, openSettingsDialog, closeSettingsDialog } from './settings.js';
import { initTopics, normalizeTagName, fetchCommunityTopics } from './topics.js';

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

    const communityPulseBar = document.getElementById('community-pulse-bar');
    if (communityPulseBar) {
        const isPulseEnabled = localStorage.getItem('gnoteca_setting_pulse') !== 'false';
        communityPulseBar.classList.toggle('hidden', !state.authenticatedUser || !isGlobal || !isPulseEnabled);
    }

    await loadIdeas();
}

export async function showProfile(profileId) {
    if (!profileId) return;
    state.activeFeed = 'profile';
    state.selectedProfileId = profileId;

    const communityPulseBar = document.getElementById('community-pulse-bar');
    if (communityPulseBar) {
        communityPulseBar.classList.add('hidden');
    }

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
    gateBannerAuth?.addEventListener('click', () => showAuthGate('signin'));

    // Abas do Modal de Autenticação
    document.getElementById('gate-tab-signin')?.addEventListener('click', () => setAuthGateMode('signin'));
    document.getElementById('gate-tab-signup')?.addEventListener('click', () => setAuthGateMode('signup'));
    document.getElementById('gate-forgot-btn')?.addEventListener('click', () => setAuthGateMode('forgot'));
    document.getElementById('gate-submit-btn')?.addEventListener('click', handleGateAuthSubmit);

    // Validação em Tempo Real do Checklist de Política de Senha
    document.getElementById('gate-password')?.addEventListener('input', e => {
        updatePasswordChecklist('policy', e.target.value);
    });
    document.getElementById('reset-new-password')?.addEventListener('input', e => {
        updatePasswordChecklist('reset-policy', e.target.value);
    });
    document.getElementById('settings-new-password')?.addEventListener('input', e => {
        updatePasswordChecklist('settings-policy', e.target.value);
    });

    // Modal de Redefinição de Senha
    document.getElementById('close-reset-password-dialog')?.addEventListener('click', hideResetPasswordDialog);
    document.getElementById('reset-password-dialog')?.addEventListener('click', event => {
        if (event.target === document.getElementById('reset-password-dialog')) hideResetPasswordDialog();
    });
    document.getElementById('reset-submit-btn')?.addEventListener('click', handleResetPasswordSubmit);
    document.getElementById('reset-confirm-password')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleResetPasswordSubmit();
    });

    // Alteração de Senha nas Configurações (exige senha atual)
    document.getElementById('btn-settings-change-password')?.addEventListener('click', handleSettingsChangePassword);
    document.getElementById('settings-confirm-password')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleSettingsChangePassword();
    });

    // Tecla Enter nos campos do modal
    const gateInputs = [
        document.getElementById('gate-email'),
        document.getElementById('gate-password'),
        document.getElementById('gate-password-confirm'),
        document.getElementById('gate-challenge-answer')
    ];
    gateInputs.forEach(input => {
        input?.addEventListener('keydown', e => {
            if (e.key === 'Enter') handleGateAuthSubmit();
        });
    });

    emailSignIn?.addEventListener('click', () => {
        handleEmailSignIn(authEmail?.value.trim(), authPassword?.value, false);
    });
    emailSignUp?.addEventListener('click', () => {
        showAuthGate('signup');
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

        const writeTagInput = document.getElementById('write-tag-input');
        const rawTag = writeTagInput?.dataset?.canonicalTag || writeTagInput?.value || 'Geral';
        const selectedTag = normalizeTagName(rawTag);

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
            if (writeTagInput) {
                writeTagInput.value = 'Geral';
                delete writeTagInput.dataset.canonicalTag;
            }
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
            fetchCommunityTopics();
            showFeed('global');
        } catch (err) {
            console.error('Save idea error:', err);
            showActionFeedback(translate('errorSaving'));
        } finally {
            btnSave.disabled = false;
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
        if (event.key === 'Escape') {
            if (deleteDialog && !deleteDialog.classList.contains('hidden')) {
                closeDeleteDialog();
            }
            const openThreads = document.querySelectorAll('.comments-thread-container:not(.hidden)');
            openThreads.forEach(thread => {
                thread.classList.add('hidden');
                const card = thread.closest('.idea-card');
                card?.querySelector('[data-action="toggle-comments"]')?.classList.remove('open');
            });
        }
    });

    // Fechar thread de comentários ao clicar fora
    document.addEventListener('click', event => {
        if (event.target.closest('.comments-thread-container') || event.target.closest('[data-action="toggle-comments"]')) {
            return;
        }
        const openThreads = document.querySelectorAll('.comments-thread-container:not(.hidden)');
        openThreads.forEach(thread => {
            thread.classList.add('hidden');
            const card = thread.closest('.idea-card');
            card?.querySelector('[data-action="toggle-comments"]')?.classList.remove('open');
        });
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
    const btnClearNotifications = document.getElementById('btn-clear-notifications');
    const notificationsDialog = document.getElementById('notifications-dialog');
    const notificationsListContainer = document.getElementById('notifications-list-container');

    btnNotifications?.addEventListener('click', openNotificationsDialog);
    notificationsMenu?.addEventListener('click', () => {
        toggleSidebar(false);
        openNotificationsDialog();
    });
    closeNotificationsDialogBtn?.addEventListener('click', closeNotificationsDialog);
    btnMarkAllRead?.addEventListener('click', markAllNotificationsAsRead);
    btnClearNotifications?.addEventListener('click', clearAllNotifications);
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
            let targetPostId = entryId;
            let targetCommentId = null;

            if (notifType === 'comment' || notifType === 'reply') {
                targetCommentId = entryId;
                try {
                    const { data: commentRow } = await supabaseClient
                        .from('entries')
                        .select('id, parent_id')
                        .eq('id', entryId)
                        .maybeSingle();

                    if (commentRow?.parent_id) {
                        targetPostId = commentRow.parent_id;
                    }
                } catch (e) {
                    console.warn('fetch parent_id for notif comment warn:', e);
                }
            }

            if (state.activeFeed !== 'global') {
                await showFeed('global');
            }

            let targetCard = document.querySelector(`.idea-card [data-idea-id="${targetPostId}"]`)?.closest('.idea-card')
                || document.getElementById(`comment-${targetPostId}`);

            if (targetCard) {
                if (notifType === 'comment' || notifType === 'reply') {
                    const container = targetCard.querySelector(`#comments-thread-${targetPostId}`);
                    const commentBtn = targetCard.querySelector('[data-action="toggle-comments"]');
                    if (container) {
                        container.classList.remove('hidden');
                        commentBtn?.classList.add('open');
                        container.innerHTML = `<p style="font-size:0.85rem; color:var(--muted-color); padding:0.5rem 0;">${translate('loading')}</p>`;
                        const comments = await fetchComments(targetPostId);
                        renderCommentsContent(container, targetPostId, comments);

                        setTimeout(() => {
                            const commentEl = document.getElementById(`comment-${targetCommentId}`) || container;
                            if (commentEl) {
                                commentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                commentEl.classList.remove('notif-target-pulse');
                                void commentEl.offsetWidth;
                                commentEl.classList.add('notif-target-pulse');
                                setTimeout(() => { commentEl.classList.remove('notif-target-pulse'); }, 2800);
                            }
                        }, 120);
                        return;
                    }
                }

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
        } else if (event === 'PASSWORD_RECOVERY') {
            showResetPasswordDialog();
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
            await refreshAuthState(session?.user || undefined);
            invalidateCache();
            await loadIdeas();
            fetchCommunityPulse();
            initNotifications();
        }
    });
}

// Navegação suave até um fragmento ou comentário com destaque pulsante
async function navigateToEntry(entryId, isComment = false) {
    if (state.activeFeed !== 'global') {
        await showFeed('global');
    }

    let targetCard = document.querySelector(`.idea-card [data-idea-id="${entryId}"]`)?.closest('.idea-card')
        || document.getElementById(`comment-${entryId}`);

    if (isComment && targetCard) {
        const commentBtn = targetCard.querySelector('[data-action="toggle-comments"]');
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

// Inicialização do Banner de Cookies (LGPD / GDPR)
function initCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    const btnAccept = document.getElementById('btn-accept-cookies');
    if (!banner || !btnAccept) return;

    const hasConsented = localStorage.getItem('gnoteca_cookie_consent') === 'true';
    if (!hasConsented) {
        banner.classList.remove('hidden');
    }

    btnAccept.addEventListener('click', () => {
        localStorage.setItem('gnoteca_cookie_consent', 'true');
        banner.classList.add('hidden');
    });
}

// Inicialização Principal da Aplicação
export async function initApp() {
    setDarkMode(localStorage.getItem('gnoteca_dark_mode') === 'true');
    applyLanguage(currentLanguage, false);
    setupEventListeners();
    initSettings();
    initCookieBanner();
    initTopics();
    initCommunityPulse({
        onNavigateProfile: showProfile,
        onNavigateEntry: navigateToEntry
    });

    if (window.location.hash && window.location.hash.includes('type=recovery')) {
        showResetPasswordDialog();
    }

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
