// Configurações do Supabase e Constantes Globais
export const SUPABASE_URL = 'https://vavitcyykwqqmjqkhyna.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5hBpKXPuMB0HmAuyww6WcA_I7C55xwa';

// Instância do Cliente Supabase (injetada via CDN no index.html)
export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Constantes de Interface e Paginação
export const MAX_LENGTH = 280;
export const PAGE_SIZE = 6;
export const PUBLIC_FEED_LIMIT = 3;
export const CACHE_TTL_MS = 60 * 1000; // 1 minuto de cache em memória
export const PROJECT_BASE_PATH = window.location.pathname.startsWith('/gnoteca') ? '/gnoteca' : '';
