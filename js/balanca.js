// =============================================================================
// Gnoteca — Módulo A Balança (Confronto Dialético & Síntese Coletiva)
// =============================================================================

import { state } from './state.js';
import { showActionFeedback, escapeHTML } from './utils.js';

const BALANCA_PAIRS = [
    {
        id: 'par-1',
        title: 'Trabalho Remoto vs. Presencial',
        thesis: {
            text: 'O trabalho remoto liberta as pessoas do trânsito, dando mais tempo para a família e qualidade de vida.',
            author: 'Defensor do Remoto',
            citation: ''
        },
        antithesis: {
            text: 'Trabalhar em casa nos isola. É no convívio presencial que a cultura, a amizade e as ideias criativas nascem.',
            author: 'Defensor do Presencial',
            citation: ''
        }
    },
    {
        id: 'par-2',
        title: 'Livro Físico vs. Leitura Digital',
        thesis: {
            text: 'O livro físico proporciona uma experiência tátil única. O cheiro do papel e o peso do livro ajudam na imersão e na memória.',
            author: 'Leitor Tradicional',
            citation: ''
        },
        antithesis: {
            text: 'Os leitores digitais permitem carregar mil livros no bolso, ler no escuro e pesquisar palavras instantaneamente. É o futuro inevitável.',
            author: 'Entusiasta Digital',
            citation: ''
        }
    },
    {
        id: 'par-3',
        title: 'Buscar Paixão vs. Buscar Estabilidade',
        thesis: {
            text: 'A vida é curta demais para trabalhar com algo que você não ama. Siga sua paixão, e o sucesso financeiro virá como consequência.',
            author: 'Visão Romântica',
            citation: ''
        },
        antithesis: {
            text: 'Paixões mudam com o tempo. É melhor garantir estabilidade financeira primeiro para então financiar seus hobbies e paixões nas horas livres.',
            author: 'Visão Pragmática',
            citation: ''
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
            },
            {
                id: 'syn-2',
                pairId: 'par-2',
                authorName: 'Explorador do Saber',
                content: 'A máquina deve ser tratada como o cinzel que esculpe a pedra, nunca como o escultor que concebe a forma.',
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
        authorName: state.authenticatedUser ? (state.authenticatedUser.name || 'Pensador') : 'Você',
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

    const indicator = document.getElementById('balanca-dilemma-indicator');
    const thesisAuthor = document.getElementById('balanca-thesis-author');
    const thesisContent = document.getElementById('balanca-thesis-content');
    const thesisCitation = document.querySelector('#balanca-thesis-card .balanca-citation');

    const antithesisAuthor = document.getElementById('balanca-antithesis-author');
    const antithesisContent = document.getElementById('balanca-antithesis-content');
    const antithesisCitation = document.querySelector('#balanca-antithesis-card .balanca-citation');

    if (indicator) {
        indicator.textContent = `Dilema ${currentPairIndex + 1} de ${BALANCA_PAIRS.length}: ${pair.title}`;
    }

    if (thesisAuthor) thesisAuthor.textContent = pair.thesis.author;
    if (thesisContent) thesisContent.textContent = `"${pair.thesis.text}"`;
    if (thesisCitation) thesisCitation.textContent = `— Citação: ${pair.thesis.citation}`;

    if (antithesisAuthor) antithesisAuthor.textContent = pair.antithesis.author;
    if (antithesisContent) antithesisContent.textContent = `"${pair.antithesis.text}"`;
    if (antithesisCitation) antithesisCitation.textContent = `— Citação: ${pair.antithesis.citation}`;

    renderSynthesesList(pair.id);
}

/**
 * Renderiza a lista de sínteses submetidas para o par de perspectivas.
 * @param {string} pairId
 */
function renderSynthesesList(pairId) {
    const container = document.getElementById('syntheses-items');
    if (!container) return;

    const list = getStoredSyntheses().filter(s => s.pairId === pairId);
    if (list.length === 0) {
        container.innerHTML = '<p class="empty-syntheses" style="font-style:italic; color:var(--muted-color); padding: 1rem 0;">Nenhuma síntese forjada para este dilema ainda. Seja o primeiro a redigir a união destas verdades!</p>';
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
    const btnPrev = document.getElementById('btn-balanca-prev');
    const btnNext = document.getElementById('btn-balanca-next');

    btnPrev?.addEventListener('click', () => {
        if (currentPairIndex > 0) {
            currentPairIndex--;
        } else {
            currentPairIndex = BALANCA_PAIRS.length - 1;
        }
        renderBalanca();
    });

    btnNext?.addEventListener('click', () => {
        if (currentPairIndex < BALANCA_PAIRS.length - 1) {
            currentPairIndex++;
        } else {
            currentPairIndex = 0;
        }
        renderBalanca();
    });

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
