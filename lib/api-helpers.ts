import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import type { UserRole } from "@/lib/types"
import { ZodError } from "zod"

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function withAuth(
  roles: UserRole[],
  handler: (session: Awaited<ReturnType<typeof requireAuth>>) => Promise<Response>
): Promise<Response> {
  try {
    const session = await requireAuth(roles)
    return await handler(session)
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "Non authentifié") return err("Non authentifié", 401)
      if (e.message === "Accès refusé") return err("Accès refusé", 403)
    }
    return err("Erreur serveur", 500)
  }
}

export function handleZodError(e: ZodError) {
  return err(e.issues[0]?.message ?? "Données invalides", 422)
}
