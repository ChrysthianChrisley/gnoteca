import { supabaseClient, STORAGE_KEYS } from './config.js';
import { state } from './state.js';
import { translate } from './i18n.js';
import { escapeHTML } from './utils.js';
import { showAuthGate } from './auth.js';

let pulseEvents = [];
let currentEventIndex = 0;
let rotationTimer = null;
let isHovered = false;

const PULSE_WINDOW_MINUTES = 30;

// Busca Eventos Públicos Recentes da Comunidade (Últimos 30 Minutos)
export async function fetchCommunityPulse() {
    try {
        const windowStartTime = new Date(Date.now() - PULSE_WINDOW_MINUTES * 60 * 1000).toISOString();

        const [profilesRes, entriesRes, votesRes, favoritesRes] = await Promise.all([
            supabaseClient
                .from('profiles')
                .select('id, username, display_name, created_at')
                .gte('created_at', windowStartTime)
                .order('created_at', { ascending: false })
                .limit(10),
            supabaseClient
                .from('entries')
                .select(`
                    id,
                    tag,
                    parent_id,
                    created_at,
                    profiles:author_id (
                        id,
                        username,
                        display_name
                    )
                `)
                .gte('created_at', windowStartTime)
                .order('created_at', { ascending: false })
                .limit(15),
            supabaseClient
                .from('votes')
                .select(`
                    entry_id,
                    created_at,
                    profiles:user_id (
                        id,
                        username,
                        display_name
                    )
                `)
                .eq('vote_type', 'up')
                .gte('created_at', windowStartTime)
                .order('created_at', { ascending: false })
                .limit(15),
            supabaseClient
                .from('favorites')
                .select(`
                    entry_id,
                    created_at,
                    profiles:user_id (
                        id,
                        username,
                        display_name
                    )
                `)
                .gte('created_at', windowStartTime)
                .order('created_at', { ascending: false })
                .limit(15)
        ]);

        const events = [];

        // Novos Membros nos últimos 30 min
        (profilesRes.data || []).forEach(p => {
            const name = p.display_name || p.username || 'Um novo pensador';
            events.push({
                type: 'join',
                actor: name,
                actorId: p.id,
                time: p.created_at || new Date().toISOString()
            });
        });

        // Novas Ideias e Comentários nos últimos 30 min
        (entriesRes.data || []).forEach(e => {
            const author = e.profiles?.display_name || e.profiles?.username || 'Pensador';
            if (e.parent_id) {
                events.push({
                    type: 'comment',
                    actor: author,
                    actorId: e.profiles?.id,
                    entryId: e.parent_id,
                    commentId: e.id,
                    time: e.created_at
                });
            } else {
                events.push({
                    type: 'entry',
                    actor: author,
                    actorId: e.profiles?.id,
                    entryId: e.id,
                    tag: e.tag || 'Geral',
                    time: e.created_at
                });
            }
        });

        // Votos nos últimos 30 min
        (votesRes.data || []).forEach(v => {
            const voter = v.profiles?.display_name || v.profiles?.username || 'Pensador';
            events.push({
                type: 'vote',
                actor: voter,
                actorId: v.profiles?.id,
                entryId: v.entry_id,
                time: v.created_at
            });
        });

        // Favoritos nos últimos 30 min
        (favoritesRes.data || []).forEach(f => {
            const favAuthor = f.profiles?.display_name || f.profiles?.username || 'Pensador';
            events.push({
                type: 'favorite',
                actor: favAuthor,
                actorId: f.profiles?.id,
                entryId: f.entry_id,
                time: f.created_at
            });
        });

        // Filtra estritamente os últimos 30 minutos em memória para garantir consistência de fusos
        const cutoffTime = Date.now() - PULSE_WINDOW_MINUTES * 60 * 1000;
        const filteredEvents = events.filter(ev => new Date(ev.time).getTime() >= cutoffTime);

        // Ordena por mais recente
        filteredEvents.sort((a, b) => new Date(b.time) - new Date(a.time));
        pulseEvents = filteredEvents.slice(0, 20);

        if (pulseEvents.length > 0) {
            currentEventIndex = 0;
            startPulseRotation();
        } else {
            if (rotationTimer) {
                clearInterval(rotationTimer);
                rotationTimer = null;
            }
            renderCurrentPulse();
        }
    } catch (err) {
        console.warn('fetchCommunityPulse catch:', err);
    }
}

// Formata o Log para Exibição
function formatPulseText(event) {
    if (!event) return translate('communityActive');

    const isAuth = !!state.authenticatedUser;
    const actor = isAuth
        ? `<strong>@${escapeHTML(event.actor)}</strong>`
        : `<strong class="blurred-pulse-actor">@••••••••</strong>`;

    if (event.type === 'join') {
        return `${actor} ${translate('joinedCommunity')}`;
    }
    if (event.type === 'comment') {
        return `${actor} ${translate('commentedOnIdea')}`;
    }
    if (event.type === 'entry') {
        const tag = event.tag ? ` <em>#${escapeHTML(event.tag)}</em>` : '';
        return `${actor} ${translate('publishedIdea')}${tag}`;
    }
    if (event.type === 'vote') {
        return `${actor} ${translate('votedOnIdea')}`;
    }
    if (event.type === 'favorite') {
        return `${actor} ${translate('favoritedIdea')}`;
    }
    return `${actor} ${translate('publishedIdea')}`;
}

