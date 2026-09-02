import { supabaseClient, PAGE_SIZE, PUBLIC_FEED_LIMIT, MAX_LENGTH, STORAGE_KEYS } from './config.js';
import { state, getCacheKey, getCachedData, setCachedData, invalidateCache } from './state.js';
import { translate, currentLanguage, getTranslatedTopic } from './i18n.js';
import { escapeHTML, showActionFeedback } from './utils.js';
import { showAuthGate } from './auth.js';
import { getMaxFavorites, getNextFavoriteMilestoneInfo, renderProfileConstellation, updateProfileStats } from './favorites.js';

import { openShareModal } from './share.js';

// Formatação de Entradas do Supabase
export function formatIdeaEntry(entry, commentsCount = 0) {
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
        commentsCount: commentsCount || 0,
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
    const isAuth = !!state.authenticatedUser;
    card.dataset.authorId = isAuth ? (idea.authorId || '') : '';
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

    const rawTag = idea.tag || 'Geral';
    const displayTag = getTranslatedTopic(rawTag);

    // Extração de citação / nota de rodapé
    let mainContent = idea.content || '';
    let citationHtml = '';
    const footnoteMatch = mainContent.match(/\n*—\s*Fonte:\s*(.+)$/i);
    if (footnoteMatch) {
        mainContent = mainContent.replace(/\n*—\s*Fonte:\s*(.+)$/i, '').trim();
        citationHtml = `<div class="card-citation">— Fonte: ${escapeHTML(footnoteMatch[1].trim())}</div>`;
    } else if (idea.citation) {
        citationHtml = `<div class="card-citation">— Fonte: ${escapeHTML(idea.citation)}</div>`;
    }

    card.innerHTML = `
        <div class="idea-header">
            <span class="idea-date">${idea.date}<span class="idea-author">${translate('by')} ${authorHtml}</span></span>
            <div style="display: flex; align-items: center; gap: 0.25rem;">
                <button class="card-tag-pill" type="button" data-action="tag" data-tag="${escapeHTML(rawTag)}">${escapeHTML(displayTag)}</button>
                <div class="entry-actions${isAuthor ? '' : ' hidden'}">
                    <button class="entry-action" type="button" data-action="edit" data-idea-id="${idea.id}" aria-label="${translate('edit')} entrada">${translate('edit')}</button>
                    <button class="entry-action delete-action" type="button" data-action="delete" data-idea-id="${idea.id}" aria-label="${translate('delete')} entrada">${translate('delete')}</button>
                </div>
            </div>
        </div>
        <p class="idea-content">${escapeHTML(mainContent).replace(/\n/g, '<br>')}</p>
        ${citationHtml}
        <div class="idea-actions">
            <button class="reflex-button reflex-insight${idea.userVote === 'up' ? ' selected' : ''}" type="button" data-action="reflex-insight" data-idea-id="${idea.id}" aria-label="Insight: perspectiva nova" title="Insight: perspectiva nova">
                <span class="reflex-symbol" aria-hidden="true">✦</span>
                <span class="reflex-name">Insight</span>
                <span class="action-count">${idea.upvotes || 0}</span>
            </button>
            <button class="reflex-button reflex-solid" type="button" data-action="reflex-solid" data-idea-id="${idea.id}" aria-label="Sólido: bem fundamentado" title="Sólido: bem fundamentado">
                <span class="reflex-symbol" aria-hidden="true">■</span>
                <span class="reflex-name">Sólido</span>
            </button>
            <button class="reflex-button reflex-provocative" type="button" data-action="reflex-provocative" data-idea-id="${idea.id}" aria-label="Provocativo: desafiador" title="Provocativo: desafiador">
                <span class="reflex-symbol" aria-hidden="true">~</span>
                <span class="reflex-name">Provocativo</span>
            </button>
            <button class="comment-toggle-btn" type="button" data-action="toggle-comments" data-idea-id="${idea.id}" aria-label="${translate('comments')}" title="${translate('comments')}"><svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="action-count comment-count">${idea.commentsCount || 0}</span></button>
            <button class="favorite-button${idea.favorite ? ' selected' : ''}" type="button" data-action="favorite" data-idea-id="${idea.id}" aria-label="${idea.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" title="${idea.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"><svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg><span class="action-count">${idea.favoritesCount}</span></button>
            <button class="share-button" type="button" data-action="share" data-idea-id="${idea.id}" aria-label="Compartilhar fragmento" title="Compartilhar fragmento"><svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
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
            .from('entries')
            .select(`
                id,
                content,
                tag,
                is_edited,
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
                )
            `)
            .eq('parent_id', entryId);

        if (error) {
            console.error('fetchComments error:', error);
            return [];
        }

        const comments = (data || []).map(c => {
            const upvotes = (c.votes || []).filter(v => v.vote_type === 'up').length;
            const downvotes = (c.votes || []).filter(v => v.vote_type === 'down').length;
            const userVote = state.authenticatedUser
                ? (c.votes || []).find(v => v.user_id === state.authenticatedUser.id)?.vote_type || null
                : null;
            const score = upvotes - downvotes;

            let replyToCommentId = null;
            let replyToAuthorName = null;
            if (c.tag && c.tag.startsWith('reply:')) {
                const parts = c.tag.split(':');
                replyToCommentId = Number(parts[1]) || null;
                if (parts[2]) {
                    try {
                        replyToAuthorName = decodeURIComponent(parts[2]);
                    } catch (e) {
                        replyToAuthorName = parts[2];
                    }
                }
            }

            const isEdited = Boolean(c.is_edited);

            return {
                id: c.id,
                content: c.content,
                rawContent: c.content,
                tag: c.tag,
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

// Renderiza Conteúdo da Thread de Comentários (Modelo Híbrido: 1 nível de recuo com @menção)
export function renderCommentsContent(container, entryId, comments) {
    if (!container) return;

    // Indexa todos os comentários por ID
    const commentMap = {};
    comments.forEach(c => { commentMap[c.id] = c; });

    // Determina o comentário raiz de cada resposta (para manter o aninhamento em exatamente 1 nível)
    function getRootCommentId(comment) {
        let curr = comment;
        let visited = new Set();
        while (curr && curr.replyToCommentId && commentMap[curr.replyToCommentId]) {
            if (visited.has(curr.id)) break;
            visited.add(curr.id);
            curr = commentMap[curr.replyToCommentId];
        }
        return curr?.id || comment.id;
    }

    const rootComments = [];
    const repliesByRoot = {};

    comments.forEach(c => {
        if (!c.replyToCommentId || !commentMap[c.replyToCommentId]) {
            rootComments.push(c);
        } else {
            const rootId = getRootCommentId(c);
            repliesByRoot[rootId] = repliesByRoot[rootId] || [];
            repliesByRoot[rootId].push(c);
        }
    });

    // Ordenação Reddit: Comentários raiz mais votados no topo
    rootComments.sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt));

    // Renderiza um card individual de comentário
    function renderSingleComment(c, isReply = false) {
        const authorImg = c.authorAvatarUrl
            ? `<img class="comment-author-avatar" src="${escapeHTML(c.authorAvatarUrl)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`
            : '';
        const scoreClass = c.score > 0 ? ' positive' : c.score < 0 ? ' negative' : '';
        const replyBadge = c.replyToAuthorName
            ? `<span class="comment-reply-to-badge">@${escapeHTML(c.replyToAuthorName)}</span> `
            : '';
        const isAuthor = state.authenticatedUser && state.authenticatedUser.id === c.authorId;
        const editedBadge = c.isEdited
            ? `<span class="comment-edited-badge">(${translate('edited')})</span>`
            : '';
        const authorActions = isAuthor
            ? `
                <div class="comment-author-actions">
                    <button class="comment-action-btn" type="button" data-action="edit-comment" data-comment-id="${c.id}" data-parent-id="${entryId}" aria-label="${translate('edit')}">${translate('edit')}</button>
                    <button class="comment-action-btn delete-action" type="button" data-action="delete-comment" data-comment-id="${c.id}" data-parent-id="${entryId}" aria-label="${translate('delete')}">${translate('delete')}</button>
                </div>
            `
            : '';

        return `
            <div class="comment-card${isReply ? ' is-reply' : ''}" id="comment-${c.id}">
                <div class="comment-header">
                    <span class="comment-author">
                        <button class="author-link" type="button" data-action="profile" data-profile-id="${c.authorId}">${authorImg}${escapeHTML(c.authorName)}</button>
                        ${editedBadge}
                    </span>
                    ${authorActions}
                </div>
                <div class="comment-body-wrapper" id="comment-body-${c.id}">
                    <p class="comment-content">${replyBadge}${escapeHTML(c.content).replace(/\n/g, '<br>')}</p>
                </div>
                <div class="comment-actions">
                    <button class="comment-vote-btn upvote${c.userVote === 'up' ? ' selected' : ''}" type="button" data-action="comment-upvote" data-comment-id="${c.id}" data-parent-id="${entryId}" aria-label="Upvote">
                        <svg viewBox="0 0 24 24" class="icon-tiny" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
                    </button>
                    <span class="comment-score${scoreClass}">${c.score}</span>
                    <button class="comment-vote-btn downvote${c.userVote === 'down' ? ' selected' : ''}" type="button" data-action="comment-downvote" data-comment-id="${c.id}" data-parent-id="${entryId}" aria-label="Downvote">
                        <svg viewBox="0 0 24 24" class="icon-tiny" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14m6-6-6 6-6-6" /></svg>
                    </button>
                    <button class="comment-reply-action-btn" type="button" data-action="open-reply-box" data-comment-id="${c.id}" data-author-name="${escapeHTML(c.authorName)}" data-parent-id="${entryId}">
                        <svg viewBox="0 0 24 24" class="icon-tiny" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 5 5v5"/></svg>
                        ${translate('reply')}
                    </button>
                </div>
            </div>
        `;
    }

    // Renderiza a lista de comentários encadeados
    const commentsListHtml = rootComments.map(root => {
        const rootHtml = renderSingleComment(root, false);
        const replies = repliesByRoot[root.id] || [];
        replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const repliesHtml = replies.map(r => renderSingleComment(r, true)).join('');

        return `
            <div class="comment-group" id="comment-group-${root.id}">
                ${rootHtml}
                <div class="comment-replies-container${replies.length === 0 ? ' hidden' : ''}" id="replies-container-${root.id}">
                    ${repliesHtml}
                </div>
                <div class="comment-inline-reply-slot" id="reply-slot-${root.id}"></div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="comments-thread-header">
            <span class="comments-thread-title">${translate('comments')} (${comments.length})</span>
            <button class="comments-close-btn" type="button" data-action="close-comments" data-idea-id="${entryId}" aria-label="Fechar comentários">x</button>
        </div>
        <div class="comments-list">
            ${comments.length ? commentsListHtml : `<p class="comments-empty">${translate('noCommentsYet')}</p>`}
        </div>
        <div class="comment-reply-form main-comment-form" data-parent-id="${entryId}">
            <textarea class="comment-reply-input" placeholder="${translate('addCommentPlaceholder')}" maxlength="280"></textarea>
            <button class="comment-submit-btn" type="button" data-action="submit-comment" data-parent-id="${entryId}">${translate('sendComment')}</button>
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
        if (filter === 'voted') {
            query = query.order('upvotes_count', { ascending: false }).order('created_at', { ascending: false });
        } else if (filter === 'favorite') {
            query = query.order('favorites_count', { ascending: false }).order('created_at', { ascending: false });
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
                    .from('entries')
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

    if (action === 'open-reply-box') {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
        const commentId = Number(button.dataset.commentId);
        const authorName = button.dataset.authorName || 'Pensador';
        const parentId = Number(button.dataset.parentId);
        const card = button.closest('.idea-card');
        const group = button.closest('.comment-group') || button.closest('.comment-card');
        const rootId = group.id.replace('comment-group-', '') || commentId;

        // Fecha qualquer outro box de resposta aberto neste card
        card.querySelectorAll('.comment-inline-reply-box').forEach(b => b.remove());

        const slot = document.getElementById(`reply-slot-${rootId}`) || group;
        slot.innerHTML = `
            <div class="comment-inline-reply-box" id="inline-reply-box-${rootId}">
                <div class="comment-inline-reply-header">
                    <span>${translate('replyingTo')} <strong>@${escapeHTML(authorName)}</strong></span>
                    <button class="comment-cancel-reply-btn" type="button" data-action="cancel-reply" data-root-id="${rootId}">${translate('cancelReply')}</button>
                </div>
                <div class="comment-reply-form" data-parent-id="${parentId}">
                    <textarea class="comment-reply-input" placeholder="${translate('writeReplyPlaceholder')}" maxlength="280"></textarea>
                    <button class="comment-submit-btn" type="button" data-action="submit-comment" data-parent-id="${parentId}" data-reply-to="${commentId}" data-reply-author="${escapeHTML(authorName)}">${translate('reply')}</button>
                </div>
            </div>
        `;

        const textarea = slot.querySelector('.comment-reply-input');
        textarea?.focus();
        return;
    }

    if (action === 'cancel-reply') {
        const rootId = button.dataset.rootId;
        const box = document.getElementById(`inline-reply-box-${rootId}`);
        box?.remove();
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
                .from('entries')
                .update({ content: newText, is_edited: true })
                .eq('id', commentId)
                .eq('author_id', state.authenticatedUser.id);

            // Fallback se a coluna is_edited ainda não tiver sido criada no SQL
            if (error && error.message && error.message.includes('is_edited')) {
                const fallback = await supabaseClient
                    .from('entries')
                    .update({ content: newText })
                    .eq('id', commentId)
                    .eq('author_id', state.authenticatedUser.id);
                error = fallback.error;
            }

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
                .from('entries')
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

    if (action === 'submit-comment') {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
        const parentId = Number(button.dataset.parentId);
        const replyToId = button.dataset.replyTo ? Number(button.dataset.replyTo) : null;
        const replyAuthor = button.dataset.replyAuthor || '';
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
                tag: replyToId ? `reply:${replyToId}:${encodeURIComponent(replyAuthor)}` : 'Geral'
            };

            const { data: insertedComment, error } = await supabaseClient
                .from('entries')
                .insert([insertPayload])
                .select('id')
                .single();

            if (error) {
                console.error('Error inserting comment/reply:', error);
                showActionFeedback(error.message || translate('errorSaving'));
                return;
            }

            showActionFeedback(translate('commentPublished'));

            // As notificações de comentário/resposta são geridas automaticamente
            // pelo trigger `trigger_notify_entry` no banco de dados (supabase-schema.sql).

            const card = form.closest('.idea-card');
            const countBadge = card?.querySelector('.comment-toggle-btn .action-count');
            if (countBadge) {
                const cur = parseInt(countBadge.textContent || '0', 10);
                countBadge.textContent = cur + 1;
            }

            const container = form.closest('.comments-thread-container');
            const comments = await fetchComments(parentId);
            renderCommentsContent(container, parentId, comments);
        } catch (err) {
            console.error('submit comment error:', err);
            showActionFeedback(translate('errorSaving'));
        } finally {
            button.disabled = false;
        }
        return;
    }

    if (action === 'comment-upvote' || action === 'comment-downvote') {
        if (!state.authenticatedUser) {
            showAuthGate();
            return;
        }
        const commentId = Number(button.dataset.commentId);
        const parentId = Number(button.dataset.parentId);
        const targetType = action === 'comment-upvote' ? 'up' : 'down';
        const isCurrentlySelected = button.classList.contains('selected');

        button.disabled = true;
        try {
            if (isCurrentlySelected) {
                await supabaseClient
                    .from('votes')
                    .delete()
                    .eq('entry_id', commentId)
                    .eq('user_id', state.authenticatedUser.id);
            } else {
                await supabaseClient
                    .from('votes')
                    .upsert([{
                        entry_id: commentId,
                        user_id: state.authenticatedUser.id,
                        vote_type: targetType
                    }], { onConflict: 'entry_id,user_id' });
            }
            const container = document.getElementById(`comments-thread-${parentId}`);
            if (container) {
                const comments = await fetchComments(parentId);
                renderCommentsContent(container, parentId, comments);
            }
        } catch (err) {
            console.error('Comment vote error:', err);
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
                .from('entries')
                .update({
                    content: trimmedContent,
                    tag: newTag
                })
                .eq('id', ideaId)
                .eq('author_id', state.authenticatedUser.id);

            if (error) {
                console.error('Error updating entry:', error);
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

    // Votação Otimista em Tempo Real (Mapeada para o Impacto Reflexivo Insight)
    if (action === 'upvote' || action === 'downvote' || action === 'reflex-insight') {
        const targetType = (action === 'upvote' || action === 'reflex-insight') ? 'up' : 'down';
        const card = button.closest('.idea-card');
        const upBtn = card?.querySelector('[data-action="upvote"], [data-action="reflex-insight"]');
        const downBtn = card?.querySelector('[data-action="downvote"]');
        const upCountEl = upBtn?.querySelector('.action-count');
        const downCountEl = downBtn?.querySelector('.action-count');

        const prevUpSelected = upBtn?.classList.contains('selected') || false;
        const prevDownSelected = downBtn?.classList.contains('selected') || false;
        const prevUpCount = parseInt(upCountEl?.textContent || '0', 10);
        const prevDownCount = parseInt(downCountEl?.textContent || '0', 10);

        let newUpSelected = prevUpSelected;
        let newDownSelected = prevDownSelected;
        let newUpCount = prevUpCount;
        let newDownCount = prevDownCount;

        if (targetType === 'up') {
            if (prevUpSelected) {
                newUpSelected = false;
                newUpCount = Math.max(0, prevUpCount - 1);
            } else {
                newUpSelected = true;
                newUpCount = prevUpCount + 1;
                if (prevDownSelected) {
                    newDownSelected = false;
                    newDownCount = Math.max(0, prevDownCount - 1);
                }
            }
        } else {
            if (prevDownSelected) {
                newDownSelected = false;
                newDownCount = Math.max(0, prevDownCount - 1);
            } else {
                newDownSelected = true;
                newDownCount = prevDownCount + 1;
                if (prevUpSelected) {
                    newUpSelected = false;
                    newUpCount = Math.max(0, prevUpCount - 1);
                }
            }
        }

        // Aplicação Otimista Imediata na Interface
        upBtn?.classList.toggle('selected', newUpSelected);
        downBtn?.classList.toggle('selected', newDownSelected);
        if (upCountEl) upCountEl.textContent = newUpCount;
        if (downCountEl) downCountEl.textContent = newDownCount;

        try {
            if ((targetType === 'up' && prevUpSelected) || (targetType === 'down' && prevDownSelected)) {
                const { error } = await supabaseClient
                    .from('votes')
                    .delete()
                    .eq('entry_id', ideaId)
                    .eq('user_id', state.authenticatedUser.id);
                if (error) throw error;
            } else {
                if (!prevUpSelected && !prevDownSelected) {
                    const startOfDay = new Date();
                    startOfDay.setHours(0, 0, 0, 0);
                    const { count: dailyVotesCount, error: countErr } = await supabaseClient
                        .from('votes')
                        .select('entry_id', { count: 'exact', head: true })
                        .eq('user_id', state.authenticatedUser.id)
                        .gte('created_at', startOfDay.toISOString());

                    if (!countErr && dailyVotesCount !== null && dailyVotesCount >= 5) {
                        // Reverte a interface caso exceda o limite diário
                        upBtn?.classList.toggle('selected', prevUpSelected);
                        downBtn?.classList.toggle('selected', prevDownSelected);
                        if (upCountEl) upCountEl.textContent = prevUpCount;
                        if (downCountEl) downCountEl.textContent = prevDownCount;
                        showActionFeedback(translate('voteLimitReached'));
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

                // As notificações de voto são geridas automaticamente
                // pelo trigger `trigger_notify_vote` no banco de dados (supabase-schema.sql).
            }
            invalidateCache();
        } catch (err) {
            console.error('Vote error:', err);
            upBtn?.classList.toggle('selected', prevUpSelected);
            downBtn?.classList.toggle('selected', prevDownSelected);
            if (upCountEl) upCountEl.textContent = prevUpCount;
            if (downCountEl) downCountEl.textContent = prevDownCount;
            showActionFeedback(err.message || 'Erro ao registrar voto.');
        }
        return;
    }

    // Favoritos Otimista em Tempo Real
    if (action === 'favorite') {
        const isCurrentlyFavorite = button.classList.contains('selected');
        const card = button.closest('.idea-card');
        const favCountEl = button.querySelector('.action-count');
        const prevFavCount = parseInt(favCountEl?.textContent || '0', 10);

        // Aplicação Otimista Imediata
        const nextFavorite = !isCurrentlyFavorite;
        button.classList.toggle('selected', nextFavorite);
        if (favCountEl) favCountEl.textContent = nextFavorite ? prevFavCount + 1 : Math.max(0, prevFavCount - 1);

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
                    button.classList.toggle('selected', isCurrentlyFavorite);
                    if (favCountEl) favCountEl.textContent = prevFavCount;
                    showActionFeedback(getNextFavoriteMilestoneInfo(entryCount || 0));
                    return;
                }

                const { error } = await supabaseClient
                    .from('favorites')
                    .insert({
                        entry_id: ideaId,
                        user_id: state.authenticatedUser.id
                    });
                if (error) throw error;

                // As notificações de favorito são geridas automaticamente
                // pelo trigger `trigger_notify_favorite` no banco de dados (supabase-schema.sql).
            }
            invalidateCache();
            await updateProfileStats();
            if (state.activeFeed === 'favorites') {
                await loadIdeas();
            }
        } catch (err) {
            console.error('Favorite error:', err);
            button.classList.toggle('selected', isCurrentlyFavorite);
            if (favCountEl) favCountEl.textContent = prevFavCount;
            showActionFeedback(err.message || 'Erro ao atualizar favoritos.');
        }
    }
}
