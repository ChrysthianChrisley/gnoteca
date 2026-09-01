// Elementos da Interface
const btnWrite = document.getElementById('btn-write');
const btnRead = document.getElementById('btn-read');
const writeSection = document.getElementById('write-section');
const readSection = document.getElementById('read-section');
const ideaInput = document.getElementById('idea-input');
const btnSave = document.getElementById('btn-save');
const feedbackMsg = document.getElementById('feedback-msg');
const ideasList = document.getElementById('ideas-list');
const profileSidebar = document.getElementById('profile-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const btnProfile = document.getElementById('btn-profile');
const loginTrigger = document.getElementById('login-trigger');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const btnSignout = document.getElementById('btn-signout');
const ideasCount = document.getElementById('ideas-count');
const favoritesCount = document.getElementById('favorites-count');
const actionFeedback = document.getElementById('action-feedback');
const themeToggle = document.getElementById('theme-toggle');
const themeLabel = document.getElementById('theme-label');
const deleteDialog = document.getElementById('delete-dialog');
const deleteDialogCard = deleteDialog.querySelector('.delete-dialog-card');
const cancelDelete = document.getElementById('cancel-delete');
const confirmDelete = document.getElementById('confirm-delete');
const btnHome = document.getElementById('btn-home');
const profileName = document.getElementById('profile-name');
const headerUserName = document.getElementById('header-user-name');
const profileAvatars = document.querySelectorAll('[data-profile-avatar]');
const feedFilter = document.getElementById('feed-filter');
const feedTitle = document.getElementById('feed-title');
const feedKicker = document.getElementById('feed-kicker');
const backToFeed = document.getElementById('back-to-feed');
const overviewMenu = document.getElementById('overview-menu');
const favoritesMenu = document.getElementById('favorites-menu');
const languageOptions = document.querySelectorAll('[data-language]');
const authPanel = document.getElementById('auth-panel');
const authStatus = document.getElementById('auth-status');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const emailSignIn = document.getElementById('email-sign-in');
const emailSignUp = document.getElementById('email-sign-up');
const googleSignIn = document.getElementById('google-sign-in');
const authGate = document.getElementById('auth-gate');
const closeAuthGate = document.getElementById('close-auth-gate');
const gateGoogleSignIn = document.getElementById('gate-google-sign-in');
const gateEmailSignIn = document.getElementById('gate-email-sign-in');
const gateEmailSignUp = document.getElementById('gate-email-sign-up');
const gateEmail = document.getElementById('gate-email');
const gatePassword = document.getElementById('gate-password');
const gateAuthFeedback = document.getElementById('gate-auth-feedback');
const profileConstellation = document.getElementById('profile-constellation');
const loadMoreFeed = document.getElementById('load-more-feed');

// Novos Elementos para Feed Moderno e Rolagem Infinita
const visitorHero = document.getElementById('visitor-hero');
const feedLoader = document.getElementById('feed-loader');
const unauthGateBanner = document.getElementById('unauth-gate-banner');
const gateBannerAuth = document.getElementById('gate-banner-auth');
const gateBannerGoogle = document.getElementById('gate-banner-google');
const feedSentinel = document.getElementById('feed-sentinel');

// Novos Elementos para Edição de Perfil
const btnEditAvatar = document.getElementById('btn-edit-avatar');
const btnEditName = document.getElementById('btn-edit-name');
const btnSelectTitle = document.getElementById('btn-select-title');
const profileUsername = document.getElementById('profile-username');
const profileSubtitle = document.getElementById('profile-subtitle');
const editProfileDialog = document.getElementById('edit-profile-dialog');
const closeEditDialog = document.getElementById('close-edit-dialog');
const btnSaveProfile = document.getElementById('btn-save-profile');
const editNameSection = document.getElementById('edit-name-section');
const editAvatarSection = document.getElementById('edit-avatar-section');
const editTitleSection = document.getElementById('edit-title-section');
const inputEditName = document.getElementById('input-edit-name');
const inputEditAvatar = document.getElementById('input-edit-avatar');
const selectEditTitle = document.getElementById('select-edit-title');
const editProfileFeedback = document.getElementById('edit-profile-feedback');
const statFragments = document.getElementById('stat-fragments');
const statFavorites = document.getElementById('stat-favorites');
const btnBackToTop = document.getElementById('btn-back-to-top');

const charCounter = document.getElementById('char-counter');
const maxLength = 280;
let pendingDeleteId = null;
let activeFeed = 'global';
let selectedProfileId = null;
const projectBasePath = window.location.pathname.startsWith('/gnoteca') ? '/gnoteca' : '';
let authenticatedUser = null;

// Configuracoes de Paginacao e Cache para Economia de Recursos
const publicFeedLimit = 3;
const PAGE_SIZE = 6;
let currentPage = 0;
let hasMorePages = true;
let isFetchingPage = false;
const queryCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minuto de cache em memoria

function getCacheKey(feedType, profileId, filter, page) {
    return `${feedType}_${profileId || 'all'}_${filter}_p${page}_${authenticatedUser ? authenticatedUser.id : 'anon'}`;
}

function getCachedData(key) {
    const cached = queryCache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    queryCache.set(key, { timestamp: Date.now(), data });
}

function invalidateCache() {
    queryCache.clear();
}

// Configuração do Supabase Client
const supabaseUrl = 'https://vavitcyykwqqmjqkhyna.supabase.co';
const supabasePublishableKey = 'sb_publishable_5hBpKXPuMB0HmAuyww6WcA_I7C55xwa';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabasePublishableKey);

