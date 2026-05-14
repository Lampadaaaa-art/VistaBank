import { getSession } from "@/lib/auth"
import { ok, err } from "@/lib/api-helpers"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return err("Non authentifié", 401)
    return ok(session)
  } catch {
    return err("Erreur serveur", 500)
  }
}
