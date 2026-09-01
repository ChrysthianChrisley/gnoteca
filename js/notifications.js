import { supabaseClient } from './config.js';
import { state } from './state.js';
import { translate } from './i18n.js';
import { escapeHTML } from './utils.js';

let notificationsList = [];
let realtimeSubscription = null;
let pollTimer = null;

// Busca Notificações do Usuário Autenticado
export async function fetchUserNotifications() {
    if (!state.authenticatedUser) {
        notificationsList = [];
        updateNotificationsBadge();
        return [];
    }

    try {
        const { data: notifs, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', state.authenticatedUser.id)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) {
            console.warn('fetchUserNotifications error:', error);
            return [];
        }

        if (!notifs || notifs.length === 0) {
            notificationsList = [];
            updateNotificationsBadge();
            return [];
        }

        // Busca os perfis dos autores das ações
        const actorIds = [...new Set(notifs.map(n => n.actor_id).filter(Boolean))];
        let profilesMap = {};
        if (actorIds.length > 0) {
            const { data: profiles } = await supabaseClient
                .from('profiles')
                .select('id, username, display_name, avatar_url')
                .in('id', actorIds);

            (profiles || []).forEach(p => {
                profilesMap[p.id] = p;
            });
        }

        notificationsList = notifs.map(n => ({
            ...n,
            profiles: profilesMap[n.actor_id] || null
        }));

        updateNotificationsBadge();
        return notificationsList;
    } catch (err) {
        console.warn('fetchUserNotifications catch:', err);
        return [];
    }
}

// Atualiza o Badge Indicador no Cabeçalho
export function updateNotificationsBadge() {
    const badge = document.getElementById('notifications-badge');
    const btnNotifications = document.getElementById('btn-notifications');
    if (!badge || !btnNotifications) return;

    if (!state.authenticatedUser) {
        btnNotifications.classList.add('hidden');
        badge.classList.add('hidden');
        return;
    }

    btnNotifications.classList.remove('hidden');
    const unreadCount = notificationsList.filter(n => !n.read).length;

    if (unreadCount > 0) {
        badge.classList.remove('hidden');
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
        badge.classList.add('hidden');
        badge.textContent = '';
    }
}

// Abre o Modal/Painel de Notificações
export async function openNotificationsDialog() {
    const dialog = document.getElementById('notifications-dialog');
    if (!dialog) return;

    dialog.classList.remove('hidden');
    renderNotificationsList();
    await fetchUserNotifications();
    renderNotificationsList();
}

// Fecha o Modal de Notificações
export function closeNotificationsDialog() {
    const dialog = document.getElementById('notifications-dialog');
    dialog?.classList.add('hidden');
}

// Renderiza a Lista de Notificações
export function renderNotificationsList() {
    const container = document.getElementById('notifications-list-container');
    if (!container) return;

    if (notificationsList.length === 0) {
        container.innerHTML = `<p class="notifications-empty">${translate('noNotifications')}</p>`;
        return;
    }

    container.innerHTML = notificationsList.map(n => {
        const actorName = n.profiles?.display_name || n.profiles?.username || 'Alguém';
        const actorAvatar = n.profiles?.avatar_url
            ? `<img class="notif-actor-avatar" src="${escapeHTML(n.profiles.avatar_url)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`
            : `<span class="notif-actor-avatar placeholder">${escapeHTML(actorName.charAt(0).toUpperCase())}</span>`;

        let actionText = '';
        if (n.type === 'vote_up') actionText = translate('notifVoteUp');
        else if (n.type === 'favorite') actionText = translate('notifFavorite');
        else if (n.type === 'comment') actionText = translate('notifComment');
        else if (n.type === 'reply') actionText = translate('notifReply');

        const unreadClass = n.read ? '' : ' unread';
        const timeAgo = formatRelativeTime(n.created_at);

        return `
            <div class="notification-item${unreadClass}" data-notif-id="${n.id}" data-entry-id="${n.entry_id || ''}" data-type="${n.type || ''}">
                ${actorAvatar}
                <div class="notif-body">
                    <p class="notif-text"><strong>${escapeHTML(actorName)}</strong> ${escapeHTML(actionText)}</p>
                    <span class="notif-time">${timeAgo}</span>
                </div>
                ${!n.read ? '<span class="notif-unread-dot" aria-label="Não lida"></span>' : ''}
            </div>
        `;
    }).join('');
}

// Formatação de Tempo Relativo
function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
    return `há ${Math.floor(diff / 86400)} d`;
}

// Marca uma Notificação Específica como Lida
export async function markNotificationAsRead(notifId) {
    const notif = notificationsList.find(n => n.id === notifId);
    if (notif && !notif.read) {
        notif.read = true;
        updateNotificationsBadge();
        renderNotificationsList();

        try {
            await supabaseClient
                .from('notifications')
                .update({ read: true })
                .eq('id', notifId);
        } catch (err) {
            console.warn('markNotificationAsRead err:', err);
        }
    }
}

// Marca Todas as Notificações como Lidas
export async function markAllNotificationsAsRead() {
    if (!state.authenticatedUser || notificationsList.length === 0) return;

    notificationsList.forEach(n => { n.read = true; });
    updateNotificationsBadge();
    renderNotificationsList();

    try {
        await supabaseClient
            .from('notifications')
            .update({ read: true })
            .eq('user_id', state.authenticatedUser.id)
            .eq('read', false);
    } catch (err) {
        console.warn('markAllNotificationsAsRead err:', err);
    }
}

// Inicia Escuta Realtime e Polling Periódico de Notificações
export function setupNotificationsRealtime() {
    if (realtimeSubscription) {
        supabaseClient.removeChannel(realtimeSubscription);
        realtimeSubscription = null;
    }
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }

    if (!state.authenticatedUser) return;

    try {
        realtimeSubscription = supabaseClient
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${state.authenticatedUser.id}`
                },
                async () => {
                    await fetchUserNotifications();
                }
            )
            .subscribe();
    } catch (err) {
        console.warn('setupNotificationsRealtime catch:', err);
    }

    // Polling de redundância a cada 8 segundos
    pollTimer = setInterval(() => {
        if (state.authenticatedUser && !document.hidden) {
            fetchUserNotifications();
        }
    }, 8000);
}

// Inicialização Geral do Módulo
export function initNotifications() {
    fetchUserNotifications();
    setupNotificationsRealtime();
}
