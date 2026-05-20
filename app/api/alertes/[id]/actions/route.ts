import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth } from "@/lib/api-helpers"
import { z } from "zod"

const schema = z.object({
  action: z.enum(["forcer_appel", "fermer_guichet"]),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin", "superviseur"], async (session) => {
    const json = await request.json().catch(() => null)
    const parse = schema.safeParse(json)
    if (!parse.success) return err("Action invalide", 422)

    const { action } = parse.data
    const now = new Date().toISOString()

    const { data: alerte, error: alerteError } = await adminSupabase
      .from("alertes").select("*").eq("id", id).single()
    if (alerteError || !alerte) return err("Alerte introuvable", 404)
    if (alerte.resolue) return err("L'alerte est déjà résolue", 409)

    // ── Action 1 : appeler immédiatement le ticket en souffrance ──────────
    if (action === "forcer_appel") {
      if (alerte.type !== "temps_attente" || !alerte.ticket_id)
        return err("Action invalide pour ce type d'alerte", 422)

      const { data: ticket } = await adminSupabase
        .from("tickets")
        .select("id, numero, service_code, service_name, priorite, statut")
        .eq("id", alerte.ticket_id as string)
        .single()

      if (!ticket) return err("Ticket introuvable", 404)
      if (ticket.statut !== "attente") return err("Le ticket n'est plus en attente", 409)

      // Guichets libres — même service en priorité, sinon n'importe lequel
      const { data: guichets } = await adminSupabase
        .from("guichets")
        .select("id, nom, service_code")
        .eq("statut", "ouvert")
        .is("ticket_en_cours", null)

      if (!guichets || guichets.length === 0)
        return err("Aucun guichet disponible pour forcer l'appel", 409)

      const sameService = guichets.find(g => g.service_code === ticket.service_code)
      const targetGuichet = sameService ?? guichets[0]

      // Verrou atomique : échoue si le ticket a déjà été pris entre temps
      const { data: claimed } = await adminSupabase
        .from("tickets")
        .update({
          statut:       "en_cours",
          guichet_id:   targetGuichet.id,
          appelle_at:   now,
          caissier_uid: session.uid,
        })
        .eq("id", ticket.id as string)
        .eq("statut", "attente")
        .select()

      if (!claimed || (claimed as unknown[]).length === 0)
        return err("Le ticket vient d'être pris par un autre guichet", 409)

      await adminSupabase.from("guichets").update({
        ticket_en_cours: ticket.numero,
        updated_at:      now,
      }).eq("id", targetGuichet.id as string)

      await adminSupabase.from("alertes").update({
        resolue:         true,
        resolue_par_uid: session.uid,
        resolue_at:      now,
      }).eq("id", id)

      return ok({
        action:  "forcer_appel",
        ticket:  { id: ticket.id, numero: ticket.numero },
        guichet: { id: targetGuichet.id, nom: targetGuichet.nom },
      })
    }

    // ── Action 2 : fermer le guichet inactif ─────────────────────────────
    if (action === "fermer_guichet") {
      if (alerte.type !== "guichet_inactif" || !alerte.guichet_id)
        return err("Action invalide pour ce type d'alerte", 422)

      const { error: closeError } = await adminSupabase
        .from("guichets")
        .update({ statut: "ferme", updated_at: now })
        .eq("id", alerte.guichet_id as string)

      if (closeError) return err("Erreur lors de la fermeture du guichet", 500)

      await adminSupabase.from("alertes").update({
        resolue:         true,
        resolue_par_uid: session.uid,
        resolue_at:      now,
      }).eq("id", id)

      return ok({ action: "fermer_guichet", guichetId: alerte.guichet_id })
    }

    return err("Action non reconnue", 422)
  })
}
