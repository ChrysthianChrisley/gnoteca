// Gerenciador Dinâmico de Tópicos e Autocomplete Inteligente da Comunidade
import { supabaseClient } from './config.js';
import { state } from './state.js';
import { translate, getTranslatedTopic } from './i18n.js';
import { loadIdeas } from './feed.js';
import { escapeHTML } from './utils.js';

export const BASE_TOPICS = [
    'Filosofia',
    'Ciência',
    'Tecnologia',
    'Neurociência',
    'Física',
    'Psicologia',
    'Sociedade',
    'Games',
    'Arte',
    'Literatura',
    'História',
    'Economia',
    'Música',
    'Cinema',
    'Política',
    'Educação',
    'Geral'
];

// Dicionário de Aliases / Sinônimos Internacionais para Normalização Canônica
const TOPIC_ALIASES = {
    'geral': 'Geral',
    'general': 'Geral',
    'général': 'Geral',
    'filosofia': 'Filosofia',
    'philosophy': 'Filosofia',
    'filosofía': 'Filosofia',
    'philosophie': 'Filosofia',
    'ciencia': 'Ciência',
    'ciência': 'Ciência',
    'science': 'Ciência',
    'tecnologia': 'Tecnologia',
    'technology': 'Tecnologia',
    'technologie': 'Tecnologia',
    'neurociencia': 'Neurociência',
    'neurociência': 'Neurociência',
    'neuroscience': 'Neurociência',
    'neurosciences': 'Neurociência',
    'fisica': 'Física',
    'física': 'Física',
    'physics': 'Física',
    'physique': 'Física',
    'psicologia': 'Psicologia',
    'psychology': 'Psicologia',
    'psychologie': 'Psicologia',
    'sociedade': 'Sociedade',
    'society': 'Sociedade',
    'sociedad': 'Sociedade',
    'société': 'Sociedade',
    'games': 'Games',
    'game': 'Games',
    'jogos': 'Games',
    'jogo': 'Games',
    'juegos': 'Games',
    'juego': 'Games',
    'jeux': 'Games',
    'arte': 'Arte',
    'art': 'Arte',
    'literatura': 'Literatura',
    'literature': 'Literatura',
    'littérature': 'Literatura',
    'historia': 'História',
    'história': 'História',
    'history': 'História',
    'histoire': 'História',
    'economia': 'Economia',
    'economics': 'Economia',
    'economía': 'Economia',
    'économie': 'Economia',
    'musica': 'Música',
    'música': 'Música',
    'music': 'Música',
    'musique': 'Música',
    'cinema': 'Cinema',
    'cine': 'Cinema',
    'cinéma': 'Cinema',
    'politica': 'Política',
    'política': 'Política',
    'politics': 'Política',
    'politique': 'Política',
    'educacao': 'Educação',
    'educação': 'Educação',
    'education': 'Educação',
    'educación': 'Educação',
    'éducation': 'Educação'
};

let cachedSortedTopics = [...BASE_TOPICS];

