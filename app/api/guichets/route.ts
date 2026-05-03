import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { createGuichetSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET() {
  return withAuth(["admin", "superviseur", "caissier"], async () => {
    const { data, error } = await adminSupabase
      .from("guichets")
      .select("*")
      .order("numero", { ascending: true })

    if (error) return err("Erreur lors de la récupération des guichets", 500)
    return ok((data ?? []).map(mapGuichet))
  })
}

export async function POST(request: NextRequest) {
  return withAuth(["admin"], async () => {
    try {
      const json = await request.json()
      const data = createGuichetSchema.parse(json)

      const { data: dupNumero } = await adminSupabase
        .from("guichets").select("id").eq("numero", data.numero).limit(1)
      if (dupNumero && dupNumero.length > 0)
        return err(`Le guichet numéro ${data.numero} existe déjà`, 409)

      if (data.caissierUid) {
        const { data: dupCaissier } = await adminSupabase
          .from("guichets").select("id").eq("caissier_uid", data.caissierUid).limit(1)
        if (dupCaissier && dupCaissier.length > 0)
          return err("Ce caissier est déjà assigné à un autre guichet", 409)
      }

      const { data: guichet, error: insertError } = await adminSupabase
        .from("guichets")
        .insert({
          numero:      data.numero,
          nom:         data.nom,
          service_code: data.serviceCode,
          caissier_uid: data.caissierUid ?? null,
          statut:      data.statut,
          ticket_en_cours: null,
          updated_at:  new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) return err("Erreur lors de la création du guichet", 500)
      return ok(mapGuichet(guichet), 201)
    } catch (e) {
      if (e instanceof ZodError) return handleZodError(e)
      return err("Erreur lors de la création du guichet", 500)
    }
  })
}

function mapGuichet(row: Record<string, unknown>) {
  return {
    id:            row.id,
    numero:        row.numero,
    nom:           row.nom,
    serviceCode:   row.service_code,
    caissierUid:   row.caissier_uid ?? undefined,
    statut:        row.statut,
    ticketEnCours: row.ticket_en_cours ?? undefined,
    updatedAt:     row.updated_at,
  }
}
