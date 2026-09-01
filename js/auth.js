import { supabaseClient, STORAGE_KEYS } from './config.js';
import { state, invalidateCache } from './state.js';
import { translate, getTranslatedTitle } from './i18n.js';
import { slugify, updateAvatarDisplay, showActionFeedback, getHomePath } from './utils.js';
import { fetchUserNotifications, updateNotificationsBadge } from './notifications.js';

// Extração de Metadados do Usuário do Provedor de Autenticação
/**
 * Normaliza metadados de usuário vindos de diferentes provedores OAuth (Google, email).
 * @param {object} user - Objeto de usuário do Supabase Auth.
 * @returns {{ avatarUrl: string|null, name: string, username: string }}
 */
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

let currentAuthGateMode = 'signin';
let currentChallengeAnswer = null;

// Validador de Política de Senhas (8+ chars, maiúscula, minúscula, número e símbolo)
/**
 * Valida uma senha contra a política de segurança do Gnoteca.
 * @param {string} password
 * @returns {{ isValid: boolean, hasMinLength: boolean, hasCases: boolean, hasNumSym: boolean }}
 */
export function validatePasswordPolicy(password) {
    if (!password) {
        return {
            isValid: false,
            hasMinLength: false,
            hasCases: false,
            hasNumSym: false
        };
    }
    const hasMinLength = password.length >= 8;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasCases = hasLower && hasUpper;
    const hasDigit = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const hasNumSym = hasDigit && hasSymbol;

    return {
        isValid: hasMinLength && hasCases && hasNumSym,
        hasMinLength,
        hasCases,
        hasNumSym
    };
}

// Atualiza a visualização do checklist de requisitos da senha
export function updatePasswordChecklist(prefix, password) {
    const policy = validatePasswordPolicy(password);

    const elLen = document.getElementById(`${prefix}-policy-len`);
    const elCases = document.getElementById(`${prefix}-policy-cases`);
    const elNumSym = document.getElementById(`${prefix}-policy-num-sym`);

    const updateItem = (el, valid) => {
        if (!el) return;
        el.classList.toggle('valid', valid);
        el.classList.toggle('invalid', !valid);
        const icon = el.querySelector('.policy-icon');
        if (icon) icon.textContent = valid ? '✓' : '•';
    };

    updateItem(elLen, policy.hasMinLength);
    updateItem(elCases, policy.hasCases);
    updateItem(elNumSym, policy.hasNumSym);

    return policy;
}

function getRecoveryRedirectUrl() {
    const origin = window.location.origin;
    const path = window.location.pathname;
    if (origin && origin !== 'null' && !origin.startsWith('file:')) {
        return `${origin}${path}`;
    }
    return 'http://127.0.0.1:5500/';
}

// Gera desafio de verificação de segurança leve (humano vs bot)
export function generateSecurityChallenge() {
    const num1 = Math.floor(Math.random() * 8) + 1;
    const num2 = Math.floor(Math.random() * 8) + 1;
    currentChallengeAnswer = num1 + num2;
    const qEl = document.getElementById('gate-math-question');
    if (qEl) {
        qEl.textContent = `${num1} + ${num2} = ?`;
    }
    const ansInput = document.getElementById('gate-challenge-answer');
    if (ansInput) ansInput.value = '';
}

