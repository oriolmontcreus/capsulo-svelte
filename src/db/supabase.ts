import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

/** Persiste sesión en cookies para que el middleware de Cloudflare Pages pueda validar con `getUser()`. */
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);