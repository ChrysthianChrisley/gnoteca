// =============================================================================
// Gnoteca — Configuração do Ambiente (TEMPLATE)
// =============================================================================
// Este é o arquivo de TEMPLATE. Para rodar o projeto:
//   1. Copie este arquivo: cp js/config.example.js js/config.js
//   2. Substitua os valores abaixo pelas suas chaves reais do Supabase.
//   3. O arquivo js/config.js está no .gitignore e NAO deve ser versionado.
//
// Onde encontrar as chaves:
//   Painel Supabase > Project Settings > API
// =============================================================================

// URL do seu projeto Supabase
export const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';

// Chave pública (anon/publishable) — NAO é a service_role key.
// Esta chave é segura para o frontend pois o acesso aos dados
// é controlado pelo Row Level Security (RLS) no banco de dados.
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_SUA_CHAVE_AQUI';

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
    /** @param {string} uid - ID do usuário autenticado */
    PROFILE_CACHE:  (uid) => `gnoteca_profile_cache_${uid}`,
};

