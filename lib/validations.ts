import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères"),
})

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  role: z.enum(["admin", "superviseur", "caissier", "borne"]),
  guichetId: z.string().nullable().optional(),
  servicesAutorises: z.array(z.string()).optional(),
  statut: z.enum(["actif", "inactif", "pause"]).default("actif"),
})

export const updateUserSchema = createUserSchema
  .omit({ email: true, password: true })
  .partial()

export const createServiceSchema = z.object({
  code: z.string().min(1).max(5).toUpperCase(),
  nom: z.string().min(1),
  icone: z.string().optional(),
  tempsEstime: z.number().int().positive(),
  actif: z.boolean().default(true),
  ordre: z.number().int().min(0),
})

export const updateServiceSchema = createServiceSchema.partial()

export const createGuichetSchema = z.object({
  numero: z.number().int().positive(),
  nom: z.string().min(1),
  serviceCode: z.string().min(1),
  caissierUid: z.string().optional(),
  statut: z.enum(["ouvert", "ferme", "pause", "hors_ligne"]).default("ferme"),
})

export const updateGuichetSchema = createGuichetSchema.partial()

export const createTicketSchema = z.object({
  serviceCode: z.string().min(1),
  serviceName: z.string().min(1),
  priorite: z
    .enum(["standard", "vip", "enceinte", "age", "handicap"])
    .default("standard"),
})

export const updateTicketSchema = z.object({
  statut: z.enum(["attente", "en_cours", "termine", "transfere", "annule"]).optional(),
  guichetId: z.string().optional(),
  caissierUid: z.string().optional(),
  notes: z.string().optional(),
})

export const createAlerteSchema = z.object({
  type: z.enum(["temps_attente", "affluence", "guichet_inactif", "technique", "autre"]),
  severite: z.enum(["critique", "avertissement", "info"]),
  titre: z.string().min(1),
  message: z.string().min(1),
  guichetId: z.string().optional(),
  ticketId: z.string().optional(),
})

export const resolveAlerteSchema = z.object({
  resolue: z.literal(true),
  resolueParUid: z.string(),
})

export const updateParametresSchema = z.object({
  nom: z.string().min(1).optional(),
  adresse: z.string().min(1).optional(),
  telephone: z.string().optional(),
  logo: z.string().optional(),
  voixActive: z.boolean().optional(),
  seuilTempsAttente: z.number().int().positive().optional(),
  seuilInactiviteGuichet: z.number().int().positive().optional(),
  horaires: z
    .record(
      z.enum(["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]),
      z.object({
        ouverture: z.string(),
        fermeture: z.string(),
        ouvert: z.boolean(),
      })
    )
    .optional(),
})
