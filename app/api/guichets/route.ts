import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { createGuichetSchema } from "@/lib/validations"
import { ZodError } from "zod"

// The guichets table has no caissier_uid column.
// Caissier assignment is tracked via users.guichet_id.

export async function GET() {
  return withAuth(["admin", "superviseur", "caissier"], async () => {
    const { data, error } = await adminSupabase
      .from("guichets")
      .select("*")
      .order("numero", { ascending: true })

    if (error) return err("Erreur lors de la récupération des guichets", 500)

    // Resolve caissier assignments from users table
    const { data: usersWithGuichet } = await adminSupabase
      .from("users")
      .select("id, guichet_id")
      .not("guichet_id", "is", null)

    const caissierByGuichet = new Map(
      (usersWithGuichet ?? []).map(u => [u.guichet_id as string, u.id as string])
    )

    return ok((data ?? []).map(row => ({
      ...mapGuichet(row),
      caissierUid: caissierByGuichet.get(row.id as string),
    })))
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

      const { data: guichet, error: insertError } = await adminSupabase
        .from("guichets")
        .insert({
          numero:       data.numero,
          nom:          data.nom,
          service_code: data.serviceCode,
          statut:       data.statut,
        })
        .select()
        .single()

      if (insertError) return err(`Erreur lors de la création du guichet: ${insertError.message}`, 500)

      // Assign caissier via users table — release any previous assignment first
      if (data.caissierUid) {
        await adminSupabase.from("users").update({ guichet_id: null }).eq("id", data.caissierUid)
        const { error: assignErr } = await adminSupabase.from("users").update({ guichet_id: guichet.id }).eq("id", data.caissierUid)
        if (assignErr) console.error("[POST /api/guichets] caissier assign error:", assignErr.message)
      }

      return ok({ ...mapGuichet(guichet), caissierUid: data.caissierUid ?? undefined }, 201)
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
    statut:        row.statut,
    ticketEnCours: row.ticket_en_cours ?? undefined,
    updatedAt:     row.updated_at,
  }
}
