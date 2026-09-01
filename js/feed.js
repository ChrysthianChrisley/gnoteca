import { supabaseClient, PAGE_SIZE, PUBLIC_FEED_LIMIT, MAX_LENGTH } from './config.js';
import { state, getCacheKey, getCachedData, setCachedData, invalidateCache } from './state.js';
import { translate, currentLanguage, getTranslatedTopic } from './i18n.js';
import { escapeHTML, showActionFeedback } from './utils.js';
import { showAuthGate } from './auth.js';
import { getMaxFavorites, getNextFavoriteMilestoneInfo, renderProfileConstellation, updateProfileStats } from './favorites.js';

import { openShareModal } from './share.js';

// Formatação de Entradas do Supabase
export function formatIdeaEntry(entry) {
    const upvotes = (entry.votes || []).filter(v => v.vote_type === 'up').length;
    const downvotes = (entry.votes || []).filter(v => v.vote_type === 'down').length;
    const userVote = state.authenticatedUser
        ? (entry.votes || []).find(v => v.user_id === state.authenticatedUser.id)?.vote_type || null
        : null;
    const favorite = state.authenticatedUser
        ? (entry.favorites || []).some(f => f.user_id === state.authenticatedUser.id)
        : false;
    const totalFavorites = (entry.favorites || []).length;
    const authorName = entry.profiles?.display_name || entry.profiles?.username || 'Anônimo';
    const authorAvatarUrl = entry.profiles?.avatar_url || null;

    return {
        id: entry.id,
        content: entry.content,
        tag: entry.tag || 'Geral',
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

// Renderização do Card de Fragmento
export function renderIdeaCard(idea) {
    const card = document.createElement('div');
    card.className = 'idea-card';
    const isAuthor = state.authenticatedUser && idea.authorId === state.authenticatedUser.id;
    const authorImgBadge = idea.authorAvatarUrl
        ? `<img class="card-author-avatar" src="${escapeHTML(idea.authorAvatarUrl)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`
        : '';
    const rawTag = idea.tag || 'Geral';
    const displayTag = getTranslatedTopic(rawTag);

    card.innerHTML = `
        <div class="idea-header">
            <span class="idea-date">${idea.date}<span class="idea-author">${translate('by')} <button class="author-link" type="button" data-action="profile" data-profile-id="${idea.authorId}">${authorImgBadge}${escapeHTML(idea.authorName)}</button></span></span>
            <div style="display: flex; align-items: center; gap: 0.25rem;">
                <button class="card-tag-pill" type="button" data-action="tag" data-tag="${escapeHTML(rawTag)}">#${escapeHTML(displayTag)}</button>
                <div class="entry-actions${isAuthor ? '' : ' hidden'}">
                    <button class="entry-action" type="button" data-action="edit" data-idea-id="${idea.id}" aria-label="${translate('edit')} entrada">${translate('edit')}</button>
                    <button class="entry-action delete-action" type="button" data-action="delete" data-idea-id="${idea.id}" aria-label="${translate('delete')} entrada">${translate('delete')}</button>
                </div>
            </div>
        </div>
        <p class="idea-content">${escapeHTML(idea.content).replace(/\n/g, '<br>')}</p>
        <div class="idea-actions">
            <button class="vote-button${idea.userVote === 'up' ? ' selected' : ''}" type="button" data-action="upvote" data-idea-id="${idea.id}" aria-label="Dar upvote" title="Dar upvote"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg><span class="action-count">${idea.upvotes || 0}</span></button>
            <button class="vote-button${idea.userVote === 'down' ? ' selected' : ''}" type="button" data-action="downvote" data-idea-id="${idea.id}" aria-label="Dar downvote" title="Dar downvote"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m6-6-6 6-6-6" /></svg><span class="action-count">${idea.downvotes || 0}</span></button>
            <button class="dialectic-toggle-btn" type="button" data-action="toggle-dialectic" data-idea-id="${idea.id}" aria-label="${translate('dialectic')}" title="${translate('dialectic')}"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="dialectic-count">${translate('dialectic')}</span></button>
            <button class="favorite-button${idea.favorite ? ' selected' : ''}" type="button" data-action="favorite" data-idea-id="${idea.id}" aria-label="${idea.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" title="${idea.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg><span class="action-count">${idea.favoritesCount}</span></button>
            <button class="share-button" type="button" data-action="share" data-idea-id="${idea.id}" aria-label="Compartilhar fragmento" title="Compartilhar fragmento"><svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
        </div>
        <div class="dialectic-thread-container hidden" id="dialectic-thread-${idea.id}"></div>
    `;
    return card;
}

// Renderização do 4º Card Desfocado para Visitantes
export function renderBlurredTeaserCard(idea) {
    const card = document.createElement('div');
    card.className = 'idea-card blurred-teaser';
    const authorName = idea?.authorName || 'Pensador';
    const rawTag = idea?.tag || 'Geral';
    const displayTag = getTranslatedTopic(rawTag);

    card.innerHTML = `
        <div class="blurred-content-wrapper">
            <div class="idea-header">
                <span class="idea-date">Recentemente<span class="idea-author">${translate('by')} ${escapeHTML(authorName)}</span></span>
                <span class="card-tag-pill">#${escapeHTML(displayTag)}</span>
            </div>
            <p class="idea-content">${escapeHTML(idea?.content || 'A expansão da mente humana depende da capacidade de questionar e preservar o conhecimento...')}</p>
        </div>
        <div class="blurred-teaser-overlay" data-action="auth-gate">
            <span class="blurred-teaser-badge">${translate('exclusiveAccess')}</span>
            <p class="blurred-teaser-text">${translate('teaserMessage')}</p>
            <button class="gate-primary-button" type="button" data-action="auth-gate">${translate('createAccountOrSignIn')}</button>
        </div>
    `;
    return card;
}

// Busca Respostas Dialéticas Sob Demanda (Lazy Loading)
export async function fetchDialecticReplies(entryId) {
    try {
        const { data, error } = await supabaseClient
            .from('entries')
            .select(`
                id,
                content,
                dialectic_type,
                created_at,
                author_id,
                profiles:author_id (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            `)
            .eq('parent_id', entryId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('fetchDialecticReplies error:', error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('fetchDialecticReplies catch:', err);
        return [];
    }
}

// Renderiza Conteúdo do Fio Dialético
export function renderDialecticContent(container, entryId, replies) {
    const repliesHtml = replies.map(r => {
        const authorName = r.profiles?.display_name || r.profiles?.username || 'Pensador';
        const typeBadge = r.dialectic_type === 'antithesis'
            ? `<span class="dialectic-badge antithesis">${translate('dialecticAntithesis')}</span>`
            : `<span class="dialectic-badge synthesis">${translate('dialecticSynthesis')}</span>`;

        return `
            <div class="dialectic-item">
                <div class="dialectic-item-header">
                    <strong>${escapeHTML(authorName)}</strong>
                    ${typeBadge}
                </div>
                <p>${escapeHTML(r.content).replace(/\n/g, '<br>')}</p>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="dialectic-replies-list">
            ${replies.length ? repliesHtml : `<p style="font-size:0.85rem; color:var(--muted-color); font-style:italic;">${translate('dialecticEmpty')}</p>`}
        </div>
        <div class="dialectic-reply-form" data-parent-id="${entryId}">
            <div class="dialectic-type-selector">
                <button type="button" class="dialectic-type-btn active synthesis" data-type="synthesis">${translate('dialecticSynthesis')}</button>
                <button type="button" class="dialectic-type-btn antithesis" data-type="antithesis">${translate('dialecticAntithesis')}</button>
            </div>
            <textarea class="dialectic-reply-input" placeholder="${translate('dialecticPlaceholder')}" maxlength="280"></textarea>
            <button class="dialectic-submit-btn" type="button" data-action="submit-dialectic" data-parent-id="${entryId}">${translate('connectIdea')}</button>
        </div>
    `;
}

// Busca Paginada de Fragmentos com Cache
export async function fetchEntriesPage(page = 0) {
    const feedFilter = document.getElementById('feed-filter');
    const filter = feedFilter?.value || 'newest';
    const tag = state.selectedTag || 'Todos';
    const cacheKey = getCacheKey(state.activeFeed, state.selectedProfileId, filter, page, tag);
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        let query;
        if (state.activeFeed === 'favorites') {
            if (!state.authenticatedUser) return [];
            query = supabaseClient
                .from('entries')
                .select(`
                    id,
                    content,
                    tag,
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
                .is('parent_id', null)
                .eq('favorites.user_id', state.authenticatedUser.id);
        } else {
            query = supabaseClient
                .from('entries')
                .select(`
                    id,
                    content,
                    tag,
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
                `)
                .is('parent_id', null);

            if (state.activeFeed === 'mine') {
                if (!state.authenticatedUser) return [];
                query = query.eq('author_id', state.authenticatedUser.id);
            } else if (state.activeFeed === 'profile' && state.selectedProfileId) {
                query = query.eq('author_id', state.selectedProfileId);
            }
        }

        if (tag && tag !== 'Todos') {
            query = query.eq('tag', tag);
        }

        const isPublicVisitor = !state.authenticatedUser && state.activeFeed === 'global';
        if (isPublicVisitor) {
            query = query.limit(4);
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

        if (isPublicVisitor && formatted.length > 4) {
            formatted = formatted.slice(0, 4);
        }

        setCachedData(cacheKey, formatted);
        return formatted;
    } catch (err) {
        console.error('fetchEntriesPage exception:', err);
        return null;
    }
}

let currentLoadIdeasId = 0;

// Carregamento Inicial do Feed
export async function loadIdeas(reset = true) {
    const loadId = ++currentLoadIdeasId;
    const ideasList = document.getElementById('ideas-list');
    const ideasCount = document.getElementById('ideas-count');
    const visitorHero = document.getElementById('visitor-hero');
    const feedKicker = document.getElementById('feed-kicker');
    const feedTitle = document.getElementById('feed-title');
    const backToFeed = document.getElementById('back-to-feed');
    const feedLoader = document.getElementById('feed-loader');
    const unauthGateBanner = document.getElementById('unauth-gate-banner');

    if (!ideasList) return;

    if (reset) {
        state.currentPage = 0;
        state.hasMorePages = true;
        state.isFetchingPage = false;
        ideasList.innerHTML = '';
    }

    const isPublicVisitor = !state.authenticatedUser && state.activeFeed === 'global';

    if (visitorHero) {
        visitorHero.classList.toggle('hidden', !isPublicVisitor);
    }

    let profileAccount = null;
    if (state.activeFeed === 'profile' && state.selectedProfileId) {
        if (state.authenticatedUser && state.authenticatedUser.id === state.selectedProfileId) {
            profileAccount = state.authenticatedUser;
        } else {
            const { data: prof } = await supabaseClient
                .from('profiles')
                .select('id, display_name, username, avatar_url')
                .eq('id', state.selectedProfileId)
                .maybeSingle();
            if (prof) profileAccount = { id: prof.id, name: prof.display_name || prof.username, avatar_url: prof.avatar_url };
        }
    }

    if (feedKicker) feedKicker.textContent = state.activeFeed === 'profile' ? translate('profile') : translate('publicCollection');
    if (feedTitle) {
        feedTitle.textContent = state.activeFeed === 'profile'
            ? `${translate('fragments')} de ${profileAccount?.name || translate('profile')}`
            : state.activeFeed === 'favorites' ? translate('favoriteCollection') : translate('latestFragments');
    }
    if (backToFeed) backToFeed.classList.toggle('hidden', state.activeFeed !== 'profile');

    await renderProfileConstellation(state.selectedProfileId, profileAccount?.name);

    if (reset && feedLoader) {
        feedLoader.classList.remove('hidden');
    }

    const firstPage = await fetchEntriesPage(0);
    if (feedLoader) feedLoader.classList.add('hidden');

    // Se outra requisição foi disparada enquanto aguardávamos, ignore esta execução obsoleta
    if (loadId !== currentLoadIdeasId) return;

    if (reset) {
        ideasList.innerHTML = '';
    }

    if (firstPage === null) {
        ideasList.innerHTML = `<p class="empty-state">${translate('errorLoading')}</p>`;
        return;
    }

    if (firstPage.length === 0) {
        ideasList.innerHTML = `<p class="empty-state">${translate('empty')}</p>`;
        if (ideasCount && state.activeFeed === 'global') ideasCount.textContent = '0';
        state.hasMorePages = false;
        unauthGateBanner?.classList.add('hidden');
        return;
    }

    if (isPublicVisitor) {
        // Renderiza rigorosamente os 3 primeiros fragmentos normais
        const visibleIdeas = firstPage.slice(0, 3);
        visibleIdeas.forEach(idea => {
            ideasList.appendChild(renderIdeaCard(idea));
        });

        // O 4º fragmento é exibido desfocado
        const teaserIdea = firstPage[3] || firstPage[0];
        if (teaserIdea) {
            ideasList.appendChild(renderBlurredTeaserCard(teaserIdea));
        }

        state.hasMorePages = false;
        unauthGateBanner?.classList.remove('hidden');
    } else {
        firstPage.forEach(idea => {
            ideasList.appendChild(renderIdeaCard(idea));
        });
        unauthGateBanner?.classList.add('hidden');
        if (firstPage.length < PAGE_SIZE) {
            state.hasMorePages = false;
        }
    }
}

// Carregar Próxima Página (Rolagem Infinita)
export async function loadNextPage() {
    const isPublicVisitor = !state.authenticatedUser && state.activeFeed === 'global';
    if (isPublicVisitor || !state.authenticatedUser || !state.hasMorePages || state.isFetchingPage) return;
    state.isFetchingPage = true;
    state.currentPage++;

    const feedLoader = document.getElementById('feed-loader');
    const ideasList = document.getElementById('ideas-list');
    feedLoader?.classList.remove('hidden');

    const nextPageEntries = await fetchEntriesPage(state.currentPage);
    feedLoader?.classList.add('hidden');

    if (!nextPageEntries || nextPageEntries.length === 0) {
        state.hasMorePages = false;
    } else {
        nextPageEntries.forEach(idea => {
            ideasList?.appendChild(renderIdeaCard(idea));
        });
        if (nextPageEntries.length < PAGE_SIZE) {
            state.hasMorePages = false;
        }
    }
    state.isFetchingPage = false;
}

// Diálogo de Exclusão de Fragmento
export function openDeleteDialog(ideaId, card) {
    state.pendingDeleteId = ideaId;
    const deleteDialog = document.getElementById('delete-dialog');
    const deleteDialogCard = deleteDialog?.querySelector('.delete-dialog-card');
    const cancelDelete = document.getElementById('cancel-delete');
    if (!deleteDialog || !deleteDialogCard) return;

    const cardRect = card.getBoundingClientRect();
    const dialogWidth = Math.min(380, window.innerWidth - 32);
    const left = cardRect.left + (cardRect.width - dialogWidth) / 2;

    deleteDialogCard.style.setProperty('--dialog-left', `${Math.max(16, Math.min(left, window.innerWidth - dialogWidth - 16))}px`);
    deleteDialog.classList.remove('hidden');
    const dialogHeight = deleteDialogCard.offsetHeight;
    const top = cardRect.top + (cardRect.height - dialogHeight) / 2;
    deleteDialogCard.style.setProperty('--dialog-top', `${Math.max(16, Math.min(top, window.innerHeight - dialogHeight - 16))}px`);
    cancelDelete?.focus();
}

export function closeDeleteDialog() {
    state.pendingDeleteId = null;
    const deleteDialog = document.getElementById('delete-dialog');
    deleteDialog?.classList.add('hidden');
}

export async function confirmDeleteEntry() {
    if (state.pendingDeleteId === null || !state.authenticatedUser) return;
    const confirmDelete = document.getElementById('confirm-delete');
    if (confirmDelete) confirmDelete.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('entries')
            .delete()
            .eq('id', state.pendingDeleteId)
            .eq('author_id', state.authenticatedUser.id);

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
        if (confirmDelete) confirmDelete.disabled = false;
    }
}

export function enterEditMode(card, idea) {
    const content = card.querySelector('.idea-content');
    const editButton = card.querySelector('[data-action="edit"]');
    const deleteButton = card.querySelector('[data-action="delete"]');
    const actions = card.querySelector('.idea-actions');
    const tagButton = card.querySelector('.card-tag-pill');

    const editField = document.createElement('textarea');
    editField.className = 'idea-edit-field';
    editField.maxLength = MAX_LENGTH;
    editField.value = idea.content;
    content.replaceWith(editField);

    if (tagButton) {
        const currentTag = idea.tag || tagButton.dataset.tag || 'Geral';
        const isStandard = ['Geral', 'Ciência', 'Filosofia', 'Tecnologia', 'Neurociência', 'Física', 'Psicologia', 'Sociedade'].includes(currentTag);
        const tagEditContainer = document.createElement('div');
        tagEditContainer.className = 'card-tag-editor';
        tagEditContainer.innerHTML = `
            <select class="card-tag-select">
                <option value="Geral"${currentTag === 'Geral' ? ' selected' : ''}>#Geral</option>
                <option value="Ciência"${currentTag === 'Ciência' ? ' selected' : ''}>#Ciência</option>
                <option value="Filosofia"${currentTag === 'Filosofia' ? ' selected' : ''}>#Filosofia</option>
                <option value="Tecnologia"${currentTag === 'Tecnologia' ? ' selected' : ''}>#Tecnologia</option>
                <option value="Neurociência"${currentTag === 'Neurociência' ? ' selected' : ''}>#Neurociência</option>
                <option value="Física"${currentTag === 'Física' ? ' selected' : ''}>#Física</option>
                <option value="Psicologia"${currentTag === 'Psicologia' ? ' selected' : ''}>#Psicologia</option>
                <option value="Sociedade"${currentTag === 'Sociedade' ? ' selected' : ''}>#Sociedade</option>
                <option value="__custom__"${!isStandard ? ' selected' : ''}>+ Outro...</option>
            </select>
            <input class="card-tag-custom${isStandard ? ' hidden' : ''}" type="text" maxlength="20" placeholder="#Tag" value="${!isStandard ? escapeHTML(currentTag) : ''}">
        `;
        const selectEl = tagEditContainer.querySelector('.card-tag-select');
        const customEl = tagEditContainer.querySelector('.card-tag-custom');
        selectEl.addEventListener('change', () => {
            if (selectEl.value === '__custom__') {
                customEl.classList.remove('hidden');
                customEl.focus();
            } else {
                customEl.classList.add('hidden');
            }
        });
        tagButton.replaceWith(tagEditContainer);
    }

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

// Tratamento Central de Cliques no Feed (Votos, Favoritos, Edição)
export async function handleFeedClick(event, onNavigateProfile) {
    if (event.target.closest('.blurred-teaser') || event.target.closest('[data-action="auth-gate"]')) {
        showAuthGate();
        return;
    }

    const typeBtn = event.target.closest('.dialectic-type-btn');
    if (typeBtn) {
        const parentForm = typeBtn.closest('.dialectic-reply-form');
        parentForm.querySelectorAll('.dialectic-type-btn').forEach(btn => btn.classList.remove('active'));
        typeBtn.classList.add('active');
        return;
    }

    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const ideaId = Number(button.dataset.ideaId);

    if (action === 'toggle-dialectic') {
        const card = button.closest('.idea-card');
        const container = card.querySelector(`#dialectic-thread-${ideaId}`);
        if (!container) return;

        const isCurrentlyHidden = container.classList.contains('hidden');
        if (isCurrentlyHidden) {
            container.classList.remove('hidden');
            button.classList.add('open');
            container.innerHTML = '<p style="font-size:0.85rem; color:var(--muted-color); padding:0.5rem 0;">Carregando conexões dialéticas...</p>';
            const replies = await fetchDialecticReplies(ideaId);
            renderDialecticContent(container, ideaId, replies);
        } else {
            container.classList.add('hidden');
            button.classList.remove('open');
        }
        return;
    }

    if (action === 'submit-dialectic') {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
        const parentId = Number(button.dataset.parentId);
        const form = button.closest('.dialectic-reply-form');
        const input = form.querySelector('.dialectic-reply-input');
        const activeTypeBtn = form.querySelector('.dialectic-type-btn.active');
        const dialecticType = activeTypeBtn?.dataset.type || 'synthesis';
        const content = input?.value.trim();

        if (!content) {
            showActionFeedback(translate('emptyEntry'));
            input?.focus();
            return;
        }

        button.disabled = true;
        try {
            const { error } = await supabaseClient
                .from('entries')
                .insert([{
                    author_id: state.authenticatedUser.id,
                    parent_id: parentId,
                    content: content,
                    dialectic_type: dialecticType
                }]);

            if (error) {
                console.error('Error inserting dialectic reply:', error);
                showActionFeedback(error.message || 'Erro ao conectar ideia.');
                return;
            }

            showActionFeedback('Conexão dialética publicada!');
            const container = form.closest('.dialectic-thread-container');
            const replies = await fetchDialecticReplies(parentId);
            renderDialecticContent(container, parentId, replies);
        } catch (err) {
            console.error('submit dialectic error:', err);
            showActionFeedback('Erro ao conectar ideia.');
        } finally {
            button.disabled = false;
        }
        return;
    }

    if (action === 'profile') {
        if (typeof onNavigateProfile === 'function') {
            onNavigateProfile(button.dataset.profileId);
        }
        return;
    }

    if (action === 'tag') {
        const card = button.closest('.idea-card');
        const isAuthorCard = state.authenticatedUser && card.querySelector('[data-action="edit"]');
        if (isAuthorCard && !card.querySelector('.idea-edit-field')) {
            const contentEl = card.querySelector('.idea-content');
            const rawContent = contentEl ? (contentEl.innerText || contentEl.textContent) : '';
            enterEditMode(card, { id: ideaId, content: rawContent, tag: button.dataset.tag });
            card.querySelector('.card-tag-select')?.focus();
            return;
        }

        const clickedTag = button.dataset.tag;
        if (clickedTag) {
            state.selectedTag = clickedTag;
            document.querySelectorAll('.topic-pill').forEach(pill => {
                pill.classList.toggle('active', pill.dataset.tag === clickedTag);
            });
            await loadIdeas();
        }
        return;
    }

    if (action === 'share') {
        const card = button.closest('.idea-card');
        const contentEl = card?.querySelector('.idea-content');
        const rawContent = contentEl?.innerText || contentEl?.textContent || '';
        const authorEl = card?.querySelector('.author-link');
        const authorName = authorEl ? authorEl.textContent.trim() : 'Pensador';
        openShareModal({
            id: ideaId,
            content: rawContent,
            authorName: authorName
        });
        return;
    }

    if (!state.authenticatedUser && ['upvote', 'downvote', 'favorite', 'edit', 'delete', 'save-edit'].includes(action)) {
        showAuthGate();
        return;
    }

    if (action === 'edit') {
        const card = button.closest('.idea-card');
        const contentEl = card.querySelector('.idea-content');
        const tagEl = card.querySelector('.card-tag-pill');
        const rawContent = contentEl.innerText || contentEl.textContent;
        const currentTag = tagEl?.dataset.tag || 'Geral';
        enterEditMode(card, { id: ideaId, content: rawContent, tag: currentTag });
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

        const tagSelect = card.querySelector('.card-tag-select');
        const tagCustom = card.querySelector('.card-tag-custom');
        let newTag = 'Geral';
        if (tagSelect) {
            if (tagSelect.value === '__custom__') {
                const customVal = tagCustom?.value.trim().replace(/^#+/, '');
                newTag = customVal ? customVal.slice(0, 20) : 'Geral';
            } else {
                newTag = tagSelect.value;
            }
        }

        button.disabled = true;
        try {
            const { error } = await supabaseClient
                .from('entries')
                .update({
                    content: trimmedContent,
                    tag: newTag
                })
                .eq('id', ideaId)
                .eq('author_id', state.authenticatedUser.id);

            if (error) {
                showActionFeedback(error.message || translate('errorSaving'));
                button.disabled = false;
                return;
            }

            showActionFeedback('Fragmento e tópico atualizados!');
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
                const { error } = await supabaseClient
                    .from('votes')
                    .delete()
                    .eq('entry_id', ideaId)
                    .eq('user_id', state.authenticatedUser.id);
                if (error) throw error;
            } else {
                if (!hasOtherVoteSelected) {
                    const startOfDay = new Date();
                    startOfDay.setHours(0, 0, 0, 0);
                    const { count: dailyVotesCount, error: countErr } = await supabaseClient
                        .from('votes')
                        .select('entry_id', { count: 'exact', head: true })
                        .eq('user_id', state.authenticatedUser.id)
                        .gte('created_at', startOfDay.toISOString());

                    if (countErr) console.warn('Count daily votes warning:', countErr);
                    if (dailyVotesCount !== null && dailyVotesCount >= 5) {
                        showActionFeedback(translate('voteLimitReached'));
                        button.disabled = false;
                        return;
                    }
                }

                const { error } = await supabaseClient
                    .from('votes')
                    .upsert({
                        entry_id: ideaId,
                        user_id: state.authenticatedUser.id,
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
                    .eq('user_id', state.authenticatedUser.id);
                if (error) throw error;
            } else {
                const [{ count: entryCount }, { count: favCount }] = await Promise.all([
                    supabaseClient
                        .from('entries')
                        .select('id', { count: 'exact', head: true })
                        .eq('author_id', state.authenticatedUser.id),
                    supabaseClient
                        .from('favorites')
                        .select('entry_id', { count: 'exact', head: true })
                        .eq('user_id', state.authenticatedUser.id)
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
                        user_id: state.authenticatedUser.id
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
    }
}