// Inicia a Rotação Suave do Ticker
function startPulseRotation() {
    if (localStorage.getItem(STORAGE_KEYS.PULSE) === 'false') return;
    if (rotationTimer) clearInterval(rotationTimer);

    renderCurrentPulse();

    rotationTimer = setInterval(() => {
        if (localStorage.getItem(STORAGE_KEYS.PULSE) === 'false') {
            clearInterval(rotationTimer);
            rotationTimer = null;
            return;
        }
        if (isHovered || pulseEvents.length === 0) return;
        currentEventIndex = (currentEventIndex + 1) % pulseEvents.length;
        renderCurrentPulse();
    }, 7500);
}

// Renderiza o Evento Atual com Efeito Fade
function renderCurrentPulse() {
    if (localStorage.getItem(STORAGE_KEYS.PULSE) === 'false') return;
    const textEl = document.getElementById('pulse-ticker-text');
    if (!textEl) return;

    if (pulseEvents.length === 0) {
        textEl.innerHTML = translate('communityActive');
        return;
    }

    textEl.classList.add('pulse-fade-out');

    setTimeout(() => {
        const event = pulseEvents[currentEventIndex];
        textEl.innerHTML = formatPulseText(event);
        textEl.classList.remove('pulse-fade-out');
        textEl.classList.add('pulse-fade-in');

        setTimeout(() => {
            textEl.classList.remove('pulse-fade-in');
        }, 400);
    }, 300);
}

let pulseCallbacks = {};

async function handlePulseClick() {
    if (!state.authenticatedUser) {
        showAuthGate('signin');
        return;
    }

    if (pulseEvents.length === 0) return;
    const event = pulseEvents[currentEventIndex];
    if (!event) return;

    if (event.type === 'join' && event.actorId) {
        if (typeof pulseCallbacks.onNavigateProfile === 'function') {
            await pulseCallbacks.onNavigateProfile(event.actorId);
        }
    } else if (event.entryId) {
        if (typeof pulseCallbacks.onNavigateEntry === 'function') {
            await pulseCallbacks.onNavigateEntry(event.entryId, event.type === 'comment');
        }
    }
}

// Busca Métricas Globais da Comunidade (Total de Membros e Publicações)
export async function fetchCommunityMetrics() {
    try {
        const membersEl = document.getElementById('footer-members-count');
        const entriesEl = document.getElementById('footer-entries-count');

        const [profilesRes, entriesRes] = await Promise.all([
            supabaseClient
                .from('profiles')
                .select('*', { count: 'exact', head: true }),
            supabaseClient
                .from('entries')
                .select('*', { count: 'exact', head: true })
                .is('parent_id', null)
        ]);

        if (membersEl && typeof profilesRes.count === 'number') {
            membersEl.textContent = profilesRes.count;
        }
        if (entriesEl && typeof entriesRes.count === 'number') {
            entriesEl.textContent = entriesRes.count;
        }
    } catch (err) {
        console.warn('fetchCommunityMetrics warn:', err);
    }
}

let presenceChannel = null;

// Inicializa Contagem de Usuários Online em Tempo Real via Supabase Realtime Presence
export function initOnlinePresence() {
    const onlineEl = document.getElementById('footer-online-count');
    if (!onlineEl) return;

    try {
        if (presenceChannel) {
            presenceChannel.unsubscribe();
            presenceChannel = null;
        }

        const randomSessionId = 'usr_' + Math.random().toString(36).slice(2, 9);
        presenceChannel = supabaseClient.channel('online_presence', {
            config: {
                presence: {
                    key: state.authenticatedUser?.id || randomSessionId
                }
            }
        });

        const updateOnlineCount = () => {
            if (!presenceChannel) return;
            const presenceState = presenceChannel.presenceState();
            const totalOnline = Math.max(1, Object.keys(presenceState).length);
            if (onlineEl) onlineEl.textContent = totalOnline;
        };

        presenceChannel
            .on('presence', { event: 'sync' }, updateOnlineCount)
            .on('presence', { event: 'join' }, updateOnlineCount)
            .on('presence', { event: 'leave' }, updateOnlineCount)
            .subscribe(async status => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        user_id: state.authenticatedUser?.id || null,
                        online_at: new Date().toISOString()
                    });
                }
            });
    } catch (presenceErr) {
        console.warn('Presence initialization warn:', presenceErr);
    }
}

// Inicialização das Métricas do Rodapé
export function initFooterStats() {
    fetchCommunityMetrics();
    initOnlinePresence();
    // Atualiza contadores do acervo a cada 2 minutos
    setInterval(fetchCommunityMetrics, 120000);
}

// Inicialização da Barra de Atividade
export function initCommunityPulse(callbacks = {}) {
    pulseCallbacks = callbacks;

    const bar = document.getElementById('community-pulse-bar');
    if (bar) {
        bar.addEventListener('mouseenter', () => { isHovered = true; });
        bar.addEventListener('mouseleave', () => { isHovered = false; });
        bar.addEventListener('click', handlePulseClick);
    }

    fetchCommunityPulse();
    initFooterStats();

    // Atualiza eventos a cada 60 segundos mantendo a janela de 30 minutos em tempo real
    setInterval(fetchCommunityPulse, 60000);
}
