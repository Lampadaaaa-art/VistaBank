import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth } from "@/lib/api-helpers"
import { z } from "zod"

const schema = z.object({ guichetId: z.string().uuid() })

const PRIORITY_RANK: Record<string, number> = {
  handicap: 1, enceinte: 2, age: 3, vip: 4, standard: 5,
}

export async function POST(request: NextRequest) {
  return withAuth(["admin", "caissier"], async (session) => {
    const json = await request.json().catch(() => null)
    const parse = schema.safeParse(json)
    if (!parse.success) return err("guichetId (UUID) requis", 422)
    const { guichetId } = parse.data
    const now = new Date().toISOString()

    // 1. Terminer le ticket en cours sur ce guichet (s'il y en a un)
    const { data: enCours } = await adminSupabase
      .from("tickets")
      .select("id, appelle_at, created_at")
      .eq("statut", "en_cours")
      .eq("guichet_id", guichetId)
      .maybeSingle()

    if (enCours) {
      const tempsService = enCours.appelle_at
        ? Math.round((Date.now() - new Date(enCours.appelle_at as string).getTime()) / 1000)
        : 0
      const tempsAttente = enCours.appelle_at
        ? Math.round((new Date(enCours.appelle_at as string).getTime() - new Date(enCours.created_at as string).getTime()) / 1000)
        : Math.round((Date.now() - new Date(enCours.created_at as string).getTime()) / 1000)

      await adminSupabase.from("tickets").update({
        statut: "termine",
        termine_at: now,
        temps_service: tempsService,
        temps_attente: tempsAttente,
      }).eq("id", enCours.id as string)

      await adminSupabase.from("guichets")
        .update({ ticket_en_cours: null, updated_at: now })
        .eq("id", guichetId)
    }

    // 2. Charger tous les tickets en attente et les trier par priorité + heure
    const { data: waiting } = await adminSupabase
      .from("tickets")
      .select("id, numero, service_code, service_name, priorite, created_at")
      .eq("statut", "attente")
      .order("created_at", { ascending: true })

    if (!waiting || waiting.length === 0) {
      return err("Aucun ticket en attente", 404)
    }

    const sorted = [...waiting].sort(
      (a, b) =>
        (PRIORITY_RANK[a.priorite as string] ?? 5) - (PRIORITY_RANK[b.priorite as string] ?? 5) ||
        new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime()
    )

    // 3. Réserver atomiquement le premier ticket disponible.
    //    Le WHERE statut='attente' garantit qu'un seul guichet peut réussir
    //    même si deux requêtes arrivent simultanément.
    let claimed: Record<string, unknown> | null = null

    for (const candidate of sorted) {
      const { data: updated } = await adminSupabase
        .from("tickets")
        .update({
          statut: "en_cours",
          guichet_id: guichetId,
          appelle_at: now,
          caissier_uid: session.uid,
        })
        .eq("id", candidate.id as string)
        .eq("statut", "attente") // verrou atomique — 0 lignes si déjà pris
        .select()

      if (updated && (updated as unknown[]).length > 0) {
        claimed = (updated as Record<string, unknown>[])[0]
        break
      }
    }

    if (!claimed) {
      return err("Tous les tickets ont déjà été pris par d'autres guichets", 409)
    }

    // 4. Mettre à jour le guichet
    await adminSupabase.from("guichets").update({
      ticket_en_cours: claimed.numero as string,
      statut: "ouvert",
      updated_at: now,
    }).eq("id", guichetId)

    return ok({
      id: claimed.id,
      numero: claimed.numero,
      serviceCode: claimed.service_code,
      serviceName: (claimed.service_name ?? claimed.service_code) as string,
      priorite: claimed.priorite,
      statut: "en_cours",
      guichetId,
      appelleAt: now,
    })
  })
}
