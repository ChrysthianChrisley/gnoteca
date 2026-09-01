// =============================================================================
// Gnoteca — Módulo A Balança (Confronto Dialético & Síntese Coletiva)
// =============================================================================

import { state } from './state.js';
import { showActionFeedback, escapeHTML } from './utils.js';

const BALANCA_PAIRS = [
    {
        id: 'par-1',
        topic: 'Filosofia',
        thesis: {
            text: 'A solidão e o silêncio são os únicos santuários onde o pensamento pode amadurecer livre do ruído e da validação alheia.',
            author: 'Arthur Schopenhauer',
            citation: 'Aforismos para a Sabedoria da Vida'
        },
        antithesis: {
            text: 'O isolamento excessivo deforma o juízo; a sabedoria e a temperança só se desenvolvem e se testam no atrito diário com o outro.',
            author: 'Sêneca',
            citation: 'Cartas a Lucílio'
        }
    },
    {
        id: 'par-2',
        topic: 'Tecnologia & Vida',
        thesis: {
            text: 'A automação e a inteligência artificial libertam o ser humano do labor repetitivo, abrindo espaço para a verdadeira criatividade.',
            author: 'Visão Iluminista',
            citation: 'Elogio do Ócio Criativo'
        },
        antithesis: {
            text: 'Ao terceirizar o esforço cognitivo para as máquinas, atrofiamos a musculatura da reflexão profunda e o senso crítico autônomo.',
            author: 'Crítica Humanista',
            citation: 'O Homem Unidimensional'
        }
    }
];

let currentPairIndex = 0;

/**
 * Retorna as sínteses salvas no armazenamento local.
 * @returns {Array<object>}
 */
export function getStoredSyntheses() {
    try {
        const raw = localStorage.getItem('gnoteca_balanca_syntheses');
        return raw ? JSON.parse(raw) : [
            {
                id: 'syn-1',
                pairId: 'par-1',
                authorName: 'Pensador da Gnoteca',
                content: 'A solitude fornece o combustível da contemplação, mas a vida em comunidade é a fornalha onde as ideias são postas à prova.',
                date: 'Recente'
            }
        ];
    } catch {
        return [];
    }
}

/**
 * Salva uma nova proposta de síntese.
 * @param {string} pairId
 * @param {string} content
 */
export function saveSynthesis(pairId, content) {
    const list = getStoredSyntheses();
    const newSyn = {
        id: 'syn_' + Date.now(),
        pairId,
        authorName: state.authenticatedUser ? (state.authenticatedUser.name || 'Pensador') : 'Visitante Anônimo',
        content: content.trim(),
        date: 'Agora'
    };
    list.unshift(newSyn);
    localStorage.setItem('gnoteca_balanca_syntheses', JSON.stringify(list));
    return newSyn;
}

/**
 * Renderiza o confronto atual da Balança.
 */
export function renderBalanca() {
    const pair = BALANCA_PAIRS[currentPairIndex];
    if (!pair) return;

    const thesisContent = document.getElementById('balanca-thesis-content');
    const thesisCitation = document.querySelector('#balanca-thesis-card .balanca-citation');
    const antithesisContent = document.getElementById('balanca-antithesis-content');
    const antithesisCitation = document.querySelector('#balanca-antithesis-card .balanca-citation');

    if (thesisContent) thesisContent.textContent = `"${pair.thesis.text}"`;
    if (thesisCitation) thesisCitation.textContent = `— ${pair.thesis.author}, ${pair.thesis.citation}`;

    if (antithesisContent) antithesisContent.textContent = `"${pair.antithesis.text}"`;
    if (antithesisCitation) antithesisCitation.textContent = `— ${pair.antithesis.author}, ${pair.antithesis.citation}`;

    renderSynthesesList(pair.id);
}

/**
 * Renderiza a lista de sínteses submetidas para o par de perspectivas.
 * @param {string} pairId
 */
function renderSynthesesList(pairId) {
    const container = document.getElementById('syntheses-items');
    if (!container) return;

    const list = getStoredSyntheses().filter(s => s.pairId === pairId || !s.pairId);
    if (list.length === 0) {
        container.innerHTML = '<p class="empty-syntheses">Nenhuma síntese forjada ainda. Seja o primeiro a conciliar estes polos!</p>';
        return;
    }

    container.innerHTML = list.map(s => `
        <div class="synthesis-card">
            <div class="synthesis-card-header">
                <span class="synthesis-badge">Síntese Proposta</span>
                <span class="synthesis-author">${escapeHTML(s.authorName)} • ${escapeHTML(s.date)}</span>
            </div>
            <p class="synthesis-card-text">${escapeHTML(s.content)}</p>
        </div>
    `).join('');
}

/**
 * Inicializa os ouvintes e eventos da Balança.
 */
export function initBalanca() {
    const input = document.getElementById('balanca-synthesis-input');
    const counter = document.getElementById('balanca-char-counter');
    const btnSubmit = document.getElementById('btn-submit-synthesis');

    if (input && counter) {
        input.addEventListener('input', () => {
            const len = input.value.length;
            counter.textContent = `${len} / 280`;
        });
    }

    if (btnSubmit && input) {
        btnSubmit.addEventListener('click', () => {
            const text = input.value.trim();
            if (!text) {
                showActionFeedback('Escreva sua síntese antes de enviar.');
                return;
            }
            if (text.length > 280) {
                showActionFeedback('A síntese deve ter no máximo 280 caracteres.');
                return;
            }

            const currentPair = BALANCA_PAIRS[currentPairIndex];
            saveSynthesis(currentPair.id, text);
            input.value = '';
            if (counter) counter.textContent = '0 / 280';
            renderSynthesesList(currentPair.id);
            showActionFeedback('Síntese compartilhada com sucesso!');
        });
    }

    renderBalanca();
}
