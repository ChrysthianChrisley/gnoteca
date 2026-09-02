import { supabaseClient, PAGE_SIZE, PUBLIC_FEED_LIMIT, MAX_LENGTH, STORAGE_KEYS } from './config.js';
import { state, getCacheKey, getCachedData, setCachedData, invalidateCache } from './state.js';
import { translate, currentLanguage, getTranslatedTopic } from './i18n.js';
import { escapeHTML, showActionFeedback } from './utils.js';
import { showAuthGate } from './auth.js';
import { renderProfileConstellation, updateProfileStats } from './favorites.js';

import { openShareModal } from './share.js';

// Formatação de Entradas do Supabase
export function formatIdeaEntry(entry, commentsCount = 0) {
    const interactions = entry.knowledge_interactions || [];
    const isAppreciated = state.authenticatedUser
        ? interactions.some(i => i.user_id === state.authenticatedUser.id)
        : false;
    const appreciationCount = interactions.length;
        
    const favorite = state.authenticatedUser
        ? (entry.saved_knowledge || []).some(s => s.user_id === state.authenticatedUser.id)
        : false;
    const totalFavorites = (entry.saved_knowledge || []).length;
    const authorName = entry.profiles?.display_name || entry.profiles?.username || 'Anônimo';
    const authorAvatarUrl = entry.profiles?.avatar_url || null;

    const isEdited = !!(entry.updated_at && (new Date(entry.updated_at).getTime() - new Date(entry.created_at).getTime() > 1000));

    return {
        id: entry.id,
        content: entry.content,
        category: entry.category || 'Geral',
        tags: entry.tags || [],
        source: entry.source,
        authorId: entry.author_id,
        authorName: authorName,
        authorUsername: entry.profiles?.username,
        authorAvatarUrl: authorAvatarUrl,
        isAppreciated,
        appreciationCount,
        favorite,
        favoritesCount: totalFavorites,
        commentsCount: commentsCount || 0,
        isEdited,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        date: new Date(entry.created_at).toLocaleDateString(currentLanguage, {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    };
}

// Renderização do Card de Fragmento
export function renderIdeaCard(idea) {
    const card = document.createElement('div');
    card.className = 'idea-card';
    const isAuth = !!state.authenticatedUser;
    card.dataset.authorId = isAuth ? (idea.authorId || '') : '';
    card.dataset.ideaId = idea.id;
    const isAuthor = isAuth && idea.authorId === state.authenticatedUser.id;

    let authorHtml = '';
    if (isAuth) {
        const authorImgBadge = idea.authorAvatarUrl
            ? `<img class="card-author-avatar" src="${escapeHTML(idea.authorAvatarUrl)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`
            : '';
        authorHtml = `<button class="author-link" type="button" data-action="profile" data-profile-id="${idea.authorId}">${authorImgBadge}${escapeHTML(idea.authorName)}</button>`;
    } else {
        authorHtml = `<button class="author-link unauth-author-link" type="button" data-action="auth-gate" title="${translate('signInToContinue')}"><span class="card-author-avatar-anon" aria-hidden="true"></span><span class="blurred-author-preview">••••••••</span></button>`;
    }

    const rawCategory = idea.category || 'Geral';
    const displayCategory = getTranslatedTopic(rawCategory);
    
    const tagsHtml = idea.tags?.length > 0 
        ? idea.tags.map(t => `<span class="card-tag-pill tag-secondary">#${escapeHTML(t)}</span>`).join(' ')
        : '';

    let mainContent = idea.content || '';
    let citationHtml = idea.source ? `<div class="card-citation">— Fonte: ${escapeHTML(idea.source)}</div>` : '';

    card.innerHTML = `
        <div class="idea-header">
            <span class="idea-date">${idea.date}${idea.isEdited ? ` <span class="card-edited-badge">(${translate('edited')})</span>` : ''}<span class="idea-author">${translate('by')} ${authorHtml}</span></span>
            <div style="display: flex; align-items: center; gap: 0.25rem;">
                <button class="card-tag-pill" type="button" data-action="tag" data-tag="${escapeHTML(rawCategory)}">${escapeHTML(displayCategory)}</button>
                <div class="entry-actions${isAuthor ? '' : ' hidden'}">
                    <button class="entry-action" type="button" data-action="view-history" data-idea-id="${idea.id}">Histórico</button>
                    <button class="entry-action" type="button" data-action="edit" data-idea-id="${idea.id}" aria-label="${translate('edit')} entrada">${translate('edit')}</button>
                    <button class="entry-action delete-action" type="button" data-action="delete" data-idea-id="${idea.id}" aria-label="${translate('delete')} entrada">${translate('delete')}</button>
                </div>
            </div>
        </div>
        <div class="idea-tags-row" style="margin-bottom: 0.5rem;">${tagsHtml}</div>
        <p class="idea-content">${escapeHTML(mainContent).replace(/\n/g, '<br>')}</p>
        ${citationHtml}
        <div class="idea-actions">
            <button class="action-btn-sparkle${idea.isAppreciated ? ' selected' : ''}" type="button" data-action="toggle-appreciate" data-idea-id="${idea.id}" aria-label="${translate('appreciate')}" title="${translate('appreciate')}">
                <span class="sparkle-symbol" aria-hidden="true">✦</span>
                <span class="action-count">${idea.appreciationCount || 0}</span>
            </button>
            <button class="comment-toggle-btn" type="button" data-action="toggle-comments" data-idea-id="${idea.id}" aria-label="${translate('comments')}" title="${translate('comments')}">
                <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span class="action-count comment-count">${idea.commentsCount || 0}</span>
            </button>
            <button class="favorite-button${idea.favorite ? ' selected' : ''}" type="button" data-action="favorite" data-idea-id="${idea.id}" aria-label="${idea.favorite ? translate('unfavorite') : translate('favorite')}" title="${idea.favorite ? translate('unfavorite') : translate('favorite')}">
                <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>
                <span class="action-count">${idea.favoritesCount || 0}</span>
            </button>
            <button class="share-button" type="button" data-action="share" data-idea-id="${idea.id}" aria-label="${translate('share')}" title="${translate('share')}">
                <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
        </div>

        <div class="comments-thread-container hidden" id="comments-thread-${idea.id}"></div>
    `;
    return card;
}

// Renderização do 4º Card Desfocado para Visitantes
export function renderBlurredTeaserCard(idea) {
    const card = document.createElement('div');
    card.className = 'idea-card blurred-teaser';
    const isAuth = !!state.authenticatedUser;
    const authorHtml = isAuth ? escapeHTML(idea?.authorName || 'Pensador') : '<span class="blurred-author-preview">••••••••</span>';
    const rawTag = idea?.tag || 'Geral';
    const displayTag = getTranslatedTopic(rawTag);

    card.innerHTML = `
        <div class="blurred-content-wrapper">
            <div class="idea-header">
                <span class="idea-date">Recentemente<span class="idea-author">${translate('by')} ${authorHtml}</span></span>
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

// Busca Comentários da Thread Sob Demanda (Lazy Loading) com Votos
export async function fetchComments(entryId) {
    try {
        const { data, error } = await supabaseClient
            .from('knowledge')
            .select(`
                id,
                content,
                category,
                knowledge_type,
                epistemic_status,
                source,
                created_at,
                updated_at,
                author_id,
                profiles:author_id (
                    id,
                    username,
                    display_name,
                    avatar_url
                ),
                knowledge_interactions (
                    user_id,
                    interaction_type
                )
            `)
            .eq('parent_id', entryId);

        if (error) {
            console.error('fetchComments error:', error);
            return [];
        }

        const comments = (data || []).map(c => {
            const upvotes = (c.knowledge_interactions || []).filter(i => i.interaction_type === 'up').length;
            const downvotes = (c.knowledge_interactions || []).filter(i => i.interaction_type === 'down').length;
            const userVote = state.authenticatedUser
                ? (c.knowledge_interactions || []).find(i => i.user_id === state.authenticatedUser.id)?.interaction_type || null
                : null;
            const score = upvotes - downvotes;

            let replyToCommentId = null;
            let replyToAuthorName = null;
            if (c.source && typeof c.source === 'string' && c.source.includes('reply_to:')) {
                const match = c.source.match(/reply_to:\s*(\d+)(?:[|:](.*))?/i);
                if (match) {
                    replyToCommentId = Number(match[1]);
                    replyToAuthorName = match[2] ? match[2].trim() : null;
                }
            }

            const isEdited = !!(c.updated_at && (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 1000));

            return {
                id: Number(c.id),
                content: c.content,
                rawContent: c.content,
                tag: c.knowledge_type || 'Aprofundamento',
                isEdited,
                replyToCommentId,
                replyToAuthorName,
                createdAt: c.created_at,
                authorId: c.author_id,
                authorName: c.profiles?.display_name || c.profiles?.username || 'Pensador',
                authorAvatarUrl: c.profiles?.avatar_url || null,
                upvotes,
                downvotes,
                userVote,
                score
            };
        });

        return comments;
    } catch (err) {
        console.error('fetchComments catch:', err);
        return [];
    }
}

// Formatação de Tempo Relativo para Comentários
function formatCommentTime(dateString) {
    if (!dateString) return '';
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
    return `há ${Math.floor(diff / 86400)} d`;
}

// Renderiza Conteúdo da Thread de Comentários (Estilo Cascata Reddit com Fio Conector)
export function renderCommentsContent(container, entryId, comments) {
    if (!container) return;

    // Indexa todos os comentários por ID numérico
    const commentMap = new Map();
    comments.forEach(c => {
        commentMap.set(Number(c.id), c);
    });

    // Garante nome do destinatário se não salvo previamente
    comments.forEach(c => {
        if (c.replyToCommentId) {
            const parentComment = commentMap.get(Number(c.replyToCommentId));
            if (parentComment && !c.replyToAuthorName) {
                c.replyToAuthorName = parentComment.authorName;
            }
        }
    });

    // Mapeamento de Filhos (Hierarquia Completa em Árvore)
    const childrenMap = new Map();
    const rootComments = [];

    comments.forEach(c => {
        const targetParentId = c.replyToCommentId ? Number(c.replyToCommentId) : null;
        if (targetParentId && commentMap.has(targetParentId)) {
            if (!childrenMap.has(targetParentId)) {
                childrenMap.set(targetParentId, []);
            }
            childrenMap.get(targetParentId).push(c);
        } else {
            rootComments.push(c);
        }
    });

    // Ordenação: Raízes mais antigas primeiro
    rootComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Renderiza Nó Recursivo (Cascata Reddit com Linha Lateral e Recuo)
    function renderCommentNode(c, depth = 0) {
        const authorImg = c.authorAvatarUrl
            ? `<img class="comment-author-avatar" src="${escapeHTML(c.authorAvatarUrl)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`
            : '';
        const replyBadge = c.replyToAuthorName
            ? `<span class="comment-reply-to-badge"><span class="reply-symbol">↳</span> @${escapeHTML(c.replyToAuthorName)}</span> `
            : '';
        const isAuthor = state.authenticatedUser && state.authenticatedUser.id === c.authorId;
        const editedBadge = c.isEdited
            ? `<span class="comment-edited-badge">(${translate('edited')})</span>`
            : '';
        const timeAgo = formatCommentTime(c.createdAt);
        const authorActions = isAuthor
            ? `
                <div class="comment-author-actions">
                    <button class="comment-action-btn" type="button" data-action="edit-comment" data-comment-id="${c.id}" data-parent-id="${entryId}" aria-label="${translate('edit')}">${translate('edit')}</button>
                    <button class="comment-action-btn delete-action" type="button" data-action="delete-comment" data-comment-id="${c.id}" data-parent-id="${entryId}" aria-label="${translate('delete')}">${translate('delete')}</button>
                </div>
            `
            : '';

        const children = childrenMap.get(Number(c.id)) || [];
        children.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const childrenHtml = children.map(child => renderCommentNode(child, depth + 1)).join('');

        return `
            <div class="comment-thread-item${depth > 0 ? ' is-reply' : ''}" id="comment-thread-${c.id}">
                <div class="comment-card" id="comment-${c.id}">
                    <div class="comment-header">
                        <div class="comment-header-meta">
                            <span class="comment-author">
                                <button class="author-link" type="button" data-action="profile" data-profile-id="${c.authorId}">${authorImg}${escapeHTML(c.authorName)}</button>
                                ${editedBadge}
                            </span>
                            <span class="comment-time">${timeAgo}</span>
                        </div>
                        ${authorActions}
                    </div>
                    <div class="comment-body-wrapper" id="comment-body-${c.id}">
                        <p class="comment-content">${replyBadge}${escapeHTML(c.content).replace(/\n/g, '<br>')}</p>
                    </div>
                    <div class="comment-actions">
                        <button class="comment-sparkle-btn${c.userVote === 'up' ? ' selected' : ''}" type="button" data-action="comment-appreciate" data-comment-id="${c.id}" data-parent-id="${entryId}" aria-label="${translate('appreciate')}" title="${translate('appreciate')}">
                            <span class="sparkle-symbol-mini" aria-hidden="true">✦</span>
                            <span class="comment-score${c.score > 0 ? ' positive' : ''}">${c.score || 0}</span>
                        </button>
                        <button class="comment-reply-action-btn" type="button" data-action="open-reply-box" data-comment-id="${c.id}" data-author-id="${c.authorId}" data-author-name="${escapeHTML(c.authorName)}" data-parent-id="${entryId}">
                            <svg viewBox="0 0 24 24" class="icon-tiny" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 5 5v5"/></svg>
                            ${translate('reply')}
                        </button>
                    </div>
                    <div class="comment-inline-reply-slot" id="reply-slot-${c.id}"></div>
                </div>
                ${children.length > 0 ? `<div class="comment-thread-children">${childrenHtml}</div>` : ''}
            </div>
        `;
    }

    const commentsTreeHtml = rootComments.map(root => renderCommentNode(root, 0)).join('');

    container.innerHTML = `
        <div class="comments-thread-header">
            <span class="comments-thread-title">${translate('comments')} (${comments.length})</span>
            <button class="comments-close-btn" type="button" data-action="close-comments" data-idea-id="${entryId}" aria-label="Fechar">✕</button>
        </div>
        <div class="comments-list">
            ${comments.length ? commentsTreeHtml : `<p class="comments-empty">${translate('noCommentsYet')}</p>`}
        </div>
        <div class="comment-reply-form main-comment-form" data-parent-id="${entryId}">
            <textarea class="comment-reply-input" placeholder="${translate('addCommentPlaceholder')}" maxlength="280"></textarea>
            <div class="comment-form-actions" style="display:flex; justify-content:flex-end; margin-top:0.35rem;">
                <button class="comment-submit-btn" type="button" data-action="submit-comment" data-parent-id="${entryId}">${translate('sendComment')}</button>
            </div>
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
                .from('knowledge')
                .select(`
                    id,
                    content,
                    category,
                    tags,
                    source,
                    created_at,
                    updated_at,
                    author_id,
                    profiles:author_id (
                        id,
                        username,
                        display_name,
                        avatar_url
                    ),
                    knowledge_interactions (
                        user_id,
                        interaction_type
                    ),
                    saved_knowledge!inner (
                        user_id
                    )
                `)
                .is('parent_id', null)
                .eq('saved_knowledge.user_id', state.authenticatedUser.id);
        } else {
            query = supabaseClient
                .from('knowledge')
                .select(`
                    id,
                    content,
                    category,
                    tags,
                    source,
                    created_at,
                    updated_at,
                    author_id,
                    profiles:author_id (
                        id,
                        username,
                        display_name,
                        avatar_url
                    ),
                    knowledge_interactions (
                        user_id,
                        interaction_type
                    ),
                    saved_knowledge (
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
            query = query.eq('category', tag);
        }

        const isPublicVisitor = !state.authenticatedUser && state.activeFeed === 'global';
        if (isPublicVisitor) {
            query = query.limit(4);
        } else {
            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            query = query.range(from, to);
        }
        if (filter === 'voted') {
            query = query.order('insight_count', { ascending: false }).order('created_at', { ascending: false });
        } else if (filter === 'favorite') {
            query = query.order('saves_count', { ascending: false }).order('created_at', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data: entries, error } = await query;
        if (error) {
            console.error('Error fetching entries page:', error);
            return null;
        }

        // Busca a contagem de comentários em lote (Ultra rápido e leve)
        const entryIds = (entries || []).map(e => e.id);
        let commentCounts = {};
        if (entryIds.length > 0) {
            try {
                const { data: comments } = await supabaseClient
                    .from('knowledge')
                    .select('parent_id')
                    .in('parent_id', entryIds);
                (comments || []).forEach(c => {
                    if (c.parent_id) {
                        commentCounts[c.parent_id] = (commentCounts[c.parent_id] || 0) + 1;
                    }
                });
            } catch (cErr) {
                console.warn('count comments warn:', cErr);
            }
        }

        let formatted = (entries || []).map(e => formatIdeaEntry(e, commentCounts[e.id] || 0));

        // Ordenação por comentários ainda fica no cliente pois não há coluna de count no banco para isso
        if (filter === 'most_commented') {
            formatted.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
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
        if (state.activeFeed === 'profile') {
            feedTitle.textContent = `${translate('fragments')} de ${profileAccount?.name || translate('profile')}`;
        } else if (state.activeFeed === 'favorites') {
            feedTitle.textContent = translate('favoriteCollection');
        } else {
            feedTitle.textContent = translate('latestFragments');
        }
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
        let emptyMsg = translate('empty');
        if (state.activeFeed === 'mine') {
            emptyMsg = translate('emptyMine');
        } else if (state.activeFeed === 'profile') {
            emptyMsg = translate('emptyProfile');
        }
        ideasList.innerHTML = `<p class="empty-state">${emptyMsg}</p>`;
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
            .from('knowledge')
            .delete()
            .eq('id', state.pendingDeleteId)
            .eq('author_id', state.authenticatedUser.id);

        if (error) {
            showActionFeedback(error.message || 'Erro ao apagar pensamento.');
        } else {
            showActionFeedback('Pensamento apagado com sucesso.');
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
        const isStandard = ['Geral', 'Filosofia', 'Ciência', 'Tecnologia', 'Games', 'Neurociência', 'Física', 'Psicologia', 'Sociedade'].includes(currentTag);
        const tagEditContainer = document.createElement('div');
        tagEditContainer.className = 'card-tag-editor';
        tagEditContainer.innerHTML = `
            <select class="card-tag-select">
                <option value="Geral"${currentTag === 'Geral' ? ' selected' : ''}>Geral</option>
                <option value="Filosofia"${currentTag === 'Filosofia' ? ' selected' : ''}>Filosofia</option>
                <option value="Ciência"${currentTag === 'Ciência' ? ' selected' : ''}>Ciência</option>
                <option value="Tecnologia"${currentTag === 'Tecnologia' ? ' selected' : ''}>Tecnologia</option>
                <option value="Games"${currentTag === 'Games' ? ' selected' : ''}>Games</option>
                <option value="Neurociência"${currentTag === 'Neurociência' ? ' selected' : ''}>Neurociência</option>
                <option value="Física"${currentTag === 'Física' ? ' selected' : ''}>Física</option>
                <option value="Psicologia"${currentTag === 'Psicologia' ? ' selected' : ''}>Psicologia</option>
                <option value="Sociedade"${currentTag === 'Sociedade' ? ' selected' : ''}>Sociedade</option>
                <option value="__custom__"${!isStandard ? ' selected' : ''}>+ Outro...</option>
            </select>
            <input class="card-tag-custom${isStandard ? ' hidden' : ''}" type="text" maxlength="20" placeholder="Tópico" value="${!isStandard ? escapeHTML(currentTag) : ''}">
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

    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const ideaId = Number(button.dataset.ideaId);

    if (action === 'toggle-comments') {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
        const card = button.closest('.idea-card');
        const container = card.querySelector(`#comments-thread-${ideaId}`);
        if (!container) return;

        const isCurrentlyHidden = container.classList.contains('hidden');
        if (isCurrentlyHidden) {
            // Fecha qualquer outra thread de comentários que esteja aberta
            document.querySelectorAll('.comments-thread-container:not(.hidden)').forEach(openContainer => {
                if (openContainer !== container) {
                    openContainer.classList.add('hidden');
                    const otherCard = openContainer.closest('.idea-card');
                    otherCard?.querySelector('[data-action="toggle-comments"]')?.classList.remove('open');
                }
            });

            container.classList.remove('hidden');
            button.classList.add('open');
            container.innerHTML = `<p style="font-size:0.85rem; color:var(--muted-color); padding:0.5rem 0;">${translate('loading')}</p>`;
            const comments = await fetchComments(ideaId);
            renderCommentsContent(container, ideaId, comments);
        } else {
            container.classList.add('hidden');
            button.classList.remove('open');
        }
        return;
    }

    if (action === 'close-comments') {
        const card = button.closest('.idea-card');
        const container = card?.querySelector(`#comments-thread-${ideaId}`);
        container?.classList.add('hidden');
        card?.querySelector('[data-action="toggle-comments"]')?.classList.remove('open');
        return;
    }

    if (action === 'view-history') {
        const historyDialog = document.getElementById('history-dialog');
        if (historyDialog) {
            historyDialog.classList.remove('hidden');
            const container = document.getElementById('history-list-container');
            if (container) {
                container.innerHTML = '<p class="empty-state">Carregando histórico...</p>';
                try {
                    const { data, error } = await supabaseClient
                        .from('knowledge_history')
                        .select('previous_content, created_at')
                        .eq('knowledge_id', ideaId)
                        .order('created_at', { ascending: false });
                    
                    if (error) throw error;
                    
                    if (!data || data.length === 0) {
                        container.innerHTML = '<p class="empty-state">Nenhuma edição anterior encontrada.</p>';
                    } else {
                        container.innerHTML = data.map(h => `
                            <div class="history-item">
                                <div class="history-date">${new Date(h.created_at).toLocaleString()}</div>
                                <div class="history-content">${escapeHTML(h.previous_content).replace(/\n/g, '<br>')}</div>
                            </div>
                        `).join('');
                    }
                } catch (err) {
                    console.error('History fetch error:', err);
                    container.innerHTML = '<p class="empty-state">Erro ao carregar histórico.</p>';
                }
            }
        }
        return;
    }

    if (action === 'edit-comment') {
        const commentId = Number(button.dataset.commentId);
        const parentId = Number(button.dataset.parentId);
        const commentCard = button.closest('.comment-card');
        const bodyWrapper = commentCard?.querySelector(`#comment-body-${commentId}`);
        if (!bodyWrapper) return;

        const pEl = bodyWrapper.querySelector('.comment-content');
        const badgeEl = pEl?.querySelector('.comment-reply-to-badge');
        let currentText = pEl ? pEl.innerText : '';
        if (badgeEl && currentText.startsWith(badgeEl.innerText)) {
            currentText = currentText.slice(badgeEl.innerText.length).trim();
        }

        bodyWrapper.innerHTML = `
            <div class="comment-edit-box" id="comment-edit-box-${commentId}">
                <textarea class="comment-edit-textarea" maxlength="280">${escapeHTML(currentText)}</textarea>
                <div class="comment-edit-btn-row">
                    <button class="comment-submit-btn" type="button" data-action="save-edit-comment" data-comment-id="${commentId}" data-parent-id="${parentId}">${translate('save')}</button>
                    <button class="comment-cancel-reply-btn" type="button" data-action="cancel-edit-comment" data-comment-id="${commentId}" data-parent-id="${parentId}">${translate('cancel')}</button>
                </div>
            </div>
        `;

        const textarea = bodyWrapper.querySelector('.comment-edit-textarea');
        textarea?.focus();
        return;
    }

    if (action === 'cancel-edit-comment') {
        const parentId = Number(button.dataset.parentId);
        const container = button.closest('.comments-thread-container');
        const comments = await fetchComments(parentId);
        renderCommentsContent(container, parentId, comments);
        return;
    }

    if (action === 'save-edit-comment') {
        const commentId = Number(button.dataset.commentId);
        const parentId = Number(button.dataset.parentId);
        const editBox = button.closest('.comment-edit-box');
        const textarea = editBox?.querySelector('.comment-edit-textarea');
        const newText = textarea?.value.trim();

        if (!newText) {
            showActionFeedback(translate('emptyEntry'));
            textarea?.focus();
            return;
        }

        button.disabled = true;
        try {
            let { error } = await supabaseClient
                .from('knowledge')
                .update({
                    content: newText,
                    updated_at: new Date().toISOString()
                })
                .eq('id', commentId)
                .eq('author_id', state.authenticatedUser.id);

            if (error) {
                showActionFeedback(error.message || translate('errorSaving'));
                return;
            }

            showActionFeedback('Comentário atualizado!');
            const container = button.closest('.comments-thread-container');
            const comments = await fetchComments(parentId);
            renderCommentsContent(container, parentId, comments);
        } catch (err) {
            console.error('save-edit-comment error:', err);
            showActionFeedback(translate('errorSaving'));
        } finally {
            button.disabled = false;
        }
        return;
    }

    if (action === 'delete-comment') {
        const commentId = Number(button.dataset.commentId);
        const parentId = Number(button.dataset.parentId);

        const confirmPref = localStorage.getItem(STORAGE_KEYS.CONFIRM_DELETE) !== 'false';
        if (confirmPref) {
            const confirmed = window.confirm('Deseja realmente apagar este comentário?');
            if (!confirmed) return;
        }

        button.disabled = true;
        try {
            const { error } = await supabaseClient
                .from('knowledge')
                .delete()
                .eq('id', commentId)
                .eq('author_id', state.authenticatedUser.id);

            if (error) {
                showActionFeedback(error.message || translate('errorSaving'));
                return;
            }

            showActionFeedback(translate('commentDeleted'));

            // Atualiza contagem no card
            const card = button.closest('.idea-card');
            const countBadge = card?.querySelector('.comment-toggle-btn .action-count');
            if (countBadge) {
                const cur = Math.max(0, parseInt(countBadge.textContent || '0', 10) - 1);
                countBadge.textContent = cur;
            }

            const container = button.closest('.comments-thread-container');
            const comments = await fetchComments(parentId);
            renderCommentsContent(container, parentId, comments);
        } catch (err) {
            console.error('delete-comment error:', err);
            showActionFeedback(translate('errorSaving'));
        } finally {
            button.disabled = false;
        }
        return;
    }

    // Abrir Caixa de Resposta Inline
    if (action === 'open-reply-box') {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
        const commentId = Number(button.dataset.commentId);
        const parentId = Number(button.dataset.parentId);
        const authorName = button.dataset.authorName || 'Pensador';
        const targetAuthorId = button.dataset.authorId || '';

        const slot = document.getElementById(`reply-slot-${commentId}`);
        if (!slot) return;

        // Se já está aberto, fecha
        if (slot.innerHTML.trim() !== '') {
            slot.innerHTML = '';
            return;
        }

        // Fecha outros slots abertos nesta thread
        const container = button.closest('.comments-thread-container');
        container?.querySelectorAll('.comment-inline-reply-slot').forEach(s => { s.innerHTML = ''; });

        slot.innerHTML = `
            <div class="comment-inline-reply-box">
                <div class="comment-inline-reply-header">
                    <span>${translate('replyingTo')} <strong>@${escapeHTML(authorName)}</strong></span>
                    <button class="comment-cancel-reply-btn" type="button" data-action="close-reply-box" data-comment-id="${commentId}">✕</button>
                </div>
                <div class="comment-reply-form">
                    <textarea class="comment-reply-input" placeholder="${translate('writeReplyPlaceholder')}" maxlength="280"></textarea>
                    <div class="comment-form-actions" style="display:flex; justify-content:flex-end; gap:0.4rem; margin-top:0.35rem;">
                        <button class="comment-cancel-reply-btn" type="button" data-action="close-reply-box" data-comment-id="${commentId}">${translate('cancel')}</button>
                        <button class="comment-submit-btn" type="button" data-action="submit-comment" data-parent-id="${parentId}" data-reply-to="${commentId}" data-reply-target-author-id="${targetAuthorId}" data-reply-author="${escapeHTML(authorName)}">${translate('reply')}</button>
                    </div>
                </div>
            </div>
        `;

        const textarea = slot.querySelector('.comment-reply-input');
        textarea?.focus();
        return;
    }

    // Fechar Caixa de Resposta Inline
    if (action === 'close-reply-box') {
        const commentId = Number(button.dataset.commentId);
        const slot = document.getElementById(`reply-slot-${commentId}`);
        if (slot) slot.innerHTML = '';
        return;
    }

    if (action === 'submit-comment') {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
        const parentId = Number(button.dataset.parentId);
        const replyToId = button.dataset.replyTo ? Number(button.dataset.replyTo) : null;
        const replyAuthor = button.dataset.replyAuthor || '';
        const replyTargetAuthorId = button.dataset.replyTargetAuthorId || '';
        const form = button.closest('.comment-reply-form');
        const input = form.querySelector('.comment-reply-input');
        const content = input?.value.trim();

        if (!content) {
            showActionFeedback(translate('emptyEntry'));
            input?.focus();
            return;
        }

        button.disabled = true;
        try {
            const insertPayload = {
                author_id: state.authenticatedUser.id,
                parent_id: parentId,
                content: content,
                category: 'Geral',
                knowledge_type: 'Aprofundamento',
                source: replyToId ? `reply_to:${replyToId}|${replyAuthor}` : null
            };

            const { data: insertedComment, error } = await supabaseClient
                .from('knowledge')
                .insert([insertPayload])
                .select('id')
                .single();

            if (error) {
                console.error('Error inserting comment/reply:', error);
                showActionFeedback(error.message || translate('errorSaving'));
                return;
            }

            showActionFeedback(translate('commentPublished'));

            // Notificações em Tempo Real
            const card = button.closest('.idea-card') || document.querySelector(`[data-idea-id="${parentId}"]`);
            const postAuthorId = card?.dataset.authorId;

            if (replyToId && replyTargetAuthorId && replyTargetAuthorId !== state.authenticatedUser.id) {
                // Notifica o autor do comentário respondido
                await supabaseClient.from('notifications').insert([{
                    user_id: replyTargetAuthorId,
                    actor_id: state.authenticatedUser.id,
                    type: 'reply',
                    knowledge_id: parentId
                }]);
            } else if (!replyToId && postAuthorId && postAuthorId !== state.authenticatedUser.id) {
                // Notifica o autor da postagem principal
                await supabaseClient.from('notifications').insert([{
                    user_id: postAuthorId,
                    actor_id: state.authenticatedUser.id,
                    type: 'comment',
                    knowledge_id: parentId
                }]);
            }

            // Atualiza badge de contagem no card
            const countBadge = card?.querySelector('.comment-toggle-btn .action-count');
            if (countBadge) {
                const cur = parseInt(countBadge.textContent || '0', 10);
                countBadge.textContent = cur + 1;
            }

            const container = document.getElementById(`comments-thread-${parentId}`);
            if (container) {
                const comments = await fetchComments(parentId);
                renderCommentsContent(container, parentId, comments);
            }
        } catch (err) {
            console.error('submit comment error:', err);
            showActionFeedback(translate('errorSaving'));
        } finally {
            button.disabled = false;
        }
        return;
    }

    if (action === 'comment-appreciate') {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
        const commentId = Number(button.dataset.commentId);
        const parentId = Number(button.dataset.parentId);
        const isCurrentlySelected = button.classList.contains('selected');

        button.disabled = true;
        try {
            if (isCurrentlySelected) {
                await supabaseClient
                    .from('knowledge_interactions')
                    .delete()
                    .eq('knowledge_id', commentId)
                    .eq('user_id', state.authenticatedUser.id);
            } else {
                await supabaseClient
                    .from('knowledge_interactions')
                    .upsert([{
                        knowledge_id: commentId,
                        user_id: state.authenticatedUser.id,
                        interaction_type: 'up'
                    }], { onConflict: 'knowledge_id,user_id,interaction_type' });
            }
            const container = document.getElementById(`comments-thread-${parentId}`);
            if (container) {
                const comments = await fetchComments(parentId);
                renderCommentsContent(container, parentId, comments);
            }
        } catch (err) {
            console.error('Comment appreciate error:', err);
        } finally {
            button.disabled = false;
        }
        return;
    }

    if (action === 'profile') {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
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

    if (action === 'reflex-solid') {
        button.classList.toggle('selected');
        const isSel = button.classList.contains('selected');
        showActionFeedback(isSel ? 'Marcado como Sólido: bem fundamentado.' : 'Reação removida.');
        return;
    }

    if (action === 'reflex-provocative') {
        button.classList.toggle('selected');
        const isSel = button.classList.contains('selected');
        showActionFeedback(isSel ? 'Marcado como Provocativo: desafia o pensamento.' : 'Reação removida.');
        return;
    }

    if (!state.authenticatedUser && ['upvote', 'downvote', 'reflex-insight', 'favorite', 'edit', 'delete', 'save-edit'].includes(action)) {
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
                .from('knowledge')
                .update({
                    content: trimmedContent,
                    category: newTag,
                    updated_at: new Date().toISOString()
                })
                .eq('id', ideaId)
                .eq('author_id', state.authenticatedUser.id);

            if (error) {
                console.error('Error updating knowledge:', error);
                showActionFeedback(error.message || translate('errorSaving'));
                button.disabled = false;
                return;
            }

            showActionFeedback('Pensamento e tópico atualizados!');
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

    // Apreciação Editorial Rápida (✦ Centelha)
    if (action === 'toggle-appreciate') {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
        const isCurrentlySelected = button.classList.contains('selected');
        const countBadge = button.querySelector('.action-count');
        let cur = parseInt(countBadge?.textContent || '0', 10);

        // Atualização Otimista da Interface
        button.classList.toggle('selected');
        if (countBadge) {
            countBadge.textContent = isCurrentlySelected ? Math.max(0, cur - 1) : cur + 1;
        }

        try {
            if (isCurrentlySelected) {
                const { error } = await supabaseClient
                    .from('knowledge_interactions')
                    .delete()
                    .eq('knowledge_id', ideaId)
                    .eq('user_id', state.authenticatedUser.id);
                if (error) throw error;
                showActionFeedback(translate('unappreciatedFeedback') || 'Apreciação removida.');
            } else {
                const { error } = await supabaseClient
                    .from('knowledge_interactions')
                    .upsert({
                        knowledge_id: ideaId,
                        user_id: state.authenticatedUser.id,
                        interaction_type: 'insight'
                    }, { onConflict: 'knowledge_id,user_id,interaction_type' });
                if (error) throw error;
                showActionFeedback(translate('appreciatedFeedback') || 'Pensamento apreciado!');
            }
            invalidateCache();
        } catch (err) {
            console.error('toggle-appreciate error:', err);
            // Reverte em caso de erro
            button.classList.toggle('selected');
            if (countBadge) countBadge.textContent = cur;
            showActionFeedback(translate('errorSaving'));
        }
        return;
    }

    // Guardar (Antigo Favoritos)
    if (action === 'favorite') {
        const isCurrentlyFavorite = button.classList.contains('selected');
        const card = button.closest('.idea-card');
        const favCountEl = button.querySelector('.action-count');
        const prevFavCount = parseInt(favCountEl?.textContent || '0', 10);

        const nextFavorite = !isCurrentlyFavorite;
        button.classList.toggle('selected', nextFavorite);
        if (favCountEl) favCountEl.textContent = nextFavorite ? prevFavCount + 1 : Math.max(0, prevFavCount - 1);

        try {
            if (isCurrentlyFavorite) {
                const { error } = await supabaseClient
                    .from('saved_knowledge')
                    .delete()
                    .eq('knowledge_id', ideaId)
                    .eq('user_id', state.authenticatedUser.id);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient
                    .from('saved_knowledge')
                    .insert({
                        knowledge_id: ideaId,
                        user_id: state.authenticatedUser.id
                    });
                if (error) throw error;
            }
            invalidateCache();
            await updateProfileStats();
            if (state.activeFeed === 'favorites') {
                await loadIdeas();
            }
        } catch (err) {
            console.error('Save error:', err);
            button.classList.toggle('selected', isCurrentlyFavorite);
            if (favCountEl) favCountEl.textContent = prevFavCount;
            showActionFeedback(err.message || 'Erro ao atualizar Gnoteca pessoal.');
        }
    }
}
