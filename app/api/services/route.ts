import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { createServiceSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET() {
  return withAuth(["admin", "superviseur", "caissier"], async () => {
    const { data, error } = await adminSupabase
      .from("services")
      .select("*")
      .order("ordre", { ascending: true })

    if (error) return err("Erreur lors de la récupération des services", 500)
    return ok((data ?? []).map(mapService))
  })
}

export async function POST(request: NextRequest) {
  return withAuth(["admin"], async () => {
    try {
      const json = await request.json()
      const data = createServiceSchema.parse(json)

      const { data: existing } = await adminSupabase
        .from("services").select("id").eq("code", data.code).limit(1)
      if (existing && existing.length > 0)
        return err(`Le code de service "${data.code}" existe déjà`, 409)

      const { data: service, error: insertError } = await adminSupabase
        .from("services")
        .insert({
          code:         data.code,
          nom:          data.nom,
          icone:        data.icone ?? null,
          temps_estime: data.tempsEstime,
          actif:        data.actif,
          ordre:        data.ordre,
        })
        .select()
        .single()

      if (insertError) return err("Erreur lors de la création du service", 500)
      return ok(mapService(service), 201)
    } catch (e) {
      if (e instanceof ZodError) return handleZodError(e)
      return err("Erreur lors de la création du service", 500)
    }
  })
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
