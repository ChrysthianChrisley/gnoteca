import { supabaseClient } from './config.js';
import { translate } from './i18n.js';
import { escapeHTML } from './utils.js';

let pulseEvents = [];
let currentEventIndex = 0;
let rotationTimer = null;
let isHovered = false;

// Busca Eventos Públicos Recentes da Comunidade
export async function fetchCommunityPulse() {
    try {
        const [profilesRes, entriesRes] = await Promise.all([
            supabaseClient
                .from('profiles')
                .select('id, username, display_name, created_at')
                .order('created_at', { ascending: false })
                .limit(6),
            supabaseClient
                .from('entries')
                .select(`
                    id,
                    tag,
                    parent_id,
                    created_at,
                    profiles:author_id (
                        username,
                        display_name
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(10)
        ]);

        const events = [];

        // Novos Membros
        (profilesRes.data || []).forEach(p => {
            const name = p.display_name || p.username || 'Um novo pensador';
            events.push({
                type: 'join',
                actor: name,
                time: p.created_at || new Date().toISOString()
            });
        });

        // Novas Ideias e Comentários
        (entriesRes.data || []).forEach(e => {
            const author = e.profiles?.display_name || e.profiles?.username || 'Pensador';
            if (e.parent_id) {
                events.push({
                    type: 'comment',
                    actor: author,
                    time: e.created_at
                });
            } else {
                events.push({
                    type: 'entry',
                    actor: author,
                    tag: e.tag || 'Geral',
                    time: e.created_at
                });
            }
        });

        // Ordena por mais recente
        events.sort((a, b) => new Date(b.time) - new Date(a.time));
        pulseEvents = events.slice(0, 15);

        if (pulseEvents.length > 0 && !rotationTimer) {
            startPulseRotation();
        }
    } catch (err) {
        console.warn('fetchCommunityPulse catch:', err);
    }
}

// Formata o Log para Exibição
function formatPulseText(event) {
    if (!event) return translate('communityActive');

    const actor = `<strong>@${escapeHTML(event.actor)}</strong>`;
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
    return `${actor} ${translate('publishedIdea')}`;
}

// Inicia a Rotação Suave do Ticker
function startPulseRotation() {
    if (localStorage.getItem('gnoteca_setting_pulse') === 'false') return;
    if (rotationTimer) clearInterval(rotationTimer);

    renderCurrentPulse();

    rotationTimer = setInterval(() => {
        if (localStorage.getItem('gnoteca_setting_pulse') === 'false') {
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
    if (localStorage.getItem('gnoteca_setting_pulse') === 'false') return;
    const textEl = document.getElementById('pulse-ticker-text');
    if (!textEl || pulseEvents.length === 0) return;

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

// Inicialização da Barra de Atividade
export function initCommunityPulse() {
    const container = document.getElementById('pulse-ticker-container');
    if (container) {
        container.addEventListener('mouseenter', () => { isHovered = true; });
        container.addEventListener('mouseleave', () => { isHovered = false; });
    }

    fetchCommunityPulse();

    // Atualiza eventos a cada 90 segundos sem sobrecarregar a rede
    setInterval(fetchCommunityPulse, 90000);
}
