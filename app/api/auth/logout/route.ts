import { clearSession } from "@/lib/auth"
import { ok } from "@/lib/api-helpers"

export async function POST() {
  await clearSession()
  return ok({ success: true })
}
