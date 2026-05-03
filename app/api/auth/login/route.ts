import { NextRequest } from "next/server"
import { createSession } from "@/lib/auth"
import { ok, err } from "@/lib/api-helpers"
import { z } from "zod"

const bodySchema = z.object({ accessToken: z.string().min(1) })

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const { accessToken } = bodySchema.parse(json)
    const session = await createSession(accessToken)
    return ok({ role: session.role, nom: session.nom, prenom: session.prenom })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue"
    if (message.includes("Utilisateur introuvable")) return err(message, 404)
    if (message.includes("Compte désactivé")) return err(message, 403)
    return err("Identifiants invalides", 401)
  }
}