// Altera a Aba / Modo do Portão de Autenticação
export function setAuthGateMode(mode = 'signin') {
    currentAuthGateMode = mode;
    const titleEl = document.getElementById('auth-gate-title');
    const descEl = document.getElementById('auth-gate-desc');
    const tabSignIn = document.getElementById('gate-tab-signin');
    const tabSignUp = document.getElementById('gate-tab-signup');
    const tabForgot = document.getElementById('gate-tab-forgot');
    const passwordGroup = document.getElementById('gate-password-group');
    const confirmGroup = document.getElementById('gate-confirm-password-group');
    const checklistGroup = document.getElementById('gate-policy-checklist');
    const challengeGroup = document.getElementById('gate-challenge-group');
    const googleSection = document.getElementById('gate-google-section');
    const submitBtn = document.getElementById('gate-submit-btn');
    const feedback = document.getElementById('gate-auth-feedback');
    if (feedback) feedback.textContent = '';

    if (mode === 'forgot') {
        if (titleEl) titleEl.textContent = translate('resetPassword');
        if (descEl) descEl.textContent = translate('resetPasswordDesc');

        tabSignIn?.classList.remove('active');
        tabSignUp?.classList.remove('active');
        tabForgot?.classList.remove('hidden');
        tabForgot?.classList.add('active');

        passwordGroup?.classList.add('hidden');
        confirmGroup?.classList.add('hidden');
        checklistGroup?.classList.add('hidden');
        challengeGroup?.classList.add('hidden');
        googleSection?.classList.add('hidden');

        if (submitBtn) submitBtn.textContent = translate('sendRecoveryLink');
    } else if (mode === 'signup') {
        if (titleEl) titleEl.textContent = translate('signInToContinue');
        if (descEl) descEl.textContent = translate('authDescription');

        tabSignUp?.classList.add('active');
        tabSignUp?.setAttribute('aria-selected', 'true');
        tabSignIn?.classList.remove('active');
        tabSignIn?.setAttribute('aria-selected', 'false');
        tabForgot?.classList.add('hidden');

        passwordGroup?.classList.remove('hidden');
        confirmGroup?.classList.remove('hidden');
        checklistGroup?.classList.remove('hidden');
        challengeGroup?.classList.remove('hidden');
        googleSection?.classList.remove('hidden');

        if (submitBtn) submitBtn.textContent = translate('signUpTab') || translate('createAccount');
        generateSecurityChallenge();
        const pwdInput = document.getElementById('gate-password');
        updatePasswordChecklist('policy', pwdInput?.value || '');
    } else {
        // Modo 'signin'
        if (titleEl) titleEl.textContent = translate('signInToContinue');
        if (descEl) descEl.textContent = translate('authDescription');

        tabSignIn?.classList.add('active');
        tabSignIn?.setAttribute('aria-selected', 'true');
        tabSignUp?.classList.remove('active');
        tabSignUp?.setAttribute('aria-selected', 'false');
        tabForgot?.classList.add('hidden');

        passwordGroup?.classList.remove('hidden');
        confirmGroup?.classList.add('hidden');
        checklistGroup?.classList.add('hidden');
        challengeGroup?.classList.add('hidden');
        googleSection?.classList.remove('hidden');

        if (submitBtn) submitBtn.textContent = translate('signInTab') || translate('signIn');
    }
}

// Modais e Portão de Autenticação (Auth Gate)
export function showAuthGate(initialMode = 'signin') {
    const authGate = document.getElementById('auth-gate');
    const gateAuthFeedback = document.getElementById('gate-auth-feedback');
    const closeAuthGate = document.getElementById('close-auth-gate');
    if (!authGate) return;

    setAuthGateMode(initialMode);
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

// Submissão Inteligente do Formulário do Modal de Autenticação
export async function handleGateAuthSubmit() {
    const email = document.getElementById('gate-email')?.value.trim();
    const password = document.getElementById('gate-password')?.value;
    const confirmPassword = document.getElementById('gate-password-confirm')?.value;
    const botTrap = document.getElementById('gate-bot-trap')?.value;
    const challengeAnswer = document.getElementById('gate-challenge-answer')?.value;
    const feedback = document.getElementById('gate-auth-feedback');

    // 1. Verificação Honeypot Invisível Anti-Bot
    if (botTrap) {
        console.warn('Bot detectado pelo honeypot invisível.');
        if (feedback) feedback.textContent = translate('botDetected');
        return;
    }

    if (!email) {
        if (feedback) feedback.textContent = translate('emptyEntry');
        return;
    }

    if (currentAuthGateMode === 'forgot') {
        const submitBtn = document.getElementById('gate-submit-btn');
        if (submitBtn) submitBtn.disabled = true;
        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: getRecoveryRedirectUrl()
            });
            if (error) {
                if (feedback) feedback.textContent = error.message;
            } else {
                if (feedback) feedback.textContent = translate('recoveryEmailSent');
                showActionFeedback(translate('recoveryEmailSent'));
            }
        } catch (err) {
            console.error('Reset password error:', err);
            if (feedback) feedback.textContent = err.message || translate('errorSaving');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
        return;
    }

    if (!password) {
        if (feedback) feedback.textContent = translate('emptyEntry');
        return;
    }

    if (currentAuthGateMode === 'signup') {
        // 2. Validação Estrita de Política de Senhas (Requisitos Supabase)
        const policy = validatePasswordPolicy(password);
        if (!policy.isValid) {
            if (feedback) feedback.textContent = translate('passwordPolicyError');
            return;
        }

        if (password !== confirmPassword) {
            if (feedback) feedback.textContent = translate('passwordsDontMatch');
            return;
        }

        // 3. Verificação de Desafio Anti-Bot
        if (Number(challengeAnswer) !== currentChallengeAnswer) {
            if (feedback) feedback.textContent = translate('botDetected');
            generateSecurityChallenge();
            return;
        }

        const submitBtn = document.getElementById('gate-submit-btn');
        if (submitBtn) submitBtn.disabled = true;
        try {
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) {
                if (feedback) feedback.textContent = error.message;
            } else {
                if (data?.session) {
                    if (feedback) feedback.textContent = translate('loginSuccess');
                    setTimeout(() => {
                        hideAuthGate();
                        refreshAuthState();
                    }, 800);
                } else {
                    if (feedback) feedback.textContent = translate('accountCreatedCheckEmail');
                }
            }
        } catch (err) {
            console.error('Sign up error:', err);
            if (feedback) feedback.textContent = err.message || translate('errorSaving');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    } else {
        // Modo Login
        const submitBtn = document.getElementById('gate-submit-btn');
        if (submitBtn) submitBtn.disabled = true;
        try {
            await handleEmailSignIn(email, password, true);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }
}

