import { showActionFeedback } from './utils.js';

let currentShareIdea = null;

// Geração de Citação e Links para Compartilhamento
export function getSharePayload(idea) {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const directUrl = `${origin}${pathname}#/f/${idea.id}`;
    const author = idea.authorName || 'Pensador';
    const text = `“${idea.content}”\n— ${author}\n\nLeia na Gnoteca: ${directUrl}`;
    return { directUrl, author, text, quote: `“${idea.content}” — ${author}` };
}

export function shareToWhatsApp(idea) {
    const { text } = getSharePayload(idea);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

export function shareToTwitter(idea) {
    const { directUrl, quote } = getSharePayload(idea);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(quote)}&url=${encodeURIComponent(directUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

export function shareToTelegram(idea) {
    const { directUrl, quote } = getSharePayload(idea);
    const url = `https://t.me/share/url?url=${encodeURIComponent(directUrl)}&text=${encodeURIComponent(quote)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

export function copyFormattedQuote(idea) {
    const { text } = getSharePayload(idea);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showActionFeedback('Citação com link copiada para a área de transferência!');
        }).catch(() => {
            showActionFeedback('Citação copiada!');
        });
    } else {
        prompt('Copie a citação:', text);
    }
}

// Modal de Compartilhamento
export async function openShareModal(idea) {
    currentShareIdea = idea;

    // Se estiver em dispositivo móvel com suporte a Web Share nativo, tenta abrir gaveta nativa
    if (navigator.share && window.innerWidth <= 768) {
        try {
            const { directUrl, quote } = getSharePayload(idea);
            await navigator.share({
                title: 'Gnoteca | Fragmento de Conhecimento',
                text: quote,
                url: directUrl
            });
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    const dialog = document.getElementById('share-card-dialog');
    const quotePreview = document.getElementById('share-quote-preview');
    const authorPreview = document.getElementById('share-author-preview');

    if (quotePreview) quotePreview.textContent = `“${idea.content}”`;
    if (authorPreview) authorPreview.textContent = `— ${idea.authorName || 'Pensador'}`;

    dialog?.classList.remove('hidden');
}

export function closeShareModal() {
    currentShareIdea = null;
    const dialog = document.getElementById('share-card-dialog');
    dialog?.classList.add('hidden');
}

// Configuração dos Event Listeners do Modal
export function setupShareListeners() {
    const closeBtn = document.getElementById('close-share-dialog');
    const dialog = document.getElementById('share-card-dialog');
    const btnWhatsApp = document.getElementById('btn-share-whatsapp');
    const btnTwitter = document.getElementById('btn-share-twitter');
    const btnTelegram = document.getElementById('btn-share-telegram');
    const btnCopyQuote = document.getElementById('btn-share-copy');

    closeBtn?.addEventListener('click', closeShareModal);
    dialog?.addEventListener('click', event => {
        if (event.target === dialog) closeShareModal();
    });

    btnWhatsApp?.addEventListener('click', () => {
        if (currentShareIdea) shareToWhatsApp(currentShareIdea);
    });

    btnTwitter?.addEventListener('click', () => {
        if (currentShareIdea) shareToTwitter(currentShareIdea);
    });

    btnTelegram?.addEventListener('click', () => {
        if (currentShareIdea) shareToTelegram(currentShareIdea);
    });

    btnCopyQuote?.addEventListener('click', () => {
        if (currentShareIdea) copyFormattedQuote(currentShareIdea);
    });
}
