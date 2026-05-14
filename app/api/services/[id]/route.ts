import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { updateServiceSchema } from "@/lib/validations"
import { ZodError } from "zod"

// Note: `id` in the URL is actually the service `code` (e.g. "A", "B")
// since the services table uses `code` as its primary key (no UUID id column).

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: code } = await params
  return withAuth(["admin"], async () => {
    try {
      const json = await request.json()
      const data = updateServiceSchema.parse(json)

      const updates: Record<string, unknown> = {}
      if (data.nom !== undefined)         updates.nom = data.nom
      if (data.icone !== undefined)       updates.icone = data.icone ?? null
      if (data.tempsEstime !== undefined) updates.temps_estime = data.tempsEstime
      if (data.actif !== undefined)       updates.actif = data.actif
      if (data.ordre !== undefined)       updates.ordre = data.ordre

      const { data: updated, error: updateError } = await adminSupabase
        .from("services").update(updates).eq("code", code).select().single()

      if (updateError) {
        if (updateError.code === "PGRST116") return err("Service introuvable", 404)
        return err(`Erreur lors de la mise à jour: ${updateError.message}`, 500)
      }
      return ok({ id: String(updated.code), ...updated })
    } catch (e) {
      if (e instanceof ZodError) return handleZodError(e)
      return err("Erreur lors de la mise à jour", 500)
    }
  })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: code } = await params
  return withAuth(["admin"], async () => {
    // Block deletion if tickets still reference this service
    const { count } = await adminSupabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("service_code", code)

    if (count && count > 0)
      return err(
        `Ce service a ${count} ticket(s) associé(s) et ne peut pas être supprimé. Désactivez-le à la place.`,
        409
      )

    const { data: deleted, error } = await adminSupabase
      .from("services")
      .delete()
      .eq("code", code)
      .select("code")

    if (error) return err(`Erreur lors de la suppression: ${error.message}`, 500)
    if (!deleted || deleted.length === 0) return err("Service introuvable", 404)

    return ok({ success: true })
  })
}
