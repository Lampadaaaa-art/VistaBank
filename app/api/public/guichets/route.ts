import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err } from "@/lib/api-helpers"

export async function GET() {
  try {
    const { data, error } = await adminSupabase
      .from("guichets")
      .select("*")
      .order("numero", { ascending: true })

    if (error) return err("Erreur lors de la récupération des guichets", 500)

    return ok((data ?? []).map(mapGuichet))
  } catch {
    return err("Erreur lors de la récupération des guichets", 500)
  }
}

function mapGuichet(row: Record<string, unknown>) {
  return {
    id:            row.id,
    numero:        row.numero,
    nom:           row.nom,
    serviceCode:   row.service_code,
    statut:        row.statut,
    ticketEnCours: row.ticket_en_cours ?? undefined,
    updatedAt:     row.updated_at,
  }
}
