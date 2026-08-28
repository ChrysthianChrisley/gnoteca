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

const charCounter = document.getElementById('char-counter');
const maxLength = 280;
const maxDailyVotes = 5;
const maxDailyFavorites = 3;
let pendingDeleteId = null;

function setDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeLabel.textContent = isDark ? 'Modo claro' : 'Modo noturno';
    localStorage.setItem('gnoteca_dark_mode', String(isDark));
}

setDarkMode(localStorage.getItem('gnoteca_dark_mode') === 'true');
themeToggle.addEventListener('click', () => {
    setDarkMode(!document.body.classList.contains('dark-mode'));
});

function openDeleteDialog(ideaId, card) {
    pendingDeleteId = ideaId;
    const cardRect = card.getBoundingClientRect();
    const dialogWidth = Math.min(380, window.innerWidth - 32);
    const left = Math.min(cardRect.left, window.innerWidth - dialogWidth - 16);
    const top = cardRect.bottom + 8;

    deleteDialogCard.style.setProperty('--dialog-left', `${Math.max(16, left)}px`);
    deleteDialogCard.style.setProperty('--dialog-top', `${top}px`);
    deleteDialog.classList.remove('hidden');
    const dialogHeight = deleteDialogCard.offsetHeight;
    const adjustedTop = top + dialogHeight > window.innerHeight - 16
        ? cardRect.top - dialogHeight - 8
        : top;
    deleteDialogCard.style.setProperty('--dialog-top', `${Math.max(16, adjustedTop)}px`);
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

btnProfile.addEventListener('click', () => toggleSidebar(true));
btnCloseSidebar.addEventListener('click', () => toggleSidebar(false));
sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

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
    writeSection.classList.add('hidden');
    readSection.classList.remove('hidden');
    btnRead.classList.add('active');
    btnWrite.classList.remove('active');
    loadIdeas(); // Carrega as ideias sempre que a aba for aberta
});

// Salvar a Ideia
btnSave.addEventListener('click', () => {
    const text = ideaInput.value.trim();
    if (!text) return; // Não salva se estiver vazio

    // Cria o objeto da ideia
    const newIdea = {
        id: Date.now(),
        content: text,
        upvotes: 0,
        downvotes: 0,
        userVote: null,
        favorite: false,
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
    const savedIdeas = JSON.parse(localStorage.getItem('gnoteca_ideas')) || [];

    if (savedIdeas.length === 0) {
        ideasList.innerHTML = '<p class="empty-state">Nenhum fragmento salvo ainda. Comece a escrever!</p>';
        ideasCount.textContent = '0';
        return;
    }

    ideasCount.textContent = savedIdeas.length;

    // Renderiza cada ideia na tela
    savedIdeas.forEach(idea => {
        const card = document.createElement('div');
        card.className = 'idea-card';
        const userVote = idea.userVote || null;
        const favorite = Boolean(idea.favorite);
        card.innerHTML = `
            <div class="idea-header">
                <span class="idea-date">${idea.date}</span>
                <div class="entry-actions">
                    <button class="entry-action" type="button" data-action="edit" data-idea-id="${idea.id}" aria-label="Editar entrada">Editar</button>
                    <button class="entry-action delete-action" type="button" data-action="delete" data-idea-id="${idea.id}" aria-label="Apagar entrada">Apagar</button>
                </div>
            </div>
            <p class="idea-content">${idea.content.replace(/\n/g, '<br>')}</p>
            <div class="idea-actions">
                <button class="vote-button${userVote === 'up' ? ' selected' : ''}" type="button" data-action="upvote" data-idea-id="${idea.id}" aria-label="Dar upvote" title="Dar upvote"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg><span class="action-count">${idea.upvotes || 0}</span></button>
                <button class="vote-button${userVote === 'down' ? ' selected' : ''}" type="button" data-action="downvote" data-idea-id="${idea.id}" aria-label="Dar downvote" title="Dar downvote"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m6-6-6 6-6-6" /></svg><span class="action-count">${idea.downvotes || 0}</span></button>
                <button class="favorite-button${favorite ? ' selected' : ''}" type="button" data-action="favorite" data-idea-id="${idea.id}" aria-label="${favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" title="${favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg></button>
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

    function updateProfileStats() {
        const savedIdeas = JSON.parse(localStorage.getItem('gnoteca_ideas')) || [];
        ideasCount.textContent = savedIdeas.length;
        favoritesCount.textContent = savedIdeas.filter(idea => idea.favorite).length;
    }

    function showActionFeedback(message) {
        actionFeedback.textContent = message;
        actionFeedback.classList.remove('hidden');
        setTimeout(() => actionFeedback.classList.add('hidden'), 3000);
    }

    ideasList.addEventListener('click', event => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const ideaId = Number(button.dataset.ideaId);
        const action = button.dataset.action;
        const savedIdeas = JSON.parse(localStorage.getItem('gnoteca_ideas')) || [];
        const idea = savedIdeas.find(savedIdea => savedIdea.id === ideaId);
        if (!idea) return;

        if (action === 'edit') {
            enterEditMode(button.closest('.idea-card'), idea);
            return;
        } else if (action === 'save-edit') {
            const editField = button.closest('.idea-card').querySelector('.idea-edit-field');
            const trimmedContent = editField.value.trim();
            if (!trimmedContent) {
                showActionFeedback('A entrada não pode ficar vazia.');
                editField.focus();
                return;
            }
            idea.content = trimmedContent;
            idea.date = new Date().toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } else if (action === 'delete') {
            openDeleteDialog(ideaId, button.closest('.idea-card'));
            return;
        } else if (action === 'cancel-edit') {
            loadIdeas();
            return;
        } else {
            idea.upvotes = idea.upvotes || 0;
            idea.downvotes = idea.downvotes || 0;
            idea.favorite = Boolean(idea.favorite);
            idea.userVote = idea.userVote || null;
        }

        if (action === 'edit' || action === 'delete') {
            localStorage.setItem('gnoteca_ideas', JSON.stringify(savedIdeas));
            loadIdeas();
            updateProfileStats();
            return;
        } else if (action === 'favorite') {
            if (!idea.favorite) {
                const usage = getDailyUsage();
                if (usage.favorites >= maxDailyFavorites) {
                    showActionFeedback('Limite diário de 3 favoritos atingido.');
                    return;
                }
                usage.favorites += 1;
                saveDailyUsage(usage);
            }
            idea.favorite = !idea.favorite;
        } else {
            const nextVote = action === 'upvote' ? 'up' : 'down';
            if (!idea.userVote) {
                const usage = getDailyUsage();
                if (usage.votes >= maxDailyVotes) {
                    showActionFeedback('Limite diário de 5 votos atingido.');
                    return;
                }
                usage.votes += 1;
                saveDailyUsage(usage);
                idea.userVote = nextVote;
                idea[nextVote === 'up' ? 'upvotes' : 'downvotes'] += 1;
            } else if (idea.userVote !== nextVote) {
                idea[idea.userVote === 'up' ? 'upvotes' : 'downvotes'] -= 1;
                idea[nextVote === 'up' ? 'upvotes' : 'downvotes'] += 1;
                idea.userVote = nextVote;
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