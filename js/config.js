// Configurações do Supabase e Constantes Globais
export const SUPABASE_URL = 'https://vavitcyykwqqmjqkhyna.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5hBpKXPuMB0HmAuyww6WcA_I7C55xwa';

// Instância do Cliente Supabase com persistência de sessão e auto-refresh ativados
export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
    }
});

// Constantes de Interface e Paginação
export const MAX_LENGTH = 280;
export const PAGE_SIZE = 6;
export const PUBLIC_FEED_LIMIT = 3;
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache em memória
export const PROJECT_BASE_PATH = window.location.pathname.startsWith('/gnoteca') ? '/gnoteca' : '';

// Chaves do localStorage — fonte única da verdade para persistência local
export const STORAGE_KEYS = {
    DARK_MODE:      'gnoteca_dark_mode',
    LANGUAGE:       'gnoteca_language',
    COOKIE_CONSENT: 'gnoteca_cookie_consent',
    PULSE:          'gnoteca_setting_pulse',
    DENSITY:        'gnoteca_setting_density',
    FONT_SIZE:      'gnoteca_setting_fontsize',
    AUTOSAVE:       'gnoteca_setting_autosave',
    CONFIRM_DELETE: 'gnoteca_setting_confirm_delete',
    DRAFT:          'gnoteca_draft_idea',
    CADERNO_NOTES:  'gnoteca_caderno_notes',
    /** @param {string} uid - ID do usuário autenticado */
    PROFILE_CACHE:  (uid) => `gnoteca_profile_cache_${uid}`,
};