// Dicionário de Traduções
const translations = {
    'pt-BR': {
        profileTitle: 'Meu perfil', profileSubtitle: 'explorador de conhecimento',
        newIdea: 'Nova Ideia', myCollection: 'Meu Acervo', notAuthenticated: 'Não autenticado', emailPlaceholder: 'Seu e-mail', passwordPlaceholder: 'Sua senha',
        signIn: 'Entrar', createAccount: 'Criar conta', continueGoogle: 'Continuar com Google', signOutShort: 'Sair', or: 'ou', signInToContinue: 'Entre para continuar',
        authDescription: 'Crie sua conta ou entre para publicar, validar hipóteses e explorar todo o acervo.', loginSuccess: 'Login realizado', confirmEmail: 'Confirme seu e-mail para continuar', save: 'Salvar', saveToGnoteca: 'Salvar na Gnoteca', signInToSeeMore: 'Entrar para ver mais', by: 'por', edit: 'Editar', delete: 'Apagar',
        fragments: 'fragmentos', favorites: 'favoritos', overview: 'Visão geral', settings: 'Configurações', signOut: 'Sair da conta',
        language: 'Idioma', removeEntry: 'Remover entrada', deleteQuestion: 'Apagar este fragmento?', deleteWarning: 'Essa ação não poderá ser desfeita.',
        cancel: 'Cancelar', delete: 'Apagar', ideaPlaceholder: 'Qual conceito, hipótese ou insight deseja registrar?', backToFeed: 'Voltar ao acervo', publicCollection: 'Acervo público',
        latestFragments: 'Últimos fragmentos', sortBy: 'Ordenar por', newest: 'Mais novas', mostVoted: 'Mais votadas', mostFavorited: 'Mais favoritas',
        nightMode: 'Modo noturno', lightMode: 'Modo claro', profile: 'Perfil', favoriteCollection: 'Meus favoritos', empty: 'Nenhum fragmento salvo ainda. Comece a escrever!',
        authorOnly: 'Apenas o autor pode alterar esta entrada.', emptyEntry: 'A entrada não pode ficar vazia.',
        loading: 'Carregando fragmentos...', errorLoading: 'Erro ao carregar os fragmentos.', errorSaving: 'Erro ao salvar. Tente novamente.',
        voteLimitReached: 'Você atingiu o limite de 5 votos por dia. Escolha com critério quais ideias validar!',
        favoriteLimitReached: 'Você só pode guardar 3 fragmentos fundamentais por vez. Desmarque um para adicionar este.',
        constellationTitle: 'Constelação de Conhecimento',
        constellationSubtitle: 'Os 3 pilares fundamentais guardados por este autor',
        emptyConstellationSlot: 'Pilar',
        emptyConstellationHelp: 'Selecione mais uma ideia favorita para completar sua tríade fundamental.',
        emptyConstellationOther: 'Espaço aberto para um novo princípio fundamental.',
        pillar: 'Pilar',
        pillars: 'Pilares',
        heroBadge: 'Acervo de Conhecimento & Ciência',
        heroTitle: 'Onde as ideias ganham forma',
        heroSubtitle: 'Um repositório dinâmico de hipóteses, conceitos e pensamentos fundamentais. Explore, analise e guarde os pilares que sustentam o conhecimento.',
        unauthGateBadge: 'Acesso para Visitantes',
        unauthGateTitle: 'Deseja continuar explorando?',
        unauthGateText: 'Você visualizou os 3 últimos fragmentos. Faça login ou crie sua conta gratuita para desbloquear o acervo completo, compartilhar descobertas e votar.'
    },
    'en-US': {
        profileTitle: 'My profile', profileSubtitle: 'knowledge explorer', fragments: 'fragments', favorites: 'favorites',
        newIdea: 'New Idea', myCollection: 'My Collection', notAuthenticated: 'Not authenticated', emailPlaceholder: 'Your email', passwordPlaceholder: 'Your password',
        signIn: 'Sign in', createAccount: 'Create account', continueGoogle: 'Continue with Google', signOutShort: 'Sign out', or: 'or', signInToContinue: 'Sign in to continue',
        authDescription: 'Create an account or sign in to publish, validate hypotheses, and explore the entire collection.', loginSuccess: 'Signed in', confirmEmail: 'Confirm your email to continue', save: 'Save', saveToGnoteca: 'Save to Gnoteca', signInToSeeMore: 'Sign in to see more', by: 'by', edit: 'Edit', delete: 'Delete',
        overview: 'Overview', settings: 'Settings', signOut: 'Sign out', language: 'Language', removeEntry: 'Remove entry', deleteQuestion: 'Delete this fragment?',
        deleteWarning: 'This action cannot be undone.', cancel: 'Cancel', delete: 'Delete', ideaPlaceholder: 'What concept, hypothesis, or insight would you like to record?', backToFeed: 'Back to collection',
        publicCollection: 'Public collection', latestFragments: 'Latest fragments', sortBy: 'Sort by', newest: 'Newest', mostVoted: 'Most voted', mostFavorited: 'Most favorited',
        nightMode: 'Dark mode', lightMode: 'Light mode', profile: 'Profile', favoriteCollection: 'My favorites', empty: 'No fragments saved yet. Start writing!',
        authorOnly: 'Only the author can change this entry.', emptyEntry: 'The entry cannot be empty.',
        loading: 'Loading fragments...', errorLoading: 'Error loading fragments.', errorSaving: 'Error saving. Please try again.',
        voteLimitReached: 'You have reached the limit of 5 votes per day. Choose carefully which ideas to validate!',
        favoriteLimitReached: 'You can only keep 3 fundamental fragments at a time. Unfavorite one to add this.',
        constellationTitle: 'Constellation of Knowledge',
        constellationSubtitle: 'The 3 fundamental pillars kept by this author',
        emptyConstellationSlot: 'Pillar',
        emptyConstellationHelp: 'Select another key idea to complete your fundamental triad.',
        emptyConstellationOther: 'Open slot for a new foundational principle.',
        pillar: 'Pillar',
        pillars: 'Pillars',
        heroBadge: 'Knowledge & Science Archive',
        heroTitle: 'Where ideas take shape',
        heroSubtitle: 'A dynamic repository of hypotheses, concepts, and fundamental insights. Explore, analyze, and save the core pillars of knowledge.',
        unauthGateBadge: 'Visitor Access',
        unauthGateTitle: 'Want to keep exploring?',
        unauthGateText: 'You have viewed the last 3 entries. Sign in or create a free account to unlock the full archive, share discoveries, and vote.'
    },
    'es-ES': {
        profileTitle: 'Mi perfil', profileSubtitle: 'explorador de conocimiento', fragments: 'fragmentos', favorites: 'favoritos',
        newIdea: 'Nueva idea', myCollection: 'Mi acervo', notAuthenticated: 'No autenticado', emailPlaceholder: 'Tu correo', passwordPlaceholder: 'Tu contraseña',
        signIn: 'Entrar', createAccount: 'Crear cuenta', continueGoogle: 'Continuar com Google', signOutShort: 'Salir', or: 'o', signInToContinue: 'Inicia sesión para continuar',
        authDescription: 'Crea una cuenta o inicia sesión para publicar, validar hipótesis y explorar todo el acervo.', loginSuccess: 'Sesión iniciada', confirmEmail: 'Confirma tu correo para continuar', save: 'Guardar', saveToGnoteca: 'Guardar en Gnoteca', signInToSeeMore: 'Inicia sesión para ver más', by: 'por', edit: 'Editar', delete: 'Eliminar',
        overview: 'Vista general', settings: 'Configuración', signOut: 'Cerrar sesión', language: 'Idioma', removeEntry: 'Eliminar entrada', deleteQuestion: '¿Eliminar este fragmento?',
        deleteWarning: 'Esta acción no se puede deshacer.', cancel: 'Cancelar', delete: 'Eliminar', ideaPlaceholder: '¿Qué concepto, hipótesis o insight deseas registrar?', backToFeed: 'Volver al acervo',
        publicCollection: 'Acervo público', latestFragments: 'Últimos fragmentos', sortBy: 'Ordenar por', newest: 'Más novos', mostVoted: 'Más votados', mostFavorited: 'Más favoritos',
        nightMode: 'Modo nocturno', lightMode: 'Modo claro', profile: 'Perfil', favoriteCollection: 'Mis favoritos', empty: 'Aún no hay fragmentos guardados. ¡Empieza a escrever!',
        authorOnly: 'Solo el autor puede modificar esta entrada.', emptyEntry: 'La entrada no puede estar vacía.',
        loading: 'Cargando fragmentos...', errorLoading: 'Error al cargar los fragmentos.', errorSaving: 'Error al guardar. Inténtelo de nuevo.',
        voteLimitReached: 'Has alcanzado el límite de 5 votos por día. ¡Elige con criterio qué ideas validar!',
        favoriteLimitReached: 'Solo puedes guardar 3 fragmentos fundamentales a la vez. Desmarca uno para añadir este.',
        constellationTitle: 'Constelación de Conocimiento',
        constellationSubtitle: 'Los 3 pilares fundamentales guardados por este autor',
        emptyConstellationSlot: 'Pilar',
        emptyConstellationHelp: 'Selecciona otra idea para completar tu tríada fundamental.',
        emptyConstellationOther: 'Espacio abierto para un nuevo principio fundamental.',
        pillar: 'Pilar',
        pillars: 'Pilares',
        heroBadge: 'Acervo de Conocimiento y Ciencia',
        heroTitle: 'Donde las ideas toman forma',
        heroSubtitle: 'Un repositorio dinámico de hipótesis, conceptos y descubrimientos fundamentales. Explora, analiza y guarda los pilares que sustentan el conocimiento.',
        unauthGateBadge: 'Acceso para Visitantes',
        unauthGateTitle: '¿Deseas continuar explorando?',
        unauthGateText: 'Has visualizado los últimos 3 fragmentos. Inicia sesión o crea tu cuenta gratuita para desbloquear el acervo completo, compartir descubrimientos y votar.'
    }
};

