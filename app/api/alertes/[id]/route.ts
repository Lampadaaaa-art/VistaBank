import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { resolveAlerteSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin", "superviseur"], async (session) => {
    try {
      const json = await request.json()
      const data = resolveAlerteSchema.parse(json)

      const { data: existing, error: fetchError } = await adminSupabase
        .from("alertes").select("id").eq("id", id).single()
      if (fetchError || !existing) return err("Alerte introuvable", 404)

      const updates = {
        resolue:          data.resolue,
        resolue_par_uid:  session.uid,
        resolue_at:       new Date().toISOString(),
      }
      await adminSupabase.from("alertes").update(updates).eq("id", id)
      return ok({
        id,
        resolue:       updates.resolue,
        resolueParUid: updates.resolue_par_uid,
        resolueAt:     updates.resolue_at,
      })
    } catch (e) {
      if (e instanceof ZodError) return handleZodError(e)
      return err("Erreur lors de la résolution", 500)
    }
  })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin", "superviseur"], async () => {
    const { error } = await adminSupabase.from("alertes").delete().eq("id", id)
    if (error) return err("Erreur lors de la suppression", 500)
    return ok({ id, deleted: true })
  })
}
