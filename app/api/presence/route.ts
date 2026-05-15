import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth } from "@/lib/api-helpers"

export async function GET() {
  return withAuth(["admin", "superviseur"], async () => {
    const { data, error } = await adminSupabase
      .from("presence")
      .select("user_id, en_ligne, depuis")

    if (error) return err("Erreur lors de la récupération des présences", 500)

    const TTL_MS = 3 * 60 * 1000
    const result: Record<string, boolean> = {}
    for (const row of data ?? []) {
      const isRecent = row.depuis && (Date.now() - new Date(row.depuis).getTime()) < TTL_MS
      result[row.user_id] = row.en_ligne === true && Boolean(isRecent)
    }

    return ok(result)
  })
}