let currentLanguage = localStorage.getItem('gnoteca_language') || 'pt-BR';

function translate(key) {
    return translations[currentLanguage]?.[key] || translations['pt-BR']?.[key] || key;
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function applyLanguage(language) {
    currentLanguage = translations[language] ? language : 'pt-BR';
    localStorage.setItem('gnoteca_language', currentLanguage);
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll('[data-i18n]').forEach(element => {
        element.textContent = translate(element.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        element.placeholder = translate(element.dataset.i18nPlaceholder);
    });
    languageOptions.forEach(option => option.classList.toggle('selected', option.dataset.language === currentLanguage));
    themeLabel.textContent = document.body.classList.contains('dark-mode') ? translate('lightMode') : translate('nightMode');
    loadIdeas();
}

languageOptions.forEach(option => option.addEventListener('click', () => {
    applyLanguage(option.dataset.language);
}));

function slugify(name) {
    return (name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function extractUserMetadata(user) {
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

function updateAvatarDisplay(avatarEl, avatarUrl, name) {
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

async function getAccountBySlug(slug) {
    if (authenticatedUser && (slugify(authenticatedUser.name) === slug || authenticatedUser.username === slug)) {
        return authenticatedUser;
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

function getProfilePath(account) {
    const profileSlug = slugify(account.username || account.name || '');
    return window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
        ? `${projectBasePath}/#/${profileSlug}`
        : `${projectBasePath}/${profileSlug}`;
}

function getHomePath() {
    return `${projectBasePath}/`;
}

function showAuthMessage(message) {
    authStatus.textContent = message;
}

function setDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeLabel.textContent = isDark ? translate('lightMode') : translate('nightMode');
    localStorage.setItem('gnoteca_dark_mode', String(isDark));
}

setDarkMode(localStorage.getItem('gnoteca_dark_mode') === 'true');
themeToggle.addEventListener('click', () => {
    setDarkMode(!document.body.classList.contains('dark-mode'));
});

// Gestão de Estado de Autenticação
async function refreshAuthState(incomingUser = undefined) {
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

        if (user) {
            const { avatarUrl, name, username } = extractUserMetadata(user);

            authenticatedUser = {
                id: user.id,
                email: user.email,
                name: name || user.email?.split('@')[0] || 'Pensador',
                username: username || slugify(name) || user.id.slice(0, 8),
                avatar_url: avatarUrl || null
            };

            // Atualiza o DOM imediatamente
            if (profileName) profileName.textContent = authenticatedUser.name;
            if (headerUserName) headerUserName.textContent = authenticatedUser.name;
            profileAvatars.forEach(avatar => {
                updateAvatarDisplay(avatar, authenticatedUser.avatar_url, authenticatedUser.name);
            });

            // Consulta perfil em public.profiles e sincroniza em background
            try {
                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('id, username, display_name, avatar_url, current_title')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile) {
                    if (profile.display_name) {
                        authenticatedUser.name = profile.display_name;
                    }
                    if (profile.avatar_url) {
                        authenticatedUser.avatar_url = profile.avatar_url;
                    }
                    if (profile.username) {
                        authenticatedUser.username = profile.username;
                    }
                    if (profile.current_title) {
                        authenticatedUser.title = profile.current_title;
                    } else {
                        authenticatedUser.title = 'Explorador de Conhecimento';
                    }
                } else {
                    await supabaseClient.from('profiles').upsert({
                        id: user.id,
                        username: authenticatedUser.username,
                        display_name: authenticatedUser.name,
                        avatar_url: authenticatedUser.avatar_url,
                        current_title: 'Explorador de Conhecimento'
                    }, { onConflict: 'id' });
                }

                // Re-atualiza a interface
                if (profileName) profileName.textContent = authenticatedUser.name;
                if (headerUserName) headerUserName.textContent = authenticatedUser.name;
                if (profileUsername) profileUsername.textContent = '@' + authenticatedUser.username;
                if (profileSubtitle) profileSubtitle.textContent = authenticatedUser.title || translate('profileSubtitle');
                profileAvatars.forEach(avatar => {
                    updateAvatarDisplay(avatar, authenticatedUser.avatar_url, authenticatedUser.name);
                });
            } catch (dbErr) {
                console.warn('Sync profile with Supabase warn:', dbErr);
            }
        } else {
            authenticatedUser = null;
        }

        const authenticated = Boolean(authenticatedUser);

        // Oculta o formulário de login na sidebar quando o usuário está logado
        if (authPanel) authPanel.classList.toggle('hidden', authenticated);

        if (authStatus) authStatus.textContent = authenticated ? (authenticatedUser.email || authenticatedUser.name) : translate('notAuthenticated');
        if (btnWrite) btnWrite.classList.toggle('hidden', !authenticated);
        if (btnRead) btnRead.classList.toggle('hidden', !authenticated);
        if (btnProfile) btnProfile.classList.toggle('hidden', !authenticated);
        if (btnSignout) btnSignout.classList.toggle('hidden', !authenticated);
        if (loginTrigger) loginTrigger.classList.toggle('hidden', authenticated);
        if (loadMoreFeed) loadMoreFeed.classList.toggle('hidden', authenticated || activeFeed !== 'global');

        if (authenticatedUser) {
            hideAuthGate();
            if (profileName) profileName.textContent = authenticatedUser.name;
            if (headerUserName) headerUserName.textContent = authenticatedUser.name;
            profileAvatars.forEach(avatar => {
                updateAvatarDisplay(avatar, authenticatedUser.avatar_url, authenticatedUser.name);
            });
        } else {
            if (profileName) profileName.textContent = translate('notAuthenticated');
            if (headerUserName) headerUserName.textContent = '';
            profileAvatars.forEach(avatar => {
                avatar.textContent = '?';
            });
        }

        await loadIdeas();
        await updateProfileStats();
    } catch (err) {
        console.error('refreshAuthState error:', err);
    }
}

function showAuthGate() {
    authGate.classList.remove('hidden');
    gateAuthFeedback.textContent = '';
    closeAuthGate.focus();
}

function hideAuthGate() {
    authGate.classList.add('hidden');
    gateAuthFeedback.textContent = '';
}

closeAuthGate.addEventListener('click', hideAuthGate);
authGate.addEventListener('click', event => {
    if (event.target === authGate) hideAuthGate();
});

async function handleGoogleSignIn() {
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

googleSignIn.addEventListener('click', handleGoogleSignIn);
gateGoogleSignIn.addEventListener('click', handleGoogleSignIn);

gateEmailSignIn.addEventListener('click', async () => {
    const email = gateEmail.value.trim();
    const password = gatePassword.value;
    if (!email || !password) return;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    gateAuthFeedback.textContent = error ? error.message : translate('loginSuccess') + '.';
    if (!error) {
        hideAuthGate();
        await refreshAuthState();
    }
});

gateEmailSignUp.addEventListener('click', async () => {
    const email = gateEmail.value.trim();
    const password = gatePassword.value;
    if (!email || !password) return;
    const { error } = await supabaseClient.auth.signUp({ email, password });
    gateAuthFeedback.textContent = error ? error.message : translate('confirmEmail') + '.';
});

if (loadMoreFeed) loadMoreFeed.addEventListener('click', showAuthGate);
if (loginTrigger) loginTrigger.addEventListener('click', showAuthGate);

if (emailSignIn) {
    emailSignIn.addEventListener('click', async () => {
        const email = authEmail.value.trim();
        const password = authPassword.value;
        if (!email || !password) return;
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        showAuthMessage(error ? error.message : translate('loginSuccess'));
        if (!error) await refreshAuthState();
    });
}

if (emailSignUp) {
    emailSignUp.addEventListener('click', async () => {
        const email = authEmail.value.trim();
        const password = authPassword.value;
        if (!email || !password) return;
        const { error } = await supabaseClient.auth.signUp({ email, password });
        showAuthMessage(error ? error.message : translate('confirmEmail'));
    });
}

async function handleSignOut() {
    authenticatedUser = null;
    invalidateCache();
    activeFeed = 'global';
    selectedProfileId = null;
    window.history.replaceState({ feedType: 'global' }, '', getHomePath());
    toggleSidebar(false);
    writeSection?.classList.add('hidden');
    readSection?.classList.remove('hidden');
    btnWrite?.classList.remove('active');
    btnRead?.classList.remove('active');
    window.scrollTo({ top: 0 });

    try {
        await supabaseClient.auth.signOut();
    } catch (err) {
        console.warn('Sign out warning:', err);
    }

    await refreshAuthState(null);
}

if (btnSignout) btnSignout.addEventListener('click', handleSignOut);

supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
        authenticatedUser = null;
        invalidateCache();
        activeFeed = 'global';
        selectedProfileId = null;
        await refreshAuthState(null);
    } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        await refreshAuthState(session?.user || undefined);
    }
});

// Diálogo de Confirmação de Exclusão
function openDeleteDialog(ideaId, card) {
    pendingDeleteId = ideaId;
    const cardRect = card.getBoundingClientRect();
    const dialogWidth = Math.min(380, window.innerWidth - 32);
    const left = cardRect.left + (cardRect.width - dialogWidth) / 2;

    deleteDialogCard.style.setProperty('--dialog-left', `${Math.max(16, Math.min(left, window.innerWidth - dialogWidth - 16))}px`);
    deleteDialog.classList.remove('hidden');
    const dialogHeight = deleteDialogCard.offsetHeight;
    const top = cardRect.top + (cardRect.height - dialogHeight) / 2;
    deleteDialogCard.style.setProperty('--dialog-top', `${Math.max(16, Math.min(top, window.innerHeight - dialogHeight - 16))}px`);
    cancelDelete.focus();
}

function closeDeleteDialog() {
    pendingDeleteId = null;
    deleteDialog.classList.add('hidden');
}

cancelDelete.addEventListener('click', closeDeleteDialog);
deleteDialog.addEventListener('click', event => {
    if (event.target === deleteDialog) closeDeleteDialog();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !deleteDialog.classList.contains('hidden')) {
        closeDeleteDialog();
    }
});

confirmDelete.addEventListener('click', async () => {
    if (pendingDeleteId === null || !authenticatedUser) return;
    confirmDelete.disabled = true;
    try {
        const { error } = await supabaseClient
            .from('entries')
            .delete()
            .eq('id', pendingDeleteId)
            .eq('author_id', authenticatedUser.id);

        if (error) {
            showActionFeedback(error.message || 'Erro ao apagar fragmento.');
        } else {
            showActionFeedback('Fragmento apagado com sucesso.');
        }
        closeDeleteDialog();
        invalidateCache();
        await loadIdeas();
        await updateProfileStats();
    } catch (err) {
        console.error('confirmDelete error:', err);
        showActionFeedback('Erro ao apagar entrada');
    } finally {
        confirmDelete.disabled = false;
    }
});

// Navegação e Barra Lateral
function toggleSidebar(isOpen) {
    profileSidebar.classList.toggle('open', isOpen);
    sidebarOverlay.classList.toggle('hidden', !isOpen);
    profileSidebar.setAttribute('aria-hidden', String(!isOpen));
    btnProfile.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
        if (authenticatedUser) {
            if (profileName) profileName.textContent = authenticatedUser.name;
            if (headerUserName) headerUserName.textContent = authenticatedUser.name;
            profileAvatars.forEach(avatar => {
                updateAvatarDisplay(avatar, authenticatedUser.avatar_url, authenticatedUser.name);
            });
        }
        updateProfileStats();
    }
}

