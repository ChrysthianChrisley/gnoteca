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
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
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
const accountSelect = document.getElementById('account-select');
const newAccountName = document.getElementById('new-account-name');
const createAccount = document.getElementById('create-account');
const accountFeedback = document.getElementById('account-feedback');
const profileName = document.getElementById('profile-name');
const profileAvatars = document.querySelectorAll('[data-profile-avatar]');
const feedFilter = document.getElementById('feed-filter');
const feedTitle = document.getElementById('feed-title');
const feedKicker = document.getElementById('feed-kicker');
const backToFeed = document.getElementById('back-to-feed');
const overviewMenu = document.getElementById('overview-menu');
const favoritesMenu = document.getElementById('favorites-menu');
const languageOptions = document.querySelectorAll('[data-language]');
const authStatus = document.getElementById('auth-status');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const emailSignIn = document.getElementById('email-sign-in');
const emailSignUp = document.getElementById('email-sign-up');
const googleSignIn = document.getElementById('google-sign-in');
const signOut = document.getElementById('sign-out');

const charCounter = document.getElementById('char-counter');
const maxLength = 280;
let pendingDeleteId = null;
let activeFeed = 'global';
let selectedProfileId = null;
const projectBasePath = window.location.pathname.startsWith('/gnoteca') ? '/gnoteca' : '';
const defaultAccounts = [
    { id: 'account-1', name: 'Chrysthian', createdAt: 0 },
    { id: 'account-2', name: 'Conta de teste', createdAt: 0 }
];

const supabaseUrl = 'https://vavitcyykwqqmjqkhyna.supabase.co';
const supabasePublishableKey = 'sb_publishable_5hBpKXPuMB0HmAuyww6WcA_I7C55xwa';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabasePublishableKey);

function showAuthMessage(message) {
    authStatus.textContent = message;
}

async function refreshAuthState() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const authenticated = Boolean(user);
    authStatus.textContent = authenticated ? user.email : 'Modo local';
    emailSignIn.classList.toggle('hidden', authenticated);
    emailSignUp.classList.toggle('hidden', authenticated);
    googleSignIn.classList.toggle('hidden', authenticated);
    authEmail.classList.toggle('hidden', authenticated);
    authPassword.classList.toggle('hidden', authenticated);
    signOut.classList.toggle('hidden', !authenticated);
}

emailSignIn.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithPassword({ email: authEmail.value.trim(), password: authPassword.value });
    showAuthMessage(error ? error.message : 'Login realizado');
    if (!error) await refreshAuthState();
});

emailSignUp.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signUp({ email: authEmail.value.trim(), password: authPassword.value });
    showAuthMessage(error ? error.message : 'Confirme seu e-mail para continuar');
});

googleSignIn.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
    if (error) showAuthMessage(error.message);
});

signOut.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    await refreshAuthState();
});

supabaseClient.auth.onAuthStateChange(() => refreshAuthState());
refreshAuthState();

