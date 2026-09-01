import { supabaseClient } from './config.js';
import { state, invalidateCache } from './state.js';
import { translate } from './i18n.js';
import { escapeHTML, showActionFeedback } from './utils.js';

// Capacidade de Favoritos por Gamificação e Progressão
export function getMaxFavorites(entryCount = 0) {
    if (entryCount >= 50) return 15;
    if (entryCount >= 25) return 10;
    if (entryCount >= 10) return 7;
    if (entryCount >= 3) return 5;
    return 3;
}

export function getNextFavoriteMilestoneInfo(entryCount = 0) {
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

// Atualizar Estatísticas na Barra Lateral do Perfil
export async function updateProfileStats() {
    const ideasCount = document.getElementById('ideas-count');
    const favoritesCount = document.getElementById('favorites-count');

    if (!state.authenticatedUser) {
        if (ideasCount) ideasCount.textContent = '0';
        if (favoritesCount) favoritesCount.textContent = '0/3';
        return;
    }
    try {
        const [entriesRes, favsRes] = await Promise.all([
            supabaseClient
                .from('entries')
                .select('id', { count: 'exact', head: true })
                .eq('author_id', state.authenticatedUser.id),
            supabaseClient
                .from('favorites')
                .select('entry_id', { count: 'exact', head: true })
                .eq('user_id', state.authenticatedUser.id)
        ]);

        const entriesTotal = entriesRes.count !== null ? entriesRes.count : 0;
        const favsTotal = favsRes.count !== null ? favsRes.count : 0;
        const maxFavs = getMaxFavorites(entriesTotal);

        if (ideasCount) ideasCount.textContent = String(entriesTotal);
        if (favoritesCount) favoritesCount.textContent = `${favsTotal}/${maxFavs}`;
    } catch (err) {
        console.error('updateProfileStats error:', err);
    }
}

// Renderizar a Constelação de 3 Favoritos no Perfil
export async function renderProfileConstellation(profileId, profileAccountName) {
    const profileConstellation = document.getElementById('profile-constellation');
    if (!profileConstellation) return;

    if (state.activeFeed !== 'profile' || !profileId) {
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
        const isOwnProfile = state.authenticatedUser && state.authenticatedUser.id === profileId;

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