async function showFeed(feedType) {
    if (feedType !== 'global' && !authenticatedUser) {
        showAuthGate();
        return;
    }
    activeFeed = feedType;
    selectedProfileId = null;
    window.history.pushState({ feedType }, '', getHomePath());
    writeSection.classList.add('hidden');
    readSection.classList.remove('hidden');
    btnWrite.classList.remove('active');
    btnRead.classList.toggle('active', feedType === 'mine');
    await loadIdeas();
}

async function showProfile(profileId) {
    if (!profileId) return;
    activeFeed = 'profile';
    selectedProfileId = profileId;

    let account = null;
    if (authenticatedUser && authenticatedUser.id === profileId) {
        account = authenticatedUser;
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
    writeSection.classList.add('hidden');
    readSection.classList.remove('hidden');
    btnWrite.classList.remove('active');
    btnRead.classList.remove('active');
    await loadIdeas();
}

async function loadRouteFromUrl() {
    const pathWithoutBase = window.location.pathname.slice(projectBasePath.length);
    const hashSlug = window.location.hash.startsWith('#/') ? window.location.hash.slice(2).split('/')[0] : '';
    const slug = hashSlug || pathWithoutBase.split('/').filter(Boolean)[0];

    if (slug) {
        const account = await getAccountBySlug(slug);
        if (account) {
            activeFeed = 'profile';
            selectedProfileId = account.id;
            writeSection.classList.add('hidden');
            readSection.classList.remove('hidden');
            btnWrite.classList.remove('active');
            btnRead.classList.remove('active');
            await loadIdeas();
            return;
        } else {
            window.history.replaceState({ feedType: 'global' }, '', getHomePath());
            activeFeed = 'global';
            selectedProfileId = null;
        }
    }

    await loadIdeas();
}

btnProfile.addEventListener('click', () => toggleSidebar(true));
btnCloseSidebar.addEventListener('click', () => toggleSidebar(false));
sidebarOverlay.addEventListener('click', () => toggleSidebar(false));
btnHome.addEventListener('click', () => showFeed('global'));
overviewMenu.addEventListener('click', () => {
    toggleSidebar(false);
    showFeed('global');
});
favoritesMenu.addEventListener('click', () => {
    toggleSidebar(false);
    showFeed('favorites');
});
feedFilter.addEventListener('change', () => loadIdeas());
backToFeed.addEventListener('click', () => showFeed('global'));
window.addEventListener('popstate', () => loadRouteFromUrl());

ideaInput.addEventListener('input', () => {
    const currentLength = ideaInput.value.length;
    charCounter.textContent = `${currentLength} / ${maxLength}`;
    charCounter.classList.toggle('limit-reached', currentLength >= maxLength);
});

btnWrite.addEventListener('click', () => {
    if (!authenticatedUser) {
        showAuthGate();
        return;
    }
    writeSection.classList.remove('hidden');
    readSection.classList.add('hidden');
    btnWrite.classList.add('active');
    btnRead.classList.remove('active');
    ideaInput.focus();
});

btnRead.addEventListener('click', () => {
    if (!authenticatedUser) {
        showAuthGate();
        return;
    }
    showFeed('mine');
});

// Salvar Ideia / Fragmento no Supabase
btnSave.addEventListener('click', async () => {
    if (!authenticatedUser) {
        showAuthGate();
        return;
    }
    const text = ideaInput.value.trim();
    if (!text) return;

    btnSave.disabled = true;
    try {
        const { error } = await supabaseClient
            .from('entries')
            .insert([{
                content: text,
                author_id: authenticatedUser.id
            }]);

        if (error) {
            console.error('Error saving entry:', error);
            showActionFeedback(error.message || translate('errorSaving'));
            return;
        }

        ideaInput.value = '';
        charCounter.textContent = `0 / ${maxLength}`;
        charCounter.classList.remove('limit-reached');
        feedbackMsg.classList.remove('hidden');
        setTimeout(() => {
            feedbackMsg.classList.add('hidden');
        }, 2000);

        invalidateCache();
        await loadIdeas();
        await updateProfileStats();
        // Leva o usuário de volta ao feed
        showFeed('global');
    } catch (err) {
        console.error('Save idea error:', err);
        showActionFeedback(translate('errorSaving'));
    } finally {
        btnSave.disabled = false;
    }
});

// Formatacao de Entradas para Objeto Estruturado
function formatIdeaEntry(entry) {
    const upvotes = (entry.votes || []).filter(v => v.vote_type === 'up').length;
    const downvotes = (entry.votes || []).filter(v => v.vote_type === 'down').length;
    const userVote = authenticatedUser
        ? (entry.votes || []).find(v => v.user_id === authenticatedUser.id)?.vote_type || null
        : null;
    const favorite = authenticatedUser
        ? (entry.favorites || []).some(f => f.user_id === authenticatedUser.id)
        : false;
    const totalFavorites = (entry.favorites || []).length;
    const authorName = entry.profiles?.display_name || entry.profiles?.username || 'Anônimo';
    const authorAvatarUrl = entry.profiles?.avatar_url || null;

    return {
        id: entry.id,
        content: entry.content,
        authorId: entry.author_id,
        authorName: authorName,
        authorUsername: entry.profiles?.username,
        authorAvatarUrl: authorAvatarUrl,
        upvotes,
        downvotes,
        userVote,
        favorite,
        favoritesCount: totalFavorites,
        created_at: entry.created_at,
        date: new Date(entry.created_at).toLocaleDateString(currentLanguage, {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    };
}

// Renderizacao do Elemento de Card de Fragmento
function renderIdeaCard(idea) {
    const card = document.createElement('div');
    card.className = 'idea-card';
    const isAuthor = authenticatedUser && idea.authorId === authenticatedUser.id;
    const authorImgBadge = idea.authorAvatarUrl
        ? `<img class="card-author-avatar" src="${escapeHTML(idea.authorAvatarUrl)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`
        : '';
    card.innerHTML = `
        <div class="idea-header">
            <span class="idea-date">${idea.date}<span class="idea-author">${translate('by')} <button class="author-link" type="button" data-action="profile" data-profile-id="${idea.authorId}">${authorImgBadge}${escapeHTML(idea.authorName)}</button></span></span>
            <div class="entry-actions${isAuthor ? '' : ' hidden'}">
                <button class="entry-action" type="button" data-action="edit" data-idea-id="${idea.id}" aria-label="${translate('edit')} entrada">${translate('edit')}</button>
                <button class="entry-action delete-action" type="button" data-action="delete" data-idea-id="${idea.id}" aria-label="${translate('delete')} entrada">${translate('delete')}</button>
            </div>
        </div>
        <p class="idea-content">${escapeHTML(idea.content).replace(/\n/g, '<br>')}</p>
        <div class="idea-actions">
            <button class="vote-button${idea.userVote === 'up' ? ' selected' : ''}" type="button" data-action="upvote" data-idea-id="${idea.id}" aria-label="Dar upvote" title="Dar upvote"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg><span class="action-count">${idea.upvotes || 0}</span></button>
            <button class="vote-button${idea.userVote === 'down' ? ' selected' : ''}" type="button" data-action="downvote" data-idea-id="${idea.id}" aria-label="Dar downvote" title="Dar downvote"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m6-6-6 6-6-6" /></svg><span class="action-count">${idea.downvotes || 0}</span></button>
            <button class="favorite-button${idea.favorite ? ' selected' : ''}" type="button" data-action="favorite" data-idea-id="${idea.id}" aria-label="${idea.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" title="${idea.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg><span class="action-count">${idea.favoritesCount}</span></button>
        </div>
    `;
    return card;
}

// Busca Paginada de Fragmentos com Cache em Memoria
async function fetchEntriesPage(page = 0) {
    const filter = feedFilter?.value || 'newest';
    const cacheKey = getCacheKey(activeFeed, selectedProfileId, filter, page);
    const cached = getCachedData(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        let query;
        if (activeFeed === 'favorites') {
            if (!authenticatedUser) return [];
            query = supabaseClient
                .from('entries')
                .select(`
                    id,
                    content,
                    created_at,
                    author_id,
                    profiles:author_id (
                        id,
                        username,
                        display_name,
                        avatar_url
                    ),
                    votes (
                        user_id,
                        vote_type
                    ),
                    favorites!inner (
                        user_id
                    )
                `)
                .eq('favorites.user_id', authenticatedUser.id);
        } else {
            query = supabaseClient
                .from('entries')
                .select(`
                    id,
                    content,
                    created_at,
                    author_id,
                    profiles:author_id (
                        id,
                        username,
                        display_name,
                        avatar_url
                    ),
                    votes (
                        user_id,
                        vote_type
                    ),
                    favorites (
                        user_id
                    )
                `);

            if (activeFeed === 'mine') {
                if (!authenticatedUser) return [];
                query = query.eq('author_id', authenticatedUser.id);
            } else if (activeFeed === 'profile' && selectedProfileId) {
                query = query.eq('author_id', selectedProfileId);
            }
        }

        const isPublicVisitor = !authenticatedUser && activeFeed === 'global';
        if (isPublicVisitor) {
            query = query.limit(publicFeedLimit);
        } else {
            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            query = query.range(from, to);
        }

        query = query.order('created_at', { ascending: false });

        const { data: entries, error } = await query;
        if (error) {
            console.error('Error fetching entries page:', error);
            return null;
        }

        let formatted = (entries || []).map(formatIdeaEntry);

        if (filter === 'voted') {
            formatted.sort((a, b) => (b.upvotes + b.downvotes) - (a.upvotes + a.downvotes));
        } else if (filter === 'favorite') {
            formatted.sort((a, b) => b.favoritesCount - a.favoritesCount);
        }

        if (isPublicVisitor && formatted.length > publicFeedLimit) {
            formatted = formatted.slice(0, publicFeedLimit);
        }

        setCachedData(cacheKey, formatted);
        return formatted;
    } catch (err) {
        console.error('fetchEntriesPage exception:', err);
        return null;
    }
}

// Carregar e Exibir Fragmentos do Supabase
async function loadIdeas(reset = true) {
    if (reset) {
        currentPage = 0;
        hasMorePages = true;
        isFetchingPage = false;
        ideasList.innerHTML = '';
    }

    const isPublicVisitor = !authenticatedUser && activeFeed === 'global';

    // Exibir Hero de Boas-Vindas se for visitante nao logado
    if (visitorHero) {
        visitorHero.classList.toggle('hidden', !isPublicVisitor);
    }

    // Identificar Conta do Perfil se aplicavel
    let profileAccount = null;
    if (activeFeed === 'profile' && selectedProfileId) {
        if (authenticatedUser && authenticatedUser.id === selectedProfileId) {
            profileAccount = authenticatedUser;
        } else {
            const { data: prof } = await supabaseClient
                .from('profiles')
                .select('id, display_name, username, avatar_url')
                .eq('id', selectedProfileId)
                .maybeSingle();
            if (prof) profileAccount = { id: prof.id, name: prof.display_name || prof.username, avatar_url: prof.avatar_url };
        }
    }

    feedKicker.textContent = activeFeed === 'profile' ? translate('profile') : translate('publicCollection');
    feedTitle.textContent = activeFeed === 'profile'
        ? `${translate('fragments')} de ${profileAccount?.name || translate('profile')}`
        : activeFeed === 'favorites' ? translate('favoriteCollection') : translate('latestFragments');
    backToFeed.classList.toggle('hidden', activeFeed !== 'profile');

    // Renderizar Constelação dos 3 Favoritos se for página de perfil
    await renderProfileConstellation(selectedProfileId, profileAccount?.name);

    if (reset) {
        feedLoader?.classList.remove('hidden');
    }

    let firstPage = await fetchEntriesPage(0);
    feedLoader?.classList.add('hidden');

    if (firstPage === null) {
        ideasList.innerHTML = `<p class="empty-state">${translate('errorLoading')}</p>`;
        return;
    }

    if (isPublicVisitor && firstPage.length > publicFeedLimit) {
        firstPage = firstPage.slice(0, publicFeedLimit);
    }

    if (firstPage.length === 0) {
        ideasList.innerHTML = `<p class="empty-state">${translate('empty')}</p>`;
        ideasCount.textContent = '0';
        hasMorePages = false;
        unauthGateBanner?.classList.add('hidden');
        return;
    }

    ideasCount.textContent = firstPage.length;

    firstPage.forEach(idea => {
        ideasList.appendChild(renderIdeaCard(idea));
    });

    if (isPublicVisitor) {
        hasMorePages = false;
        unauthGateBanner?.classList.remove('hidden');
    } else {
        unauthGateBanner?.classList.add('hidden');
        if (firstPage.length < PAGE_SIZE) {
            hasMorePages = false;
        }
    }
}

// Carregar Proxima Pagina (Rolagem Infinita)
async function loadNextPage() {
    if (!authenticatedUser || !hasMorePages || isFetchingPage) return;
    isFetchingPage = true;
    currentPage++;

    feedLoader?.classList.remove('hidden');
    const nextPageEntries = await fetchEntriesPage(currentPage);
    feedLoader?.classList.add('hidden');

    if (!nextPageEntries || nextPageEntries.length === 0) {
        hasMorePages = false;
    } else {
        nextPageEntries.forEach(idea => {
            ideasList.appendChild(renderIdeaCard(idea));
        });
        if (nextPageEntries.length < PAGE_SIZE) {
            hasMorePages = false;
        }
        ideasCount.textContent = ideasList.children.length;
    }
    isFetchingPage = false;
}

// Renderizar a Constelação de 3 Favoritos no Perfil
async function renderProfileConstellation(profileId, profileAccountName) {
    if (!profileConstellation) return;

    if (activeFeed !== 'profile' || !profileId) {
        profileConstellation.classList.add('hidden');
        profileConstellation.innerHTML = '';
        return;
    }

    try {
        const { data: favEntries, error } = await supabaseClient
            .from('entries')
            .select(`
                id,
                content,
                created_at,
                author_id,
                profiles:author_id (
                    id,
                    username,
                    display_name,
                    avatar_url
                ),
                votes (
                    user_id,
                    vote_type
                ),
                favorites (
                    user_id
                ),
                favorites!inner (
                    user_id
                )
            `)
            .eq('favorites.user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) {
            console.error('Error fetching constellation favorites:', error);
            profileConstellation.classList.add('hidden');
            return;
        }

        const favs = favEntries || [];
        const romanNumerals = ['I', 'II', 'III'];
        const isOwnProfile = authenticatedUser && authenticatedUser.id === profileId;

        let cardsHtml = '';
        for (let i = 0; i < 3; i++) {
            const entry = favs[i];
            if (entry) {
                const authorName = entry.profiles?.display_name || entry.profiles?.username || 'Anônimo';
                const authorAvatar = entry.profiles?.avatar_url;
                const authorBadge = authorAvatar
                    ? `<img class="card-author-avatar" src="${escapeHTML(authorAvatar)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`
                    : '';
                cardsHtml += `
                    <div class="constellation-card">
                        <div class="constellation-card-header">
                            <span class="constellation-roman">${romanNumerals[i]}</span>
                            <span class="constellation-pill">✦ ${translate('pillar')}</span>
                        </div>
                        <p class="constellation-card-content">“${escapeHTML(entry.content)}”</p>
                        <div class="constellation-card-author">
                            <span>${translate('by')} <button class="author-link" type="button" data-action="profile" data-profile-id="${entry.author_id}">${authorBadge}${escapeHTML(authorName)}</button></span>
                        </div>
                    </div>
                `;
            } else {
                cardsHtml += `
                    <div class="constellation-empty-slot">
                        <span class="constellation-empty-icon">✦</span>
                        <h4 class="constellation-empty-title">${translate('emptyConstellationSlot')} ${romanNumerals[i]}</h4>
                        <p class="constellation-empty-desc">${isOwnProfile ? translate('emptyConstellationHelp') : translate('emptyConstellationOther')}</p>
                    </div>
                `;
            }
        }

        profileConstellation.innerHTML = `
            <div class="constellation-header">
                <div class="constellation-title-group">
                    <span class="constellation-icon">✦</span>
                    <div>
                        <h3 class="constellation-title">${translate('constellationTitle')}</h3>
                        <p class="constellation-subtitle">${translate('constellationSubtitle')}</p>
                    </div>
                </div>
                <span class="constellation-pill">${favs.length}/3 ${translate('pillars')}</span>
            </div>
            <div class="constellation-grid">
                ${cardsHtml}
            </div>
        `;
        profileConstellation.classList.remove('hidden');
    } catch (err) {
        console.error('renderProfileConstellation error:', err);
        profileConstellation.classList.add('hidden');
    }
}

// Capacidade de Favoritos por Gamificação e Progressão
function getMaxFavorites(entryCount = 0) {
    if (entryCount >= 50) return 15;
    if (entryCount >= 25) return 10;
    if (entryCount >= 10) return 7;
    if (entryCount >= 3) return 5;
    return 3;
}

function getNextFavoriteMilestoneInfo(entryCount = 0) {
    if (entryCount < 3) {
        const remaining = 3 - entryCount;
        return `Limite de 3 favoritos atingido. Publique mais ${remaining} ${remaining === 1 ? 'fragmento' : 'fragmentos'} para desbloquear 5 slots!`;
    }
    if (entryCount < 10) {
        const remaining = 10 - entryCount;
        return `Limite de 5 favoritos atingido. Publique mais ${remaining} ${remaining === 1 ? 'fragmento' : 'fragmentos'} para desbloquear 7 slots!`;
    }
    if (entryCount < 25) {
        const remaining = 25 - entryCount;
        return `Limite de 7 favoritos atingido. Publique mais ${remaining} ${remaining === 1 ? 'fragmento' : 'fragmentos'} para desbloquear 10 slots!`;
    }
    if (entryCount < 50) {
        const remaining = 50 - entryCount;
        return `Limite de 10 favoritos atingido. Publique mais ${remaining} ${remaining === 1 ? 'fragmento' : 'fragmentos'} para desbloquear 15 slots!`;
    }
    return 'Limite máximo de 15 favoritos atingido. Você é um mestre da Gnoteca!';
}

// Atualizar Estatísticas de Perfil
async function updateProfileStats() {
    if (!authenticatedUser) {
        ideasCount.textContent = '0';
        favoritesCount.textContent = '0/3';
        return;
    }
    try {
        const [entriesRes, favsRes] = await Promise.all([
            supabaseClient
                .from('entries')
                .select('id', { count: 'exact', head: true })
                .eq('author_id', authenticatedUser.id),
            supabaseClient
                .from('favorites')
                .select('entry_id', { count: 'exact', head: true })
                .eq('user_id', authenticatedUser.id)
        ]);

        const entriesTotal = entriesRes.count !== null ? entriesRes.count : 0;
        const favsTotal = favsRes.count !== null ? favsRes.count : 0;
        const maxFavs = getMaxFavorites(entriesTotal);

        ideasCount.textContent = String(entriesTotal);
        favoritesCount.textContent = `${favsTotal}/${maxFavs}`;
    } catch (err) {
        console.error('updateProfileStats error:', err);
    }
}

function showActionFeedback(message) {
    actionFeedback.textContent = message;
    actionFeedback.classList.remove('hidden');
    setTimeout(() => actionFeedback.classList.add('hidden'), 3000);
}

// Interações no Feed (Votos, Favoritos, Edição, Deleção)
ideasList.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    if (button.dataset.action === 'profile') {
        showProfile(button.dataset.profileId);
        return;
    }

    const ideaId = Number(button.dataset.ideaId);
    const action = button.dataset.action;

    if (!authenticatedUser && ['upvote', 'downvote', 'favorite', 'edit', 'delete', 'save-edit'].includes(action)) {
        showAuthGate();
        return;
    }

    if (action === 'edit') {
        const card = button.closest('.idea-card');
        const contentEl = card.querySelector('.idea-content');
        const rawContent = contentEl.innerText || contentEl.textContent;
        enterEditMode(card, { id: ideaId, content: rawContent });
        return;
    }

    if (action === 'cancel-edit') {
        await loadIdeas();
        return;
    }

    if (action === 'save-edit') {
        const card = button.closest('.idea-card');
        const editField = card.querySelector('.idea-edit-field');
        const trimmedContent = editField.value.trim();
        if (!trimmedContent) {
            showActionFeedback(translate('emptyEntry'));
            editField.focus();
            return;
        }

        button.disabled = true;
        try {
            const { error } = await supabaseClient
                .from('entries')
                .update({ content: trimmedContent })
                .eq('id', ideaId)
                .eq('author_id', authenticatedUser.id);

            if (error) {
                showActionFeedback(error.message || translate('errorSaving'));
                button.disabled = false;
                return;
            }

            invalidateCache();
            await loadIdeas();
        } catch (err) {
            console.error('save-edit error:', err);
            showActionFeedback(translate('errorSaving'));
        } finally {
            button.disabled = false;
        }
        return;
    }

    if (action === 'delete') {
        openDeleteDialog(ideaId, button.closest('.idea-card'));
        return;
    }

    if (action === 'upvote' || action === 'downvote') {
        const targetType = action === 'upvote' ? 'up' : 'down';
        const isCurrentlySelected = button.classList.contains('selected');
        const card = button.closest('.idea-card');
        const hasOtherVoteSelected = card.querySelector(`.vote-button.selected:not([data-action="${action}"])`);

        button.disabled = true;
        try {
            if (isCurrentlySelected) {
                // Remover voto existente (não consome novo slot diário)
                const { error } = await supabaseClient
                    .from('votes')
                    .delete()
                    .eq('entry_id', ideaId)
                    .eq('user_id', authenticatedUser.id);
                if (error) throw error;
            } else {
                // Se NÃO está apenas alternando um voto já existente nesta mesma entrada, verifica o limite de 5 votos por dia
                if (!hasOtherVoteSelected) {
                    const startOfDay = new Date();
                    startOfDay.setHours(0, 0, 0, 0);
                    const { count: dailyVotesCount, error: countErr } = await supabaseClient
                        .from('votes')
                        .select('entry_id', { count: 'exact', head: true })
                        .eq('user_id', authenticatedUser.id)
                        .gte('created_at', startOfDay.toISOString());

                    if (countErr) console.warn('Count daily votes warning:', countErr);
                    if (dailyVotesCount !== null && dailyVotesCount >= 5) {
                        showActionFeedback(translate('voteLimitReached'));
                        button.disabled = false;
                        return;
                    }
                }

                // Adicionar ou alternar voto
                const { error } = await supabaseClient
                    .from('votes')
                    .upsert({
                        entry_id: ideaId,
                        user_id: authenticatedUser.id,
                        vote_type: targetType
                    });
                if (error) throw error;
            }
            invalidateCache();
            await loadIdeas();
        } catch (err) {
            console.error('Vote error:', err);
            showActionFeedback(err.message || 'Erro ao registrar voto.');
        } finally {
            button.disabled = false;
        }
        return;
    }

    if (action === 'favorite') {
        const isCurrentlyFavorite = button.classList.contains('selected');
        button.disabled = true;
        try {
            if (isCurrentlyFavorite) {
                const { error } = await supabaseClient
                    .from('favorites')
                    .delete()
                    .eq('entry_id', ideaId)
                    .eq('user_id', authenticatedUser.id);
                if (error) throw error;
            } else {
                // Verifica limite dinâmico de favoritos por progressão
                const [{ count: entryCount }, { count: favCount }] = await Promise.all([
                    supabaseClient
                        .from('entries')
                        .select('id', { count: 'exact', head: true })
                        .eq('author_id', authenticatedUser.id),
                    supabaseClient
                        .from('favorites')
                        .select('entry_id', { count: 'exact', head: true })
                        .eq('user_id', authenticatedUser.id)
                ]);

                const maxAllowed = getMaxFavorites(entryCount || 0);
                if (favCount !== null && favCount >= maxAllowed) {
                    showActionFeedback(getNextFavoriteMilestoneInfo(entryCount || 0));
                    button.disabled = false;
                    return;
                }

                const { error } = await supabaseClient
                    .from('favorites')
                    .insert({
                        entry_id: ideaId,
                        user_id: authenticatedUser.id
                    });
                if (error) throw error;
            }
            invalidateCache();
            await loadIdeas();
            await updateProfileStats();
        } catch (err) {
            console.error('Favorite error:', err);
            showActionFeedback(err.message || 'Erro ao atualizar favoritos.');
        } finally {
            button.disabled = false;
        }
        return;
    }
});

function enterEditMode(card, idea) {
    const content = card.querySelector('.idea-content');
    const editButton = card.querySelector('[data-action="edit"]');
    const deleteButton = card.querySelector('[data-action="delete"]');
    const actions = card.querySelector('.idea-actions');

    const editField = document.createElement('textarea');
    editField.className = 'idea-edit-field';
    editField.maxLength = maxLength;
    editField.value = idea.content;
    content.replaceWith(editField);

    editButton.dataset.action = 'save-edit';
    editButton.textContent = translate('save');
    editButton.setAttribute('aria-label', `${translate('save')} ${translate('edit').toLowerCase()}`);
    deleteButton.dataset.action = 'cancel-edit';
    deleteButton.textContent = translate('cancel');
    deleteButton.classList.remove('delete-action');
    deleteButton.setAttribute('aria-label', `${translate('cancel')} ${translate('edit').toLowerCase()}`);
    actions.classList.add('editing-actions');
    editField.focus();
}

// Banners e Botoes de Acesso para Visitantes
gateBannerAuth?.addEventListener('click', () => {
    showAuthGate();
});

gateBannerGoogle?.addEventListener('click', () => {
    handleGoogleSignIn();
});

// Observador de Rolagem Infinita para Usuarios Autenticados
if (feedSentinel && 'IntersectionObserver' in window) {
    const infiniteScrollObserver = new IntersectionObserver(entries => {
        const [entry] = entries;
        if (entry.isIntersecting) {
            if (authenticatedUser && hasMorePages && !isFetchingPage) {
                loadNextPage();
            }
        }
    }, { rootMargin: '250px' });

    infiniteScrollObserver.observe(feedSentinel);
}

// Botao Voltar ao Topo Flutuante
window.addEventListener('scroll', () => {
    if (btnBackToTop) {
        if (window.scrollY > 400) {
            btnBackToTop.classList.remove('hidden');
        } else {
            btnBackToTop.classList.add('hidden');
        }
    }
}, { passive: true });

btnBackToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ==========================================
// Edição de Perfil e Progressão de Títulos
// ==========================================

function closeProfileEditDialog() {
    editProfileDialog?.classList.add('hidden');
    editNameSection?.classList.add('hidden');
    editAvatarSection?.classList.add('hidden');
    editTitleSection?.classList.add('hidden');
    if(editProfileFeedback) editProfileFeedback.textContent = '';
}

closeEditDialog?.addEventListener('click', closeProfileEditDialog);

btnEditName?.addEventListener('click', () => {
    if (!authenticatedUser) return;
    inputEditName.value = authenticatedUser.name;
    editNameSection.classList.remove('hidden');
    editAvatarSection.classList.add('hidden');
    editTitleSection.classList.add('hidden');
    editProfileDialog.classList.remove('hidden');
    btnSaveProfile.dataset.mode = 'name';
});

btnEditAvatar?.addEventListener('click', () => {
    if (!authenticatedUser) return;
    inputEditAvatar.value = authenticatedUser.avatar_url || '';
    editAvatarSection.classList.remove('hidden');
    editNameSection.classList.add('hidden');
    editTitleSection.classList.add('hidden');
    editProfileDialog.classList.remove('hidden');
    btnSaveProfile.dataset.mode = 'avatar';
});

btnSelectTitle?.addEventListener('click', async () => {
    if (!authenticatedUser) return;
    editTitleSection.classList.remove('hidden');
    editNameSection.classList.add('hidden');
    editAvatarSection.classList.add('hidden');
    editProfileDialog.classList.remove('hidden');
    btnSaveProfile.dataset.mode = 'title';
    selectEditTitle.innerHTML = '<option>Carregando...</option>';
    
    // Obter estatísticas do usuário (usando os valores carregados na sidebar)
    let fragments = parseInt(ideasCount.textContent) || 0;
    let favoritesStr = favoritesCount.textContent || "0";
    let favorites = parseInt(favoritesStr.split('/')[0]) || 0;
    
    let unlocked = ['Explorador de Conhecimento'];
    if (fragments >= 3) unlocked.push('Curador de Ideias');
    if (fragments >= 10 && favorites >= 1) unlocked.push('Arquiteto do Saber');
    if (fragments >= 20) unlocked.push('Luz da Gnoteca');
    
    selectEditTitle.innerHTML = '';
    unlocked.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        if (t === authenticatedUser.title) opt.selected = true;
        selectEditTitle.appendChild(opt);
    });
});

