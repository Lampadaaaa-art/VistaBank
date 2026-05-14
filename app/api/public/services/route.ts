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
    id:          (row.code ?? '') as string,
    code:        row.code as string,
    nom:         row.nom as string,
    icone:       row.icone as string | undefined,
    tempsEstime: row.temps_estime as number,
    actif:       row.actif as boolean,
    ordre:       row.ordre as number,
  }
}