const translations = {
    'pt-BR': {
        profileTitle: 'Meu perfil', profileSubtitle: 'colecionador de ideias', testAccount: 'Conta de teste', add: 'Adicionar',
        fragments: 'fragmentos', favorites: 'favoritos', overview: 'Visão geral', settings: 'Configurações', signOut: 'Sair da conta',
        language: 'Idioma', removeEntry: 'Remover entrada', deleteQuestion: 'Apagar este fragmento?', deleteWarning: 'Essa ação não poderá ser desfeita.',
        cancel: 'Cancelar', delete: 'Apagar', ideaPlaceholder: 'O que quer registrar?', backToFeed: 'Voltar ao acervo', publicCollection: 'Acervo público',
        latestFragments: 'Últimos fragmentos', sortBy: 'Ordenar por', newest: 'Mais novas', mostVoted: 'Mais votadas', mostFavorited: 'Mais favoritas',
        nightMode: 'Modo noturno', lightMode: 'Modo claro', profile: 'Perfil', favoriteCollection: 'Meus favoritos', empty: 'Nenhum fragmento salvo ainda. Comece a escrever!',
        authorOnly: 'Apenas o autor pode alterar esta entrada.', emptyEntry: 'A entrada não pode ficar vazia.'
    },
    'en-US': {
        profileTitle: 'My profile', profileSubtitle: 'idea collector', testAccount: 'Test account', add: 'Add', fragments: 'fragments', favorites: 'favorites',
        overview: 'Overview', settings: 'Settings', signOut: 'Sign out', language: 'Language', removeEntry: 'Remove entry', deleteQuestion: 'Delete this fragment?',
        deleteWarning: 'This action cannot be undone.', cancel: 'Cancel', delete: 'Delete', ideaPlaceholder: 'What would you like to record?', backToFeed: 'Back to collection',
        publicCollection: 'Public collection', latestFragments: 'Latest fragments', sortBy: 'Sort by', newest: 'Newest', mostVoted: 'Most voted', mostFavorited: 'Most favorited',
        nightMode: 'Dark mode', lightMode: 'Light mode', profile: 'Profile', favoriteCollection: 'My favorites', empty: 'No fragments saved yet. Start writing!',
        authorOnly: 'Only the author can change this entry.', emptyEntry: 'The entry cannot be empty.'
    },
    'es-ES': {
        profileTitle: 'Mi perfil', profileSubtitle: 'coleccionista de ideas', testAccount: 'Cuenta de prueba', add: 'Añadir', fragments: 'fragmentos', favorites: 'favoritos',
        overview: 'Vista general', settings: 'Configuración', signOut: 'Cerrar sesión', language: 'Idioma', removeEntry: 'Eliminar entrada', deleteQuestion: '¿Eliminar este fragmento?',
        deleteWarning: 'Esta acción no se puede deshacer.', cancel: 'Cancelar', delete: 'Eliminar', ideaPlaceholder: '¿Qué quieres registrar?', backToFeed: 'Volver al acervo',
        publicCollection: 'Acervo público', latestFragments: 'Últimos fragmentos', sortBy: 'Ordenar por', newest: 'Más nuevos', mostVoted: 'Más votados', mostFavorited: 'Más favoritos',
        nightMode: 'Modo nocturno', lightMode: 'Modo claro', profile: 'Perfil', favoriteCollection: 'Mis favoritos', empty: 'Aún no hay fragmentos guardados. ¡Empieza a escribir!',
        authorOnly: 'Solo el autor puede modificar esta entrada.', emptyEntry: 'La entrada no puede estar vacía.'
    }
};

let currentLanguage = localStorage.getItem('gnoteca_language') || 'pt-BR';

