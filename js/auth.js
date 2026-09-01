import { supabaseClient } from './config.js';
import { state, invalidateCache } from './state.js';
import { translate, getTranslatedTitle } from './i18n.js';
import { slugify, updateAvatarDisplay, showActionFeedback, getHomePath } from './utils.js';
import { fetchUserNotifications, updateNotificationsBadge } from './notifications.js';

// Extração de Metadados do Usuário do Provedor de Autenticação
export function extractUserMetadata(user) {
    if (!user) return { avatarUrl: null, name: 'Usuário', username: 'usuario' };
    const meta = user.user_metadata || user.raw_user_meta_data || {};
    const identities = user.identities || [];
    const googleIdentity = identities.find(i => i.provider === 'google') || identities[0] || {};
    const identityData = googleIdentity.identity_data || {};

    const avatarUrl = meta.avatar_url
        || meta.picture
        || meta.avatar
        || identityData.avatar_url
        || identityData.picture
        || identityData.avatar
        || null;

    const name = meta.full_name
        || meta.name
        || meta.display_name
        || identityData.full_name
        || identityData.name
        || identityData.display_name
        || (user.email ? user.email.split('@')[0] : 'Usuário');

    const username = meta.user_name
        || meta.preferred_username
        || identityData.user_name
        || identityData.preferred_username
        || slugify(name)
        || (user.email ? user.email.split('@')[0] : '')
        || user.id.slice(0, 8);

    return { avatarUrl, name, username };
}

// Modais e Portão de Autenticação (Auth Gate)
export function showAuthGate() {
    const authGate = document.getElementById('auth-gate');
    const gateAuthFeedback = document.getElementById('gate-auth-feedback');
    const closeAuthGate = document.getElementById('close-auth-gate');
    if (!authGate) return;
    authGate.classList.remove('hidden');
    if (gateAuthFeedback) gateAuthFeedback.textContent = '';
    closeAuthGate?.focus();
}

export function hideAuthGate() {
    const authGate = document.getElementById('auth-gate');
    const gateAuthFeedback = document.getElementById('gate-auth-feedback');
    if (!authGate) return;
    authGate.classList.add('hidden');
    if (gateAuthFeedback) gateAuthFeedback.textContent = '';
}

export function showAuthMessage(message) {
    const authStatus = document.getElementById('auth-status');
    if (!authStatus) return;
    authStatus.textContent = message;
    authStatus.classList.add('auth-error');
    setTimeout(() => {
        authStatus.classList.remove('auth-error');
        authStatus.textContent = state.authenticatedUser ? (state.authenticatedUser.email || state.authenticatedUser.name) : translate('notAuthenticated');
    }, 4000);
}

// Ações de Login e Registro
export async function handleGoogleSignIn() {
    const currentOrigin = window.location.origin;
    const currentPath = window.location.pathname;
    const redirectUrl = currentOrigin && currentOrigin !== 'null' && !currentOrigin.startsWith('file:')
        ? `${currentOrigin}${currentPath}`
        : 'http://127.0.0.1:5500/';

    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectUrl
        }
    });
    if (error) {
        showAuthMessage(error.message);
        showActionFeedback(error.message);
    }
}

export async function handleEmailSignIn(email, password, isGate = false) {
    if (!email || !password) return;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (isGate) {
        const feedback = document.getElementById('gate-auth-feedback');
        if (feedback) feedback.textContent = error ? error.message : translate('loginSuccess') + '.';
        if (!error) {
            hideAuthGate();
            await refreshAuthState();
        }
    } else {
        showAuthMessage(error ? error.message : translate('loginSuccess'));
        if (!error) await refreshAuthState();
    }
}

export async function handleEmailSignUp(email, password, isGate = false) {
    if (!email || !password) return;
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (isGate) {
        const feedback = document.getElementById('gate-auth-feedback');
        if (feedback) feedback.textContent = error ? error.message : translate('confirmEmail') + '.';
    } else {
        showAuthMessage(error ? error.message : translate('confirmEmail'));
    }
}

let isSigningOut = false;
export async function handleSignOut(onAfterSignOut = null) {
    if (isSigningOut) return;
    isSigningOut = true;

    try {
        state.authenticatedUser = null;
        invalidateCache();
        state.activeFeed = 'global';
        state.selectedProfileId = null;
        window.history.replaceState({ feedType: 'global' }, '', getHomePath());
        window.scrollTo({ top: 0 });

        try {
            await supabaseClient.auth.signOut();
        } catch (err) {
            console.warn('Sign out warning:', err);
        }

        await refreshAuthState(null);
        if (typeof onAfterSignOut === 'function') {
            await onAfterSignOut();
        }
    } finally {
        isSigningOut = false;
    }
}

// Sincronização do Estado de Autenticação com a Interface e Supabase
export async function refreshAuthState(incomingUser = undefined, onStateRefreshed = null) {
    try {
        let user = incomingUser;
        if (incomingUser === undefined) {
            const { data: sessionData } = await supabaseClient.auth.getSession();
            user = sessionData?.session?.user || null;
            if (!user) {
                const { data: userData } = await supabaseClient.auth.getUser();
                user = userData?.user || null;
            }
        }

        const profileName = document.getElementById('profile-name');
        const headerUserName = document.getElementById('header-user-name');
        const profileUsername = document.getElementById('profile-username');
        const profileSubtitle = document.getElementById('profile-subtitle');
        const profileAvatars = document.querySelectorAll('[data-profile-avatar]');
        const authPanel = document.getElementById('auth-panel');
        const authStatus = document.getElementById('auth-status');
        const btnWrite = document.getElementById('btn-write');
        const btnRead = document.getElementById('btn-read');
        const btnProfile = document.getElementById('btn-profile');
        const btnSignout = document.getElementById('btn-signout');
        const loginTrigger = document.getElementById('login-trigger');
        const loadMoreFeed = document.getElementById('load-more-feed');

        if (user) {
            const { avatarUrl, name, username } = extractUserMetadata(user);
            let cachedProfile = null;
            try {
                const rawCache = localStorage.getItem('gnoteca_profile_cache_' + user.id);
                if (rawCache) cachedProfile = JSON.parse(rawCache);
            } catch (e) {}

            state.authenticatedUser = {
                id: user.id,
                email: user.email,
                name: cachedProfile?.display_name || name || user.email?.split('@')[0] || 'Pensador',
                username: cachedProfile?.username || username || slugify(name) || user.id.slice(0, 8),
                avatar_url: cachedProfile?.avatar_url !== undefined ? cachedProfile.avatar_url : (avatarUrl || null),
                title: cachedProfile?.current_title || 'Explorador de Conhecimento'
            };

            // Atualiza o DOM imediatamente com os dados cacheados (Zero Flicker)
            if (profileName) profileName.textContent = state.authenticatedUser.name;
            if (headerUserName) headerUserName.textContent = state.authenticatedUser.name;
            if (profileUsername) profileUsername.textContent = '@' + state.authenticatedUser.username;
            if (profileSubtitle) profileSubtitle.textContent = getTranslatedTitle(state.authenticatedUser.title);
            profileAvatars.forEach(avatar => {
                updateAvatarDisplay(avatar, state.authenticatedUser.avatar_url, state.authenticatedUser.name);
            });

            // Consulta perfil em public.profiles e sincroniza em background
            try {
                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('id, username, display_name, avatar_url, current_title')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile) {
                    state.authenticatedUser.name = profile.display_name || state.authenticatedUser.name;
                    state.authenticatedUser.avatar_url = profile.avatar_url || state.authenticatedUser.avatar_url;
                    state.authenticatedUser.username = profile.username || state.authenticatedUser.username;
                    state.authenticatedUser.title = profile.current_title || 'Explorador de Conhecimento';

                    try {
                        localStorage.setItem('gnoteca_profile_cache_' + user.id, JSON.stringify(profile));
                    } catch (e) {}
                } else {
                    await supabaseClient.from('profiles').upsert({
                        id: user.id,
                        username: state.authenticatedUser.username,
                        display_name: state.authenticatedUser.name,
                        avatar_url: state.authenticatedUser.avatar_url,
                        current_title: 'Explorador de Conhecimento'
                    }, { onConflict: 'id' });
                }

                // Re-atualiza a interface com os dados do banco
                if (profileName) profileName.textContent = state.authenticatedUser.name;
                if (headerUserName) headerUserName.textContent = state.authenticatedUser.name;
                if (profileUsername) profileUsername.textContent = '@' + state.authenticatedUser.username;
                if (profileSubtitle) profileSubtitle.textContent = getTranslatedTitle(state.authenticatedUser.title);
                profileAvatars.forEach(avatar => {
                    updateAvatarDisplay(avatar, state.authenticatedUser.avatar_url, state.authenticatedUser.name);
                });
            } catch (dbErr) {
                console.warn('Sync profile with Supabase warn:', dbErr);
            }
        } else {
            state.authenticatedUser = null;
        }

        const authenticated = Boolean(state.authenticatedUser);
        const writeSection = document.getElementById('write-section');
        const btnNotifications = document.getElementById('btn-notifications');

        if (authPanel) authPanel.classList.toggle('hidden', authenticated);
        if (authStatus) authStatus.textContent = authenticated ? (state.authenticatedUser.email || state.authenticatedUser.name) : translate('notAuthenticated');
        if (btnWrite) btnWrite.classList.toggle('hidden', !authenticated);
        if (btnRead) btnRead.classList.toggle('hidden', !authenticated);
        if (btnProfile) btnProfile.classList.toggle('hidden', !authenticated);
        if (btnSignout) btnSignout.classList.toggle('hidden', !authenticated);
        if (btnNotifications) btnNotifications.classList.toggle('hidden', !authenticated);
        if (loginTrigger) loginTrigger.classList.toggle('hidden', authenticated);
        if (loadMoreFeed) loadMoreFeed.classList.toggle('hidden', authenticated || state.activeFeed !== 'global');
        if (writeSection) writeSection.classList.toggle('hidden', !authenticated);

        if (authenticated) {
            hideAuthGate();
            if (profileName) profileName.textContent = state.authenticatedUser.name;
            if (headerUserName) headerUserName.textContent = state.authenticatedUser.name;
            profileAvatars.forEach(avatar => {
                updateAvatarDisplay(avatar, state.authenticatedUser.avatar_url, state.authenticatedUser.name);
            });
            fetchUserNotifications();
        } else {
            if (profileName) profileName.textContent = translate('notAuthenticated');
            if (headerUserName) headerUserName.textContent = '';
            profileAvatars.forEach(avatar => {
                avatar.textContent = '?';
            });
            updateNotificationsBadge();
        }

        if (typeof onStateRefreshed === 'function') {
            await onStateRefreshed();
        }
    } catch (err) {
        console.error('refreshAuthState error:', err);
    }
}
