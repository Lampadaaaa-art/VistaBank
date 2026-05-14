"use client"

import { useMemo } from "react"
import { useTickets } from "@/hooks/useTickets"
import { useGuichets } from "@/hooks/useGuichets"

export function useStats() {
  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const { tickets, loading: ticketsLoading } = useTickets({
    statut: ["attente", "en_cours", "termine"],
    dateFrom: todayStart,
  })
  const { guichets, loading: guichetsLoading } = useGuichets()

  const stats = useMemo(() => {
    const enAttente = tickets.filter((t) => t.statut === "attente").length
    const enCours = tickets.filter((t) => t.statut === "en_cours").length
    const terminesAujourdhui = tickets.filter((t) => t.statut === "termine").length

    const guichetsOuverts = guichets.filter((g) => g.statut === "ouvert").length
    const guichetsFermes = guichets.filter((g) => g.statut === "ferme").length
    const guichetsPause = guichets.filter((g) => g.statut === "pause").length

    const ticketsAvecTemps = tickets.filter(
      (t) => t.statut === "termine" && t.tempsAttente !== undefined
    )
    const tempsMoyenAttente =
      ticketsAvecTemps.length > 0
        ? Math.round(
            ticketsAvecTemps.reduce((sum, t) => sum + (t.tempsAttente ?? 0), 0) /
              ticketsAvecTemps.length /
              60
          )
        : 0

    const ticketsAvecService = tickets.filter(
      (t) => t.statut === "termine" && t.tempsService !== undefined
    )
    const tempsMoyenService =
      ticketsAvecService.length > 0
        ? Math.round(
            ticketsAvecService.reduce((sum, t) => sum + (t.tempsService ?? 0), 0) /
              ticketsAvecService.length /
              60
          )
        : 0

    return {
      enAttente,
      enCours,
      terminesAujourdhui,
      guichetsOuverts,
      guichetsFermes,
      guichetsPause,
      tempsMoyenAttente,
      tempsMoyenService,
      totalGuichets: guichets.length,
    }
  }, [tickets, guichets])

  return { stats, loading: ticketsLoading || guichetsLoading, tickets }
}