function translate(key) {
    return translations[currentLanguage][key] || translations['pt-BR'][key] || key;
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

languageOptions.forEach(option => option.addEventListener('click', event => {
    event.preventDefault();
    applyLanguage(option.dataset.language);
    window.history.pushState({ language: option.dataset.language }, '', `${projectBasePath}${option.getAttribute('href')}`);
}));

function slugify(name) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function getAccountBySlug(slug) {
    return getAccounts().find(account => slugify(account.name) === slug);
}

function getProfilePath(account) {
    return `${projectBasePath}/${slugify(account.name)}`;
}

function getHomePath() {
    return `${projectBasePath}/`;
}

function getAccounts() {
    const accounts = JSON.parse(localStorage.getItem('gnoteca_accounts'));
    if (accounts && accounts.length) {
        const primaryAccount = accounts.find(account => account.id === 'account-1');
        if (primaryAccount && primaryAccount.name === 'Você') {
            primaryAccount.name = 'Chrysthian';
            localStorage.setItem('gnoteca_accounts', JSON.stringify(accounts));
        }
        return accounts;
    }
    localStorage.setItem('gnoteca_accounts', JSON.stringify(defaultAccounts));
    return defaultAccounts;
}

function getCurrentAccount() {
    const accounts = getAccounts();
    const currentId = localStorage.getItem('gnoteca_current_account') || accounts[0].id;
    return accounts.find(account => account.id === currentId) || accounts[0];
}

function migrateAuthorsOnce() {
    const accounts = getAccounts();
    const ideas = JSON.parse(localStorage.getItem('gnoteca_ideas')) || [];
    const originalAccount = accounts[0];
    let changed = false;

    ideas.forEach(idea => {
        const authorAccount = accounts.find(account => account.id === idea.authorId);
        const isLegacyAssignment = authorAccount?.createdAt && idea.id < authorAccount.createdAt;
        if (!idea.authorId || isLegacyAssignment) {
            idea.authorId = originalAccount.id;
            idea.authorName = originalAccount.name;
            changed = true;
        }
    });

    if (changed) localStorage.setItem('gnoteca_ideas', JSON.stringify(ideas));
}

migrateAuthorsOnce();

function populateAccounts() {
    const currentAccount = getCurrentAccount();
    accountSelect.innerHTML = getAccounts().map(account =>
        `<option value="${account.id}">${account.name}</option>`
    ).join('');
    accountSelect.value = currentAccount.id;
    profileName.textContent = currentAccount.name;
    profileAvatars.forEach(avatar => {
        avatar.textContent = currentAccount.name.charAt(0).toUpperCase();
    });
}

populateAccounts();
accountSelect.addEventListener('change', () => {
    localStorage.setItem('gnoteca_current_account', accountSelect.value);
    populateAccounts();
    loadIdeas();
    updateProfileStats();
});

createAccount.addEventListener('click', () => {
    const name = newAccountName.value.trim();
    if (!name) return;
    const accounts = getAccounts();
    if (accounts.some(account => slugify(account.name) === slugify(name))) {
        accountFeedback.textContent = currentLanguage === 'en-US'
            ? 'This profile already exists.'
            : currentLanguage === 'es-ES' ? 'Este perfil ya existe.' : 'Esse perfil já existe.';
        accountFeedback.classList.remove('hidden');
        return;
    }
    const account = { id: `account-${Date.now()}`, name, createdAt: Date.now() };
    accounts.push(account);
    localStorage.setItem('gnoteca_accounts', JSON.stringify(accounts));
    localStorage.setItem('gnoteca_current_account', account.id);
    newAccountName.value = '';
    accountFeedback.classList.add('hidden');
    populateAccounts();
    loadIdeas();
    updateProfileStats();
});

loadIdeas();
updateProfileStats();

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

applyLanguage(currentLanguage);

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

confirmDelete.addEventListener('click', () => {
    if (pendingDeleteId === null) return;
    const savedIdeas = JSON.parse(localStorage.getItem('gnoteca_ideas')) || [];
    const remainingIdeas = savedIdeas.filter(idea => idea.id !== pendingDeleteId);
    localStorage.setItem('gnoteca_ideas', JSON.stringify(remainingIdeas));
    closeDeleteDialog();
    loadIdeas();
    updateProfileStats();
});

function toggleSidebar(isOpen) {
    profileSidebar.classList.toggle('open', isOpen);
    sidebarOverlay.classList.toggle('hidden', !isOpen);
    profileSidebar.setAttribute('aria-hidden', String(!isOpen));
    btnProfile.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
        updateProfileStats();
    }
}

function showFeed(feedType) {
    activeFeed = feedType;
    selectedProfileId = null;
    window.history.pushState({ feedType }, '', getHomePath());
    writeSection.classList.add('hidden');
    readSection.classList.remove('hidden');
    btnWrite.classList.remove('active');
    btnRead.classList.toggle('active', feedType === 'mine');
    loadIdeas();
}

function showProfile(profileId) {
    const account = getAccounts().find(item => item.id === profileId);
    if (!account) return;
    activeFeed = 'profile';
    selectedProfileId = profileId;
    window.history.pushState({ feedType: 'profile', profileId }, '', getProfilePath(account));
    writeSection.classList.add('hidden');
    readSection.classList.remove('hidden');
    btnWrite.classList.remove('active');
    btnRead.classList.remove('active');
    loadIdeas();
}