btnSaveProfile?.addEventListener('click', async () => {
    if (!authenticatedUser) return;
    btnSaveProfile.disabled = true;
    editProfileFeedback.textContent = 'Salvando...';
    editProfileFeedback.style.color = 'var(--muted-color)';
    
    const mode = btnSaveProfile.dataset.mode;
    try {
        let updateData = {};
        
        if (mode === 'name') {
            let val = inputEditName.value.trim();
            if (!val) {
                throw new Error("O nome não pode ficar vazio.");
            }
            updateData.display_name = val;
        } else if (mode === 'avatar') {
            updateData.avatar_url = inputEditAvatar.value.trim();
        } else if (mode === 'title') {
            updateData.current_title = selectEditTitle.value;
        }

        const { error } = await supabaseClient.from('profiles').update(updateData).eq('id', authenticatedUser.id);
        if (error) {
            if (error.code === '23505') throw new Error("Este arroba (@) já está em uso.");
            throw error;
        }

        editProfileFeedback.textContent = 'Salvo com sucesso!';
        editProfileFeedback.style.color = 'var(--accent-color)';
        
        // Atualizar estado em memoria rapidamente sem recarregar a tela inteira se puder
        if (mode === 'name') authenticatedUser.name = updateData.display_name;
        if (mode === 'avatar') authenticatedUser.avatar_url = updateData.avatar_url;
        if (mode === 'title') authenticatedUser.title = updateData.current_title;
        
        setTimeout(async () => {
            closeProfileEditDialog();
            await refreshAuthState(); 
        }, 1000);
    } catch (e) {
        editProfileFeedback.textContent = e.message || 'Erro ao salvar.';
        editProfileFeedback.style.color = 'var(--danger-color)';
    } finally {
        btnSaveProfile.disabled = false;
    }
});

statFragments?.addEventListener('click', () => {
    if (authenticatedUser && authenticatedUser.username) {
        window.location.hash = '#/' + authenticatedUser.username;
        toggleSidebar(false);
    }
});

statFavorites?.addEventListener('click', () => {
    if (authenticatedUser) {
        toggleSidebar(false);
        showFeed('favorites');
    }
});

// Inicialização
async function initApp() {
    applyLanguage(currentLanguage);
    await refreshAuthState();
    await loadRouteFromUrl();
}

initApp();