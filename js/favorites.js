import { supabaseClient } from './config.js';
import { state, invalidateCache } from './state.js';
import { translate } from './i18n.js';
import { escapeHTML, showActionFeedback } from './utils.js';

// Atualizar Estatísticas na Barra Lateral do Perfil
export async function updateProfileStats() {
    const ideasCount = document.getElementById('ideas-count');
    const favoritesCount = document.getElementById('favorites-count');

    if (!state.authenticatedUser) {
        if (ideasCount) ideasCount.textContent = '0';
        if (favoritesCount) favoritesCount.textContent = '0';
        return;
    }
    try {
        const [knowledgeRes, savedRes] = await Promise.all([
            supabaseClient
                .from('knowledge')
                .select('id', { count: 'exact', head: true })
                .eq('author_id', state.authenticatedUser.id)
                .is('parent_id', null),
            supabaseClient
                .from('saved_knowledge')
                .select('knowledge_id', { count: 'exact', head: true })
                .eq('user_id', state.authenticatedUser.id)
        ]);

        const knowledgeTotal = knowledgeRes.count !== null ? knowledgeRes.count : 0;
        const savedTotal = savedRes.count !== null ? savedRes.count : 0;

        if (ideasCount) ideasCount.textContent = String(knowledgeTotal);
        if (favoritesCount) favoritesCount.textContent = String(savedTotal);
    } catch (err) {
        console.error('updateProfileStats error:', err);
    }
}

// Renderizar a Minha Gnoteca (antiga Constelação) no Perfil
export async function renderProfileConstellation(profileId, profileAccountName) {
    const profileConstellation = document.getElementById('profile-constellation');
    if (!profileConstellation) return;

    if (state.activeFeed !== 'profile' || !profileId) {
        profileConstellation.classList.add('hidden');
        profileConstellation.innerHTML = '';
        return;
    }

    try {
        const { data: savedKnowledge, error } = await supabaseClient
            .from('knowledge')
            .select(`
                id,
                content,
                category,
                tags,
                source,
                knowledge_type,
                epistemic_status,
                created_at,
                author_id,
                profiles:author_id (
                    id,
                    username,
                    display_name,
                    avatar_url
                ),
                saved_knowledge!inner (
                    user_id
                )
            `)
            .eq('saved_knowledge.user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(10); // Mostramos os últimos 10 salvos de forma destacada

        if (error) {
            console.error('Error fetching saved knowledge:', error);
            profileConstellation.classList.add('hidden');
            return;
        }

        const saveds = savedKnowledge || [];
        const isOwnProfile = state.authenticatedUser && state.authenticatedUser.id === profileId;

        if (saveds.length === 0) {
             profileConstellation.innerHTML = `
                <div class="constellation-empty-slot" style="margin-bottom: 2rem;">
                    <h4 class="constellation-empty-title">Nenhum conhecimento guardado ainda.</h4>
                    <p class="constellation-empty-desc">${isOwnProfile ? 'Explore a Gnoteca e guarde os conhecimentos que deseja lembrar.' : 'Este explorador ainda não guardou conhecimentos públicos.'}</p>
                </div>
            `;
            profileConstellation.classList.remove('hidden');
            return;
        }

        let cardsHtml = '';
        for (let i = 0; i < saveds.length; i++) {
            const entry = saveds[i];
            const authorName = entry.profiles?.display_name || entry.profiles?.username || 'Anônimo';
            const authorAvatar = entry.profiles?.avatar_url;
            const authorBadge = authorAvatar
                ? `<img class="card-author-avatar" src="${escapeHTML(authorAvatar)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`
                : '';
            
            cardsHtml += `
                <div class="constellation-card" style="margin-bottom: 1rem;">
                    <div class="constellation-card-header">
                        <span class="constellation-pill">${escapeHTML(entry.category)}</span>
                    </div>
                    <p class="constellation-card-content">“${escapeHTML(entry.content)}”</p>
                    <div class="constellation-card-author">
                        <span>Por <button class="author-link" type="button" data-action="profile" data-profile-id="${entry.author_id}">${authorBadge}${escapeHTML(authorName)}</button></span>
                    </div>
                </div>
            `;
        }

        profileConstellation.innerHTML = `
            <div class="constellation-header">
                <div class="constellation-title-group">
                    <div>
                        <h3 class="constellation-title">Guardados Recentes</h3>
                    </div>
                </div>
            </div>
            <div class="constellation-grid" style="display: flex; flex-direction: column; gap: 1rem;">
                ${cardsHtml}
            </div>
        `;
        profileConstellation.classList.remove('hidden');
    } catch (err) {
        console.error('renderProfileConstellation error:', err);
        profileConstellation.classList.add('hidden');
    }
}