function loadRouteFromUrl() {
    const pathWithoutBase = window.location.pathname.slice(projectBasePath.length);
    const slug = pathWithoutBase.split('/').filter(Boolean)[0];
    const account = slug ? getAccountBySlug(slug) : null;

    if (account) {
        activeFeed = 'profile';
        selectedProfileId = account.id;
        writeSection.classList.add('hidden');
        readSection.classList.remove('hidden');
        btnWrite.classList.remove('active');
        btnRead.classList.remove('active');
    } else if (slug) {
        window.history.replaceState({ feedType: 'global' }, '', getHomePath());
        activeFeed = 'global';
        selectedProfileId = null;
    }

    loadIdeas();
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
feedFilter.addEventListener('change', loadIdeas);
backToFeed.addEventListener('click', () => showFeed('global'));
window.addEventListener('popstate', () => loadRouteFromUrl());

ideaInput.addEventListener('input', () => {
    const currentLength = ideaInput.value.length;
    charCounter.textContent = `${currentLength} / ${maxLength}`;
    
    // Muda a cor para vermelho se chegar no limite
    charCounter.classList.toggle('limit-reached', currentLength >= maxLength);
});

// Navegação (Alternar entre Escrever e Ler)
btnWrite.addEventListener('click', () => {
    writeSection.classList.remove('hidden');
    readSection.classList.add('hidden');
    btnWrite.classList.add('active');
    btnRead.classList.remove('active');
});

btnRead.addEventListener('click', () => {
    showFeed('mine');
});

loadRouteFromUrl();

// Salvar a Ideia
btnSave.addEventListener('click', () => {
    const text = ideaInput.value.trim();
    if (!text) return; // Não salva se estiver vazio

    // Cria o objeto da ideia
    const newIdea = {
        id: Date.now(),
        content: text,
        authorId: getCurrentAccount().id,
        authorName: getCurrentAccount().name,
        upvotes: 0,
        downvotes: 0,
        userVote: null,
        favorite: false,
        favoritesByAccount: {},
        date: new Date().toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit'
        })
    };

    // Busca ideias antigas ou cria um array vazio
    const savedIdeas = JSON.parse(localStorage.getItem('gnoteca_ideas')) || [];
    
    // Adiciona a nova ideia no topo da lista
    savedIdeas.unshift(newIdea);

    // Salva no LocalStorage (FUTURO: Aqui enviaremos para o Firebase/Firestore)
    localStorage.setItem('gnoteca_ideas', JSON.stringify(savedIdeas));

    // Limpa o campo e dá feedback
    ideaInput.value = '';
    feedbackMsg.classList.remove('hidden');
    setTimeout(() => {
        feedbackMsg.classList.add('hidden');
    }, 2000);
});

