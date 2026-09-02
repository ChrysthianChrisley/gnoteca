// =============================================================================
// Gnoteca — Módulo A Balança (Confronto Dialético & Síntese Coletiva)
// =============================================================================

import { supabaseClient } from './config.js';
import { state } from './state.js';
import { showActionFeedback, escapeHTML } from './utils.js';
import { showAuthGate } from './auth.js';

let dynamicDilemmas = [];
let currentPairIndex = 0;

/**
 * Busca dilemas criados pela comunidade no banco de dados.
 */
export async function fetchDilemmas() {
    try {
        const { data, error } = await supabaseClient
            .from('entries')
            .select(`
                id, content, created_at, author_id, metadata,
                profiles:author_id (id, display_name, username, title, avatar_url)
            `)
            .filter('metadata->is_dilemma', 'eq', 'true')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        
        if (data && data.length > 0) {
            dynamicDilemmas = data;
            currentPairIndex = 0;
            renderBalanca();
        } else {
            renderEmptyBalanca();
        }
    } catch (err) {
        console.error('Error fetching dilemmas:', err);
    }
}

/**
 * Renderiza estado vazio da Balança
 */
function renderEmptyBalanca() {
    const titleEl = document.querySelector('.balanca-title');
    const thesisContent = document.getElementById('balanca-thesis-content');
    const antithesisContent = document.getElementById('balanca-antithesis-content');
    const indicator = document.getElementById('balanca-dilemma-indicator');
    
    if (indicator) indicator.textContent = 'Nenhum dilema proposto ainda';
    if (titleEl) titleEl.textContent = 'A Balança de Ideias';
    if (thesisContent) thesisContent.textContent = "Proponha o primeiro dilema no Mural!";
    if (antithesisContent) antithesisContent.textContent = "Proponha o primeiro dilema no Mural!";
    
    const container = document.getElementById('syntheses-items');
    if (container) container.innerHTML = '';
}

/**
 * Renderiza o confronto atual da Balança.
 */
export function renderBalanca() {
    const dilemma = dynamicDilemmas[currentPairIndex];
    if (!dilemma) {
        renderEmptyBalanca();
        return;
    }

    const titleEl = document.querySelector('.balanca-title');
    const thesisAuthor = document.getElementById('balanca-thesis-author');
    const thesisContent = document.getElementById('balanca-thesis-content');
    
    const antithesisAuthor = document.getElementById('balanca-antithesis-author');
    const antithesisContent = document.getElementById('balanca-antithesis-content');

    if (titleEl) {
        titleEl.textContent = dilemma.content; // O título do dilema
    }

    if (thesisAuthor) thesisAuthor.textContent = ''; // Limpamos, pois não faz sentido um autor pra visão A e outro pra B
    if (thesisContent) thesisContent.textContent = `"${dilemma.metadata.view_a}"`;

    if (antithesisAuthor) antithesisAuthor.textContent = '';
    if (antithesisContent) antithesisContent.textContent = `"${dilemma.metadata.view_b}"`;

    renderSynthesesList(dilemma.id);
}

/**
 * Busca e renderiza os comentários (antigas sínteses) para o dilema
 */
async function renderSynthesesList(dilemmaId) {
    const container = document.getElementById('syntheses-items');
    if (!container) return;

    container.innerHTML = '<p style="color:var(--muted-color); padding: 1rem 0;">Carregando comentários...</p>';

    try {
        const { data: comments, error } = await supabaseClient
            .from('entries')
            .select(`
                id, content, created_at,
                profiles:author_id (id, display_name, username)
            `)
            .eq('parent_id', dilemmaId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!comments || comments.length === 0) {
            container.innerHTML = '<p class="empty-syntheses" style="font-style:italic; color:var(--muted-color); padding: 1rem 0;">Nenhum comentário ainda. Seja o primeiro a refletir sobre este dilema!</p>';
            return;
        }

        container.innerHTML = comments.map(c => {
            const author = c.profiles?.display_name || c.profiles?.username || 'Pensador';
            const dateObj = new Date(c.created_at);
            const dateStr = dateObj.toLocaleDateString();
            
            return `
            <div class="synthesis-card">
                <div class="synthesis-card-header">
                    <span class="synthesis-badge">Comentário</span>
                    <span class="synthesis-author">${escapeHTML(author)} • ${dateStr}</span>
                </div>
                <p class="synthesis-card-text">${escapeHTML(c.content)}</p>
                ${state.authenticatedUser && c.profiles?.id === state.authenticatedUser.id ? `
                <div class="synthesis-actions-bar" style="margin-top: 0.5rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="entry-action delete-synthesis" data-id="${c.id}" style="font-size: 0.75rem; color: #ef4444;">Apagar</button>
                </div>
                ` : ''}
            </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error fetching comments:', err);
        container.innerHTML = '<p style="color:var(--danger-color);">Erro ao carregar comentários.</p>';
    }
}

async function deleteSynthesis(id) {
    try {
        const { error } = await supabaseClient
            .from('entries')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        showActionFeedback('Comentário apagado.');
        renderSynthesesList(dynamicDilemmas[currentPairIndex].id);
    } catch (err) {
        console.error('Error deleting comment:', err);
        showActionFeedback('Erro ao apagar comentário.');
    }
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
        if (dynamicDilemmas.length <= 1) return;
        if (currentPairIndex > 0) {
            currentPairIndex--;
        } else {
            currentPairIndex = dynamicDilemmas.length - 1;
        }
        renderBalanca();
    });

    btnNext?.addEventListener('click', () => {
        if (dynamicDilemmas.length <= 1) return;
        if (currentPairIndex < dynamicDilemmas.length - 1) {
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
        btnSubmit.addEventListener('click', async () => {
            if (!state.authenticatedUser) {
                showAuthGate();
                return;
            }

            const text = input.value.trim();
            if (!text) {
                showActionFeedback('Escreva seu comentário antes de enviar.');
                return;
            }
            if (text.length > 280) {
                showActionFeedback('O comentário deve ter no máximo 280 caracteres.');
                return;
            }

            const currentDilemma = dynamicDilemmas[currentPairIndex];
            if (!currentDilemma) return;
            
            btnSubmit.disabled = true;

            try {
                const { error } = await supabaseClient
                    .from('entries')
                    .insert([{
                        content: text,
                        author_id: state.authenticatedUser.id,
                        parent_id: currentDilemma.id
                    }]);
                
                if (error) throw error;
                
                showActionFeedback('Comentário publicado!');
                input.value = '';
                if (counter) counter.textContent = '0 / 280';
                renderSynthesesList(currentDilemma.id);
            } catch (err) {
                console.error('Save synthesis error:', err);
                showActionFeedback('Erro ao publicar comentário.');
            } finally {
                btnSubmit.disabled = false;
            }
        });
    }

    // Delegação de eventos para Apagar Sínteses
    const synthesesContainer = document.getElementById('syntheses-items');
    if (synthesesContainer) {
        synthesesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-synthesis')) {
                const id = e.target.dataset.id;
                deleteSynthesis(id);
            }
        });
    }

    fetchDilemmas();
}
