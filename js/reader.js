// =============================================================================
// Gnoteca — Modo de Leitura Contemplativa (Anti-Scroll com Respiração)
// =============================================================================

import { state } from './state.js';
import { escapeHTML } from './utils.js';
import { getTranslatedTopic } from './i18n.js';

let zenEntries = [];
let currentZenIndex = 0;
let isZenActive = false;

/**
 * Inicializa e abre o leitor contemplativo com os fragmentos atuais.
 * @param {Array<object>} [entries]
 */
export function openZenReader(entries = []) {
    zenEntries = Array.isArray(entries) && entries.length > 0 ? entries : [];
    
    // Se não passar entries, tenta usar o que está na lista de ideias do feed
    if (zenEntries.length === 0) {
        const cards = document.querySelectorAll('#ideas-list .idea-card:not(.blurred-teaser)');
        cards.forEach((c) => {
            const contentEl = c.querySelector('.idea-content');
            const authorEl = c.querySelector('.author-link');
            const tagEl = c.querySelector('.card-tag-pill');
            const citationEl = c.querySelector('.card-citation');
            if (contentEl) {
                zenEntries.push({
                    content: contentEl.innerText || contentEl.textContent,
                    authorName: authorEl ? (authorEl.innerText || authorEl.textContent).trim() : 'Pensador',
                    tag: tagEl ? (tagEl.dataset.tag || tagEl.textContent.trim()) : 'Geral',
                    citation: citationEl ? citationEl.innerText.replace(/^—\s*Fonte:\s*/i, '').trim() : ''
                });
            }
        });
    }

    if (zenEntries.length === 0) {
        alert('Nenhum pensamento disponível para leitura contemplativa no momento.');
        return;
    }

    currentZenIndex = 0;
    isZenActive = true;

    const overlay = document.getElementById('zen-reader-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        renderCurrentZenEntry();
    }
}

/**
 * Fecha o leitor contemplativo.
 */
export function closeZenReader() {
    isZenActive = false;
    const overlay = document.getElementById('zen-reader-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

/**
 * Renderiza o pensamento atual no modo contemplativo com animação suave.
 */
function renderCurrentZenEntry() {
    if (!zenEntries || zenEntries.length === 0) return;
    const entry = zenEntries[currentZenIndex];

    const contentEl = document.getElementById('zen-content');
    const authorEl = document.getElementById('zen-author');
    const tagEl = document.getElementById('zen-tag');
    const citationEl = document.getElementById('zen-citation');
    const progressEl = document.getElementById('zen-progress');
    const cardEl = document.getElementById('zen-current-card');

    if (cardEl) {
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'translateY(12px)';
    }

    setTimeout(() => {
        if (contentEl) contentEl.textContent = entry.content;
        if (authorEl) authorEl.textContent = `por ${entry.authorName || 'Pensador'}`;
        if (tagEl) tagEl.textContent = getTranslatedTopic(entry.tag || 'Geral');
        if (progressEl) progressEl.textContent = `${currentZenIndex + 1} de ${zenEntries.length}`;

        if (citationEl) {
            if (entry.citation) {
                citationEl.textContent = `— Fonte: ${entry.citation}`;
                citationEl.classList.remove('hidden');
            } else {
                citationEl.classList.add('hidden');
            }
        }

        if (cardEl) {
            cardEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            cardEl.style.opacity = '1';
            cardEl.style.transform = 'translateY(0)';
        }
    }, 150);
}

/**
 * Avança para o próximo pensamento.
 */
export function nextZenEntry() {
    if (currentZenIndex < zenEntries.length - 1) {
        currentZenIndex++;
        renderCurrentZenEntry();
    } else {
        // Volta ao primeiro ao terminar
        currentZenIndex = 0;
        renderCurrentZenEntry();
    }
}

/**
 * Volta para o pensamento anterior.
 */
export function prevZenEntry() {
    if (currentZenIndex > 0) {
        currentZenIndex--;
        renderCurrentZenEntry();
    }
}

/**
 * Registra os eventos do leitor contemplativo.
 */
export function initZenReader() {
    const btnOpen = document.getElementById('btn-open-zen-reader');
    const btnClose = document.getElementById('btn-close-zen');
    const btnNext = document.getElementById('btn-zen-next');
    const btnPrev = document.getElementById('btn-zen-prev');
    const overlay = document.getElementById('zen-reader-overlay');

    if (btnOpen) {
        btnOpen.addEventListener('click', () => openZenReader());
    }

    if (btnClose) {
        btnClose.addEventListener('click', closeZenReader);
    }

    if (btnNext) {
        btnNext.addEventListener('click', nextZenEntry);
    }

    if (btnPrev) {
        btnPrev.addEventListener('click', prevZenEntry);
    }

    // Atalhos de teclado
    window.addEventListener('keydown', (e) => {
        if (!isZenActive) return;
        if (e.key === 'Escape') closeZenReader();
        if (e.key === 'ArrowRight' || e.key === 'Space') {
            e.preventDefault();
            nextZenEntry();
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevZenEntry();
        }
    });
}
