// =============================================================================
// Gnoteca — Módulo do Caderno Pessoal (Diário Intelectual / Livro)
// =============================================================================

import { STORAGE_KEYS, supabaseClient } from './config.js';
import { state, invalidateCache } from './state.js';
import { showActionFeedback } from './utils.js';
import { translate } from './i18n.js';

/**
 * Carrega todas as anotações do caderno privado do usuário.
 * @returns {Array<object>}
 */
export function getCadernoNotes() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.CADERNO_NOTES);
        if (!raw) return [];
        const notes = JSON.parse(raw);
        return Array.isArray(notes) ? notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [];
    } catch (e) {
        console.error('Erro ao ler Caderno Pessoal:', e);
        return [];
    }
}

/**
 * Salva uma nova nota no Caderno Pessoal.
 * @param {{ content: string, tag: string, citation?: string }} data
 * @returns {object}
 */
export function saveCadernoNote({ content, tag = 'Geral', citation = '' }) {
    const notes = getCadernoNotes();
    const newNote = {
        id: 'caderno_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        content: content.trim(),
        tag: tag.trim() || 'Geral',
        citation: citation.trim(),
        created_at: new Date().toISOString(),
        is_private: true
    };
    notes.unshift(newNote);
    localStorage.setItem(STORAGE_KEYS.CADERNO_NOTES, JSON.stringify(notes));
    return newNote;
}

/**
 * Deleta uma nota do Caderno Pessoal.
 * @param {string} id
 */
export function deleteCadernoNote(id) {
    let notes = getCadernoNotes();
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.CADERNO_NOTES, JSON.stringify(notes));
}

/**
 * Atualiza o conteúdo de uma nota do Caderno.
 * @param {string} id
 * @param {{ content: string, tag: string, citation?: string }} updates
 */
export function updateCadernoNote(id, { content, tag, citation }) {
    const notes = getCadernoNotes();
    const idx = notes.findIndex(n => n.id === id);
    if (idx !== -1) {
        notes[idx].content = content.trim();
        if (tag) notes[idx].tag = tag.trim();
        if (citation !== undefined) notes[idx].citation = citation.trim();
        notes[idx].updated_at = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.CADERNO_NOTES, JSON.stringify(notes));
    }
}

/**
 * Promove uma nota privada para o Acervo Público da Gnoteca (no Supabase).
 * @param {string} noteId
 * @returns {Promise<boolean>}
 */
export async function promoteNoteToPublic(noteId) {
    if (!state.authenticatedUser) {
        showActionFeedback(translate('signInToContinue') || 'Faça login para publicar no acervo');
        return false;
    }

    const notes = getCadernoNotes();
    const note = notes.find(n => n.id === noteId);
    if (!note) return false;

    // Se houver citação, anexa de forma elegante
    let finalContent = note.content;
    if (note.citation) {
        finalContent = `${note.content}\n\n— Fonte: ${note.citation}`;
    }

    if (finalContent.length > 280) {
        showActionFeedback('Para publicar no acervo público, o texto deve ter até 280 caracteres. Edite antes de promover.');
        return false;
    }

    try {
        const { error } = await supabaseClient
            .from('entries')
            .insert({
                author_id: state.authenticatedUser.id,
                content: finalContent,
                tag: note.tag || 'Geral'
            });

        if (error) {
            console.error('Erro ao promover nota:', error);
            showActionFeedback('Erro ao publicar fragmento no acervo.');
            return false;
        }

        // Remove do caderno após promover com sucesso
        deleteCadernoNote(noteId);
        invalidateCache();
        showActionFeedback('Ideia promovida ao Acervo Público com sucesso!');
        return true;
    } catch (err) {
        console.error('Exceção ao promover nota:', err);
        showActionFeedback('Ocorreu um erro ao promover.');
        return false;
    }
}
