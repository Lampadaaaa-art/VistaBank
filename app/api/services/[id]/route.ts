import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { updateServiceSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin"], async () => {
    try {
      const json = await request.json()
      const data = updateServiceSchema.parse(json)

      const { data: existing, error: fetchError } = await adminSupabase
        .from("services").select("id").eq("id", id).single()
      if (fetchError || !existing) return err("Service introuvable", 404)

      const updates: Record<string, unknown> = {}
      if (data.nom !== undefined)         updates.nom = data.nom
      if (data.icone !== undefined)       updates.icone = data.icone ?? null
      if (data.tempsEstime !== undefined) updates.temps_estime = data.tempsEstime
      if (data.actif !== undefined)       updates.actif = data.actif
      if (data.ordre !== undefined)       updates.ordre = data.ordre

      await adminSupabase.from("services").update(updates).eq("id", id)
      return ok({ id, ...data })
    } catch (e) {
      if (e instanceof ZodError) return handleZodError(e)
      return err("Erreur lors de la mise à jour", 500)
    }
  })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin"], async () => {
    const { data, error } = await adminSupabase.from("services").select("id").eq("id", id).single()
    if (error || !data) return err("Service introuvable", 404)
    await adminSupabase.from("services").delete().eq("id", id)
    return ok({ success: true })
  })
}