// Modal de Redefinição de Senha (Após redirecionamento de link do e-mail)
export function showResetPasswordDialog() {
    const dialog = document.getElementById('reset-password-dialog');
    const feedback = document.getElementById('reset-auth-feedback');
    if (!dialog) return;
    dialog.classList.remove('hidden');
    if (feedback) feedback.textContent = '';
    const newPwd = document.getElementById('reset-new-password');
    updatePasswordChecklist('reset-policy', newPwd?.value || '');
}

export function hideResetPasswordDialog() {
    const dialog = document.getElementById('reset-password-dialog');
    dialog?.classList.add('hidden');
}

export async function handleResetPasswordSubmit() {
    const newPassword = document.getElementById('reset-new-password')?.value;
    const confirmPassword = document.getElementById('reset-confirm-password')?.value;
    const feedback = document.getElementById('reset-auth-feedback');

    if (!newPassword) {
        if (feedback) feedback.textContent = translate('emptyEntry');
        return;
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.isValid) {
        if (feedback) feedback.textContent = translate('passwordPolicyError');
        return;
    }

    if (newPassword !== confirmPassword) {
        if (feedback) feedback.textContent = translate('passwordsDontMatch');
        return;
    }

    const submitBtn = document.getElementById('reset-submit-btn');
    if (submitBtn) submitBtn.disabled = true;
    try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) {
            if (feedback) feedback.textContent = error.message;
        } else {
            if (feedback) feedback.textContent = translate('passwordUpdated');
            showActionFeedback(translate('passwordUpdated'));
            setTimeout(() => {
                hideResetPasswordDialog();
                refreshAuthState();
            }, 1200);
        }
    } catch (err) {
        console.error('Reset password update error:', err);
        if (feedback) feedback.textContent = err.message || translate('errorSaving');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

// Alteração de Senha nas Configurações (com suporte a senha atual obrigatória)
export async function handleSettingsChangePassword() {
    const currentPassword = document.getElementById('settings-current-password')?.value;
    const newPassword = document.getElementById('settings-new-password')?.value;
    const confirmPassword = document.getElementById('settings-confirm-password')?.value;
    const feedback = document.getElementById('settings-password-feedback');

    if (!currentPassword) {
        if (feedback) feedback.textContent = translate('currentPasswordRequired');
        return;
    }

    if (!newPassword) {
        if (feedback) feedback.textContent = translate('emptyEntry');
        return;
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.isValid) {
        if (feedback) feedback.textContent = translate('passwordPolicyError');
        return;
    }

    if (newPassword !== confirmPassword) {
        if (feedback) feedback.textContent = translate('passwordsDontMatch');
        return;
    }

    const btn = document.getElementById('btn-settings-change-password');
    if (btn) btn.disabled = true;
    try {
        const { error } = await supabaseClient.auth.updateUser(
            { password: newPassword },
            { currentPassword: currentPassword }
        );

        if (error) {
            if (feedback) feedback.textContent = error.message;
        } else {
            if (feedback) feedback.textContent = translate('passwordUpdated');
            showActionFeedback(translate('passwordUpdated'));
            const curInput = document.getElementById('settings-current-password');
            const newInput = document.getElementById('settings-new-password');
            const confInput = document.getElementById('settings-confirm-password');
            if (curInput) curInput.value = '';
            if (newInput) newInput.value = '';
            if (confInput) confInput.value = '';
            updatePasswordChecklist('settings-policy', '');
        }
    } catch (err) {
        console.error('Settings change password error:', err);
        if (feedback) feedback.textContent = err.message || translate('errorSaving');
    } finally {
        if (btn) btn.disabled = false;
    }
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
        if (feedback) feedback.textContent = error ? error.message : translate('loginSuccess');
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

/** Helper interno: sincroniza os elementos do DOM com o usuário autenticado atual. */
function syncUserDOM(profileName, headerUserName, profileUsername, profileSubtitle, profileAvatars) {
    const u = state.authenticatedUser;
    if (!u) return;
    if (profileName) profileName.textContent = u.name;
    if (headerUserName) headerUserName.textContent = u.name;
    if (profileUsername) profileUsername.textContent = '@' + u.username;
    if (profileSubtitle) profileSubtitle.textContent = getTranslatedTitle(u.title);
    profileAvatars.forEach(avatar => updateAvatarDisplay(avatar, u.avatar_url, u.name));
}

/**
 * Sincroniza o estado de autenticação completo: lê sessão, busca perfil e atualiza o DOM.
 * @param {object|null|undefined} [incomingUser] - Usuário já resolvido (undefined = busca do Supabase).
 * @param {Function|null} [onStateRefreshed] - Callback executado após a sincronização.
 */
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
                const rawCache = localStorage.getItem(STORAGE_KEYS.PROFILE_CACHE(user.id));
                if (rawCache) {
                    const parsed = JSON.parse(rawCache);
                    // Invalida cache após 24 horas para evitar dados obsoletos
                    const isStale = parsed.cachedAt && (Date.now() - parsed.cachedAt > 24 * 60 * 60 * 1000);
                    if (!isStale) cachedProfile = parsed.data || parsed;
                }
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
            syncUserDOM(profileName, headerUserName, profileUsername, profileSubtitle, profileAvatars);

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
                        localStorage.setItem(STORAGE_KEYS.PROFILE_CACHE(user.id), JSON.stringify({
                            data: profile,
                            cachedAt: Date.now()
                        }));
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

                // Re-atualiza a interface com os dados definitivos do banco
                syncUserDOM(profileName, headerUserName, profileUsername, profileSubtitle, profileAvatars);
            } catch (dbErr) {
                console.warn('Sync profile with Supabase warn:', dbErr);
            }
        } else {
            state.authenticatedUser = null;
        }

        const authenticated = Boolean(state.authenticatedUser);
        const writeSection = document.getElementById('write-section');
        const btnNotifications = document.getElementById('btn-notifications');
        const communityPulseBar = document.getElementById('community-pulse-bar');

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

        if (communityPulseBar) {
            const isPulseEnabled = localStorage.getItem(STORAGE_KEYS.PULSE) !== 'false';
            communityPulseBar.classList.toggle('hidden', !authenticated || !isPulseEnabled);
        }

        if (authenticated) {
            hideAuthGate();
            syncUserDOM(profileName, headerUserName, profileUsername, profileSubtitle, profileAvatars);
            fetchUserNotifications();
        } else {
            if (profileName) profileName.textContent = translate('notAuthenticated');
            if (headerUserName) headerUserName.textContent = '';
            profileAvatars.forEach(avatar => { avatar.textContent = '?'; });
            updateNotificationsBadge();
        }

        if (typeof onStateRefreshed === 'function') {
            await onStateRefreshed();
        }
    } catch (err) {
        console.error('refreshAuthState error:', err);
    }
}
