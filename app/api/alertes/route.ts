import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { createAlerteSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET(request: NextRequest) {
  return withAuth(["admin", "superviseur"], async () => {
    const { searchParams } = new URL(request.url)
    const resolue = searchParams.get("resolue")

    let q = adminSupabase.from("alertes").select("*").order("created_at", { ascending: false })

    if (resolue !== null) q = q.eq("resolue", resolue === "true")

    const { data, error } = await q
    if (error) return err("Erreur lors de la récupération des alertes", 500)
    return ok((data ?? []).map(mapAlerte))
  })
}

export async function POST(request: NextRequest) {
  return withAuth(["admin", "superviseur", "caissier"], async () => {
    try {
      const json = await request.json()
      const data = createAlerteSchema.parse(json)

      const { data: alerte, error: insertError } = await adminSupabase
        .from("alertes")
        .insert({
          type:       data.type,
          severite:   data.severite,
          titre:      data.titre,
          message:    data.message,
          guichet_id: data.guichetId ?? null,
          ticket_id:  data.ticketId  ?? null,
          resolue:    false,
        })
        .select()
        .single()

      if (insertError) {
        console.error("[alertes POST] Supabase error:", insertError)
        return err(insertError.message ?? "Erreur lors de la création de l'alerte", 500)
      }
      return ok(mapAlerte(alerte), 201)
    } catch (e) {
      if (e instanceof ZodError) return handleZodError(e)
      console.error("[alertes POST] unexpected error:", e)
      return err(e instanceof Error ? e.message : "Erreur lors de la création de l'alerte", 500)
    }
  })
}

function mapAlerte(row: Record<string, unknown>) {
  return {
    id:            row.id,
    type:          row.type,
    severite:      row.severite,
    titre:         row.titre,
    message:       row.message,
    guichetId:     row.guichet_id ?? undefined,
    ticketId:      row.ticket_id  ?? undefined,
    resolue:       row.resolue,
    resolueParUid: row.resolue_par_uid ?? undefined,
    resolueAt:     row.resolue_at ?? undefined,
    createdAt:     row.created_at,
  }
}
