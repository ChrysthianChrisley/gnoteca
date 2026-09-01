// Gerenciador Dinâmico de Tópicos e Tags da Comunidade
import { supabaseClient } from './config.js';
import { state } from './state.js';
import { translate } from './i18n.js';
import { loadIdeas } from './feed.js';

const BASE_TOPICS = [
    'Filosofia',
    'Ciência',
    'Tecnologia',
    'Neurociência',
    'Física',
    'Psicologia',
    'Sociedade',
    'Geral'
];

let cachedSortedTopics = [...BASE_TOPICS];

// Normaliza uma tag para evitar duplicatas por case ou espaçamento
export function normalizeTagName(rawTag) {
    if (!rawTag) return 'Geral';
    let clean = String(rawTag).trim().replace(/^#+/, '').trim();
    if (!clean) return 'Geral';

    // Capitaliza primeira letra mantendo o restante legível
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    return clean.slice(0, 20);
}

// Busca a frequência de uso de cada tópico no banco e ordena os mais populares
export async function fetchCommunityTopics() {
    try {
        const { data, error } = await supabaseClient
            .from('entries')
            .select('tag')
            .is('parent_id', null)
            .not('tag', 'is', null);

        const counts = {};

        // Inicializa base topics
        BASE_TOPICS.forEach(topic => {
            counts[topic] = 0;
        });

        if (!error && Array.isArray(data)) {
            data.forEach(row => {
                if (row.tag) {
                    const normalized = normalizeTagName(row.tag);
                    counts[normalized] = (counts[normalized] || 0) + 1;
                }
            });
        }

        // Ordena por frequência decrescente
        const sorted = Object.keys(counts).sort((a, b) => {
            if (counts[b] !== counts[a]) {
                return counts[b] - counts[a];
            }
            return a.localeCompare(b);
        });

        cachedSortedTopics = sorted;
        renderTopicFilterBar(sorted);
        updateTopicDatalist(sorted);
        return sorted;
    } catch (err) {
        console.warn('fetchCommunityTopics warn:', err);
        renderTopicFilterBar(BASE_TOPICS);
        updateTopicDatalist(BASE_TOPICS);
        return BASE_TOPICS;
    }
}

// Renderiza os pills de filtro ordenados na barra horizontal
export function renderTopicFilterBar(topics = cachedSortedTopics) {
    const filterBar = document.getElementById('topic-filter-bar');
    if (!filterBar) return;

    const currentSelected = state.selectedTag || 'Todos';

    let html = `<button class="topic-pill ${currentSelected === 'Todos' ? 'active' : ''}" data-tag="Todos" type="button" data-i18n="topicAll">${translate('topicAll') || 'Todos'}</button>`;

    topics.forEach(tag => {
        const isSelected = currentSelected.toLowerCase() === tag.toLowerCase();
        html += `<button class="topic-pill ${isSelected ? 'active' : ''}" data-tag="${tag}" type="button">#${tag}</button>`;
    });

    filterBar.innerHTML = html;
}

// Atualiza o Datalist para autocompletar na escrita
export function updateTopicDatalist(topics = cachedSortedTopics) {
    const datalist = document.getElementById('available-topics-list');
    if (!datalist) return;

    let html = '';
    topics.forEach(tag => {
        html += `<option value="#${tag}">`;
    });

    datalist.innerHTML = html;
}

// Inicializa eventos da barra de tópicos
export function initTopics() {
    const filterBar = document.getElementById('topic-filter-bar');
    if (filterBar) {
        filterBar.addEventListener('click', async event => {
            const pill = event.target.closest('.topic-pill');
            if (!pill) return;
            const tag = pill.dataset.tag || 'Todos';
            state.selectedTag = tag;
            filterBar.querySelectorAll('.topic-pill').forEach(p => {
                p.classList.toggle('active', p === pill);
            });
            await loadIdeas();
        });
    }

    fetchCommunityTopics();
}
