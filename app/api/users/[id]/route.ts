import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { updateUserSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin"], async () => {
    const { data, error } = await adminSupabase.from("users").select("*").eq("id", id).single()
    if (error || !data) return err("Utilisateur introuvable", 404)
    return ok(mapUser(data))
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin"], async () => {
    try {
      const json = await request.json()
      const data = updateUserSchema.parse(json)

      const { data: current, error: fetchError } = await adminSupabase
        .from("users").select("*").eq("id", id).single()
      if (fetchError || !current) return err("Utilisateur introuvable", 404)

      const updates: Record<string, unknown> = {}

      if (data.nom !== undefined)    updates.nom = data.nom
      if (data.prenom !== undefined) updates.prenom = data.prenom
      if (data.role !== undefined)   updates.role = data.role
      if (data.statut !== undefined) updates.statut = data.statut
      if ("guichetId" in data)       updates.guichet_id = data.guichetId ?? null
      if (data.servicesAutorises !== undefined)
        updates.services_autorises = data.servicesAutorises

      const { error: updateError } = await adminSupabase.from("users").update(updates).eq("id", id)
      if (updateError) return err(`Erreur lors de la mise à jour: ${updateError.message}`, 500)

      // Cascade statut → guichet
      if (data.statut && data.statut !== current.statut) {
        const role = current.role as string
        const guichetId = current.guichet_id as string | undefined

        const ts = new Date().toISOString()
        if (data.statut === "inactif") {
          if (role === "caissier" && guichetId) {
            await adminSupabase.from("guichets")
              .update({ statut: "hors_ligne", updated_at: ts })
              .eq("id", guichetId)
          }
        } else if (data.statut === "actif") {
          if (role === "caissier" && guichetId) {
            const { data: g } = await adminSupabase
              .from("guichets").select("statut").eq("id", guichetId).single()
            if (g?.statut === "hors_ligne") {
              await adminSupabase.from("guichets")
                .update({ statut: "ferme", updated_at: ts })
                .eq("id", guichetId)
            }
          }
        } else if (data.statut === "pause") {
          if (role === "caissier" && guichetId) {
            await adminSupabase.from("guichets")
              .update({ statut: "pause", updated_at: ts })
              .eq("id", guichetId)
          }
        }
      }

      return ok({ id, ...updates })
    } catch (e) {
      if (e instanceof ZodError) return handleZodError(e)
      return err("Erreur lors de la mise à jour", 500)
    }
  })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin"], async () => {
    const { data, error } = await adminSupabase.from("users").select("id").eq("id", id).single()
    if (error || !data) return err("Utilisateur introuvable", 404)
    await adminSupabase.from("users").delete().eq("id", id)
    await adminSupabase.auth.admin.deleteUser(id)
    return ok({ success: true })
  })
}

function mapUser(row: Record<string, unknown>) {
  return {
    id:                row.id,
    email:             row.email,
    nom:               row.nom,
    prenom:            row.prenom,
    role:              row.role,
    guichetId:         row.guichet_id ?? undefined,
    servicesAutorises: row.services_autorises ?? [],
    statut:            row.statut,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  }
}
