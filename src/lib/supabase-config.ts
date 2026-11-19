/* Supabase próprio do projeto (não é o Lovable Cloud).
 * A chave publicável é pública por definição e pode ir no front; a segurança está no RLS.
 * VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY, se definidas no build, têm prioridade. */
const env = import.meta.env as Record<string, string | undefined>;

export const SUPABASE_URL = env["VITE_SUPABASE_URL"] || "https://ljyzlbnctimhluixzjgb.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "sb_publishable_hcHv21WmP_5fUZTKJkRVZQ_2ZkvhHhI";

/** Domínios aceitos no cadastro (o banco também barra os demais). */
export const ALLOWED_EMAIL_DOMAINS = ["estacio.br", "yduqs.com.br"];

/** Bucket privado das fotos de avatar: caminho <user_id>/<arquivo>. */
export const AVATAR_BUCKET = "avatars";
