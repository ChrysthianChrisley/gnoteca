import { CACHE_TTL_MS } from './config.js';

// Estado Reativo Global da Aplicação
export const state = {
    authenticatedUser: null,
    activeFeed: 'global', // 'global' | 'mine' | 'favorites' | 'profile'
    selectedProfileId: null,
    selectedTag: 'Todos',
    pendingDeleteId: null,
    currentPage: 0,
    hasMorePages: true,
    isFetchingPage: false,
};

// Gerenciamento de Cache em Memória
const queryCache = new Map();

export function getCacheKey(feedType, profileId, filter, page, tag = 'Todos') {
    const userIdentifier = state.authenticatedUser ? state.authenticatedUser.id : 'anon';
    return `${feedType}_${profileId || 'all'}_${filter}_${tag}_p${page}_${userIdentifier}`;
}

export function getCachedData(key) {
    const cached = queryCache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }
    return null;
}

export function setCachedData(key, data) {
    queryCache.set(key, { timestamp: Date.now(), data });
}

export function invalidateCache() {
    queryCache.clear();
}
