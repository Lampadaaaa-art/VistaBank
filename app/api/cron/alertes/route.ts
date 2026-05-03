import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err } from "@/lib/api-helpers"

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) return err("Non autorisé", 401)
  }

  try {
    const { data: p } = await adminSupabase
      .from("parametres").select("seuil_temps_attente, seuil_inactivite_guichet").eq("id", "agence").single()

    const seuilAttente: number = p?.seuil_temps_attente ?? 15
    const seuilInactivite: number = p?.seuil_inactivite_guichet ?? 10

    const now = new Date()
    const created: string[] = []

    // Règle 1 : tickets en attente depuis > seuilAttente minutes
    const borneAttente = new Date(now.getTime() - seuilAttente * 60_000).toISOString()
    const { data: tickets } = await adminSupabase
      .from("tickets")
      .select("id, numero, service_name, created_at")
      .eq("statut", "attente")
      .lte("created_at", borneAttente)

    for (const t of tickets ?? []) {
      const { data: existe } = await adminSupabase
        .from("alertes")
        .select("id")
        .eq("ticket_id", t.id)
        .eq("type", "temps_attente")
        .eq("resolue", false)
        .limit(1)

      if (!existe || existe.length === 0) {
        const min = Math.floor((now.getTime() - new Date(t.created_at as string).getTime()) / 60_000)
        await adminSupabase.from("alertes").insert({
          type:      "temps_attente",
          severite:  min >= seuilAttente * 2 ? "critique" : "avertissement",
          titre:     `Ticket ${t.numero} en attente depuis ${min} min`,
          message:   `Le ticket ${t.numero} (${t.service_name}) dépasse le seuil de ${seuilAttente} min.`,
          ticket_id: t.id,
          resolue:   false,
          created_at: now.toISOString(),
        })
        created.push(`temps_attente:${t.id}`)
      }
    }

    // Règle 2 : guichets ouverts sans activité depuis > seuilInactivite minutes
    const borneInactivite = new Date(now.getTime() - seuilInactivite * 60_000).toISOString()
    const { data: guichets } = await adminSupabase
      .from("guichets")
      .select("id, nom, ticket_en_cours, updated_at")
      .eq("statut", "ouvert")

    for (const g of guichets ?? []) {
      if (!g.ticket_en_cours && g.updated_at && g.updated_at <= borneInactivite) {
        const { data: existe } = await adminSupabase
          .from("alertes")
          .select("id")
          .eq("guichet_id", g.id)
          .eq("type", "guichet_inactif")
          .eq("resolue", false)
          .limit(1)

        if (!existe || existe.length === 0) {
          const min = Math.floor((now.getTime() - new Date(g.updated_at as string).getTime()) / 60_000)
          await adminSupabase.from("alertes").insert({
            type:       "guichet_inactif",
            severite:   "avertissement",
            titre:      `${g.nom} inactif depuis ${min} min`,
            message:    `Le guichet ${g.nom} est ouvert mais sans activité depuis ${min} minutes.`,
            guichet_id: g.id,
            resolue:    false,
            created_at: now.toISOString(),
          })
          created.push(`guichet_inactif:${g.id}`)
        }
      }
    }

    // Règle 3 : affluence — plus de 20 tickets en attente simultanément
    const { count } = await adminSupabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("statut", "attente")

    const total = count ?? 0
    if (total >= 20) {
      const { data: existe } = await adminSupabase
        .from("alertes")
        .select("id")
        .eq("type", "affluence")
        .eq("resolue", false)
        .limit(1)

      if (!existe || existe.length === 0) {
        await adminSupabase.from("alertes").insert({
          type:      "affluence",
          severite:  total >= 30 ? "critique" : "avertissement",
          titre:     `Pic d'affluence : ${total} tickets en attente`,
          message:   `Un pic d'affluence est détecté avec ${total} tickets en attente simultanément.`,
          resolue:   false,
          created_at: now.toISOString(),
        })
        created.push("affluence")
      }
    }

    return ok({ alertesCreees: created, total: created.length })
  } catch (e) {
    console.error("[cron/alertes]", e)
    return err("Erreur serveur", 500)
  }
}