// Normaliza uma tag removendo #, tratando espaços e mapeando para forma canônica
export function normalizeTagName(rawTag) {
    if (!rawTag) return 'Geral';
    let clean = String(rawTag).trim().replace(/^#+/, '').trim();
    if (!clean) return 'Geral';

    const lower = clean.toLowerCase();
    if (TOPIC_ALIASES[lower]) {
        return TOPIC_ALIASES[lower];
    }

    // Se for um novo tópico criado pelo usuário, capitaliza a primeira letra
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    return clean.slice(0, 20);
}

// Busca a frequência de uso de cada tópico no banco e ordena os mais populares
export async function fetchCommunityTopics() {
    try {
        const { data, error } = await supabaseClient
            .from('topic_counts')
            .select('tag, entry_count')
            .order('entry_count', { ascending: false });

        const counts = {};

        // Inicializa base topics
        BASE_TOPICS.forEach(topic => {
            counts[topic] = 0;
        });

        if (!error && Array.isArray(data)) {
            data.forEach(row => {
                if (row.tag) {
                    const normalized = normalizeTagName(row.tag);
                    counts[normalized] = (counts[normalized] || 0) + row.entry_count;
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
        return sorted;
    } catch (err) {
        console.warn('fetchCommunityTopics warn:', err);
        renderTopicFilterBar(BASE_TOPICS);
        return BASE_TOPICS;
    }
}

// Renderiza os pills de filtro ordenados na barra horizontal (sem hashtag)
export function renderTopicFilterBar(topics = cachedSortedTopics) {
    const filterBar = document.getElementById('topic-filter-bar');
    if (!filterBar) return;

    const currentSelected = state.selectedTag || 'Todos';

    let html = `<button class="topic-pill ${currentSelected === 'Todos' ? 'active' : ''}" data-tag="Todos" type="button" data-i18n="topicAll">${translate('topicAll') || 'Todos'}</button>`;

    topics.forEach(tag => {
        const displayLabel = getTranslatedTopic(tag);
        const isSelected = currentSelected.toLowerCase() === tag.toLowerCase();
        html += `<button class="topic-pill ${isSelected ? 'active' : ''}" data-tag="${escapeHTML(tag)}" type="button">${escapeHTML(displayLabel)}</button>`;
    });

    filterBar.innerHTML = html;
}

// Configura o Autocomplete Inteligente no Campo de Tópicos
export function setupTopicAutocomplete() {
    const input = document.getElementById('write-tag-input');
    const dropdown = document.getElementById('tag-autocomplete-dropdown');
    const container = document.getElementById('write-tag-autocomplete');

    if (!input || !dropdown) return;

    let highlightedIndex = -1;
    let currentSuggestions = [];

    function renderSuggestions(query = '') {
        const cleanQuery = query.trim().replace(/^#+/, '').toLowerCase();

        currentSuggestions = cachedSortedTopics.filter(tag => {
            const displayLabel = getTranslatedTopic(tag).toLowerCase();
            const raw = tag.toLowerCase();
            return !cleanQuery || displayLabel.includes(cleanQuery) || raw.includes(cleanQuery);
        });

        // Se o que foi digitado não estiver na lista de sugestões, adiciona opção de "Criar novo tópico"
        if (cleanQuery && !currentSuggestions.some(t => t.toLowerCase() === cleanQuery)) {
            const newTagName = normalizeTagName(query);
            currentSuggestions.unshift(newTagName);
        }

        if (currentSuggestions.length === 0) {
            dropdown.classList.add('hidden');
            return;
        }

        let html = '';
        currentSuggestions.slice(0, 8).forEach((tag, idx) => {
            const displayLabel = getTranslatedTopic(tag);
            const isHighlighted = idx === highlightedIndex;
            html += `
                <div class="tag-suggestion-item ${isHighlighted ? 'highlighted' : ''}" data-tag="${escapeHTML(tag)}" role="option">
                    <span>${escapeHTML(displayLabel)}</span>
                    <span class="tag-suggestion-badge">Tópico</span>
                </div>
            `;
        });

        dropdown.innerHTML = html;
        dropdown.classList.remove('hidden');
    }

    function selectSuggestion(tag) {
        if (!tag) return;
        const normalized = normalizeTagName(tag);
        const display = getTranslatedTopic(normalized);
        input.value = display;
        input.dataset.canonicalTag = normalized;
        dropdown.classList.add('hidden');
        highlightedIndex = -1;
    }

    input.addEventListener('focus', () => {
        highlightedIndex = -1;
        renderSuggestions(input.value === 'Geral' ? '' : input.value);
    });

    input.addEventListener('input', () => {
        highlightedIndex = -1;
        renderSuggestions(input.value);
    });

    input.addEventListener('keydown', e => {
        if (dropdown.classList.contains('hidden')) {
            if (e.key === 'ArrowDown') {
                renderSuggestions(input.value);
            }
            return;
        }

        const items = dropdown.querySelectorAll('.tag-suggestion-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = (highlightedIndex + 1) % items.length;
            renderSuggestions(input.value);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
            renderSuggestions(input.value);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (highlightedIndex >= 0 && highlightedIndex < currentSuggestions.length) {
                e.preventDefault();
                selectSuggestion(currentSuggestions[highlightedIndex]);
            } else if (currentSuggestions.length > 0) {
                selectSuggestion(currentSuggestions[0]);
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.add('hidden');
        }
    });

    dropdown.addEventListener('click', e => {
        const item = e.target.closest('.tag-suggestion-item');
        if (!item) return;
        const tag = item.dataset.tag;
        selectSuggestion(tag);
    });

    document.addEventListener('click', e => {
        if (container && !container.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

// Inicializa eventos da barra de tópicos e autocomplete
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

    setupTopicAutocomplete();
    fetchCommunityTopics();
}
