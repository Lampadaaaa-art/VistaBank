import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err } from "@/lib/api-helpers"

export async function GET() {
  try {
    const { data, error } = await adminSupabase
      .from("services")
      .select("*")
      .eq("actif", true)
      .order("ordre", { ascending: true })

    if (error) return err("Erreur lors de la récupération des services", 500)

    return ok((data ?? []).map(mapService))
  } catch {
    return err("Erreur lors de la récupération des services", 500)
  }
}

function mapService(row: Record<string, unknown>) {
  return {
    id:          row.id,
    code:        row.code,
    nom:         row.nom,
    icone:       row.icone ?? undefined,
    tempsEstime: row.temps_estime,
    actif:       row.actif,
    ordre:       row.ordre,
  }
}