// Carregar e exibir as Ideias
function loadIdeas() {
    ideasList.innerHTML = ''; // Limpa a lista atual
    const currentAccount = getCurrentAccount();
    const allIdeas = JSON.parse(localStorage.getItem('gnoteca_ideas')) || [];
    allIdeas.forEach(idea => {
        idea.authorId = idea.authorId || defaultAccounts[0].id;
        idea.authorName = idea.authorId === defaultAccounts[0].id
            ? defaultAccounts[0].name
            : (idea.authorName || defaultAccounts[0].name);
        idea.votesByAccount = idea.votesByAccount || {};
        idea.favoritesByAccount = idea.favoritesByAccount || {};
        if (idea.userVote && !idea.votesByAccount[currentAccount.id]) {
            idea.votesByAccount[currentAccount.id] = idea.userVote;
        }
        if (idea.favorite && !idea.favoritesByAccount[currentAccount.id]) {
            idea.favoritesByAccount[currentAccount.id] = true;
        }
        delete idea.userVote;
        delete idea.favorite;
    });
    localStorage.setItem('gnoteca_ideas', JSON.stringify(allIdeas));
    let savedIdeas = activeFeed === 'mine'
        ? allIdeas.filter(idea => idea.authorId === currentAccount.id)
        : activeFeed === 'profile'
            ? allIdeas.filter(idea => idea.authorId === selectedProfileId)
        : activeFeed === 'favorites'
            ? allIdeas.filter(idea => idea.favoritesByAccount[currentAccount.id])
            : allIdeas;
    const profileAccount = getAccounts().find(account => account.id === selectedProfileId);
    feedKicker.textContent = activeFeed === 'profile' ? translate('profile') : translate('publicCollection');
    feedTitle.textContent = activeFeed === 'profile'
        ? `${translate('fragments')} de ${profileAccount?.name || translate('profile')}`
        : activeFeed === 'favorites' ? translate('favoriteCollection') : translate('latestFragments');
    backToFeed.classList.toggle('hidden', activeFeed !== 'profile');
    const filter = feedFilter.value;
    savedIdeas = [...savedIdeas].sort((firstIdea, secondIdea) => {
        if (filter === 'voted') {
            return (secondIdea.upvotes || 0) + (secondIdea.downvotes || 0) - ((firstIdea.upvotes || 0) + (firstIdea.downvotes || 0));
        }
        if (filter === 'favorite') {
            return favoriteCount(secondIdea) - favoriteCount(firstIdea) || secondIdea.id - firstIdea.id;
        }
        return secondIdea.id - firstIdea.id;
    });

    if (savedIdeas.length === 0) {
        ideasList.innerHTML = `<p class="empty-state">${translate('empty')}</p>`;
        ideasCount.textContent = '0';
        return;
    }

    ideasCount.textContent = savedIdeas.length;

    // Renderiza cada ideia na tela
    savedIdeas.forEach(idea => {
        const card = document.createElement('div');
        card.className = 'idea-card';
        const userVote = idea.votesByAccount[currentAccount.id] || null;
        const favorite = Boolean(idea.favoritesByAccount[currentAccount.id]);
        const isAuthor = idea.authorId === currentAccount.id;
        card.innerHTML = `
            <div class="idea-header">
                <span class="idea-date">${idea.date}<span class="idea-author">por <button class="author-link" type="button" data-action="profile" data-profile-id="${idea.authorId}">${idea.authorName}</button></span></span>
                <div class="entry-actions${isAuthor ? '' : ' hidden'}">
                    <button class="entry-action" type="button" data-action="edit" data-idea-id="${idea.id}" aria-label="Editar entrada">Editar</button>
                    <button class="entry-action delete-action" type="button" data-action="delete" data-idea-id="${idea.id}" aria-label="Apagar entrada">Apagar</button>
                </div>
            </div>
            <p class="idea-content">${idea.content.replace(/\n/g, '<br>')}</p>
            <div class="idea-actions">
                <button class="vote-button${userVote === 'up' ? ' selected' : ''}" type="button" data-action="upvote" data-idea-id="${idea.id}" aria-label="Dar upvote" title="Dar upvote"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg><span class="action-count">${idea.upvotes || 0}</span></button>
                <button class="vote-button${userVote === 'down' ? ' selected' : ''}" type="button" data-action="downvote" data-idea-id="${idea.id}" aria-label="Dar downvote" title="Dar downvote"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m6-6-6 6-6-6" /></svg><span class="action-count">${idea.downvotes || 0}</span></button>
                <button class="favorite-button${favorite ? ' selected' : ''}" type="button" data-action="favorite" data-idea-id="${idea.id}" aria-label="${favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" title="${favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg><span class="action-count">${favoriteCount(idea)}</span></button>
            </div>
        `;
        ideasList.appendChild(card);
    });
}

    function getDailyUsage() {
        const today = new Date().toISOString().slice(0, 10);
        const storedUsage = JSON.parse(localStorage.getItem('gnoteca_daily_usage')) || {};

        if (storedUsage.date !== today) {
            return { date: today, votes: 0, favorites: 0 };
        }

        return storedUsage;
    }

    function saveDailyUsage(usage) {
        localStorage.setItem('gnoteca_daily_usage', JSON.stringify(usage));
    }

    function favoriteCount(idea) {
        return Object.values(idea.favoritesByAccount || {}).filter(Boolean).length;
    }

    function updateProfileStats() {
        const savedIdeas = JSON.parse(localStorage.getItem('gnoteca_ideas')) || [];
        const currentAccount = getCurrentAccount();
        ideasCount.textContent = savedIdeas.length;
        favoritesCount.textContent = savedIdeas.filter(idea => idea.favoritesByAccount?.[currentAccount.id]).length;
    }

    function showActionFeedback(message) {
        actionFeedback.textContent = message;
        actionFeedback.classList.remove('hidden');
        setTimeout(() => actionFeedback.classList.add('hidden'), 3000);
    }

    ideasList.addEventListener('click', event => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        if (button.dataset.action === 'profile') {
            showProfile(button.dataset.profileId);
            return;
        }

        const ideaId = Number(button.dataset.ideaId);
        const action = button.dataset.action;
        const currentAccount = getCurrentAccount();
        const savedIdeas = JSON.parse(localStorage.getItem('gnoteca_ideas')) || [];
        const idea = savedIdeas.find(savedIdea => savedIdea.id === ideaId);
        if (!idea) return;

        if ((action === 'edit' || action === 'delete' || action === 'save-edit') && idea.authorId !== currentAccount.id) {
            showActionFeedback('Apenas o autor pode alterar esta entrada.');
            return;
        }

        if (action === 'edit') {
            if (idea.authorId && idea.authorId !== currentAccount.id) {
                showActionFeedback('Apenas o autor pode editar esta entrada.');
                return;
            }
            enterEditMode(button.closest('.idea-card'), idea);
            return;
        } else if (action === 'save-edit') {
            const editField = button.closest('.idea-card').querySelector('.idea-edit-field');
            const trimmedContent = editField.value.trim();
            if (!trimmedContent) {
                showActionFeedback(translate('emptyEntry'));
                editField.focus();
                return;
            }
            idea.content = trimmedContent;
            idea.date = new Date().toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } else if (action === 'delete') {
            if (idea.authorId && idea.authorId !== currentAccount.id) {
                showActionFeedback('Apenas o autor pode apagar esta entrada.');
                return;
            }
            openDeleteDialog(ideaId, button.closest('.idea-card'));
            return;
        } else if (action === 'cancel-edit') {
            loadIdeas();
            return;
        } else {
            idea.upvotes = idea.upvotes || 0;
            idea.downvotes = idea.downvotes || 0;
            idea.favorite = Boolean(idea.favorite);
            idea.votesByAccount = idea.votesByAccount || {};
            idea.favoritesByAccount = idea.favoritesByAccount || {};
        }

        if (action === 'edit' || action === 'delete') {
            localStorage.setItem('gnoteca_ideas', JSON.stringify(savedIdeas));
            loadIdeas();
            updateProfileStats();
            return;
        } else if (action === 'favorite') {
            const isFavorite = Boolean(idea.favoritesByAccount[currentAccount.id]);
            idea.favoritesByAccount[currentAccount.id] = !isFavorite;
        } else {
            const nextVote = action === 'upvote' ? 'up' : 'down';
            idea.votesByAccount = idea.votesByAccount || {};
            const currentVote = idea.votesByAccount[currentAccount.id] || null;
            if (!currentVote) {
                idea.votesByAccount[currentAccount.id] = nextVote;
                idea[nextVote === 'up' ? 'upvotes' : 'downvotes'] += 1;
            } else if (currentVote !== nextVote) {
                idea[currentVote === 'up' ? 'upvotes' : 'downvotes'] -= 1;
                idea[nextVote === 'up' ? 'upvotes' : 'downvotes'] += 1;
                idea.votesByAccount[currentAccount.id] = nextVote;
            }
        }

        localStorage.setItem('gnoteca_ideas', JSON.stringify(savedIdeas));
        loadIdeas();
        updateProfileStats();
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
    editButton.textContent = 'Salvar';
    editButton.setAttribute('aria-label', 'Salvar edição');
    deleteButton.dataset.action = 'cancel-edit';
    deleteButton.textContent = 'Cancelar';
    deleteButton.classList.remove('delete-action');
    deleteButton.setAttribute('aria-label', 'Cancelar edição');
    actions.classList.add('editing-actions');
    editField.focus();
}