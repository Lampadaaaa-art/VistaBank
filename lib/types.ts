export type UserRole = "admin" | "superviseur" | "caissier" | "borne"
export type UserStatut = "actif" | "inactif" | "pause"
export type TicketPriorite = "standard" | "vip" | "enceinte" | "age" | "handicap"
export type TicketStatut = "attente" | "en_cours" | "termine" | "transfere" | "annule"
export type GuichetStatut = "ouvert" | "ferme" | "pause" | "hors_ligne"
export type AlerteType = "temps_attente" | "affluence" | "guichet_inactif" | "technique" | "autre"
export type AlerteSeverite = "critique" | "avertissement" | "info"

export interface User {
  id: string
  email: string
  nom: string
  prenom: string
  role: UserRole
  guichetId?: string
  servicesAutorises?: string[]
  statut: UserStatut
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: string
  code: string
  nom: string
  icone?: string
  tempsEstime: number
  actif: boolean
  ordre: number
}

export interface Guichet {
  id: string
  numero: number
  nom: string
  serviceCode: string
  caissierUid?: string
  statut: GuichetStatut
  ticketEnCours?: string
  updatedAt: string
}

export interface Ticket {
  id: string
  numero: string
  serviceCode: string
  serviceName: string
  priorite: TicketPriorite
  statut: TicketStatut
  guichetId?: string
  caissierUid?: string
  createdAt: string
  appelleAt?: string
  termineAt?: string
  tempsAttente?: number
  tempsService?: number
  notes?: string
}

export interface Alerte {
  id: string
  type: AlerteType
  severite: AlerteSeverite
  titre: string
  message: string
  guichetId?: string
  ticketId?: string
  resolue: boolean
  resolueParUid?: string
  resolueAt?: string
  createdAt: string
}

export interface HoraireJour {
  ouverture: string
  fermeture: string
  ouvert: boolean
}

export interface ParametresAgence {
  nom: string
  adresse: string
  telephone?: string
  logo?: string
  horaires: {
    lundi: HoraireJour
    mardi: HoraireJour
    mercredi: HoraireJour
    jeudi: HoraireJour
    vendredi: HoraireJour
    samedi: HoraireJour
    dimanche: HoraireJour
  }
  voixActive: boolean
  seuilTempsAttente: number
  seuilInactiviteGuichet: number
  updatedAt: string
}

export interface Compteur {
  valeur: number
  date: string
}

export interface SessionUser {
  uid: string
  email: string
  nom: string
  prenom: string
  role: UserRole
  guichetId?: string
}
