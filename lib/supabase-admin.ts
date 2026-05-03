import { createClient } from "@supabase/supabase-js"

// Le client est créé avec des valeurs par défaut si les variables ne sont pas définies
// (permet au build de passer sans .env.local). Les appels API échoueront au runtime
// si les vraies clés ne sont pas configurées.
export const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-build-only",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
