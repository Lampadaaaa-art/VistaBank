'use client';

import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Users, Monitor, Settings, Building2, BellRing, Clock, Save } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import type { ParametresAgence, HoraireJour } from '@/lib/types';
import { AdminLogoutButton } from '@/components/admin-logout-button';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
type Jour = typeof JOURS[number];
const JOURS_LABEL: Record<Jour, string> = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
  jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche',
};

const DEFAULT_HORAIRE: HoraireJour = { ouverture: '09:00', fermeture: '18:00', ouvert: true };
const DEFAULT_PARAMS: Omit<ParametresAgence, 'updatedAt'> = {
  nom: '', adresse: '', voixActive: true,
  seuilTempsAttente: 15, seuilInactiviteGuichet: 10,
  horaires: {
    lundi: { ...DEFAULT_HORAIRE }, mardi: { ...DEFAULT_HORAIRE }, mercredi: { ...DEFAULT_HORAIRE },
    jeudi: { ...DEFAULT_HORAIRE }, vendredi: { ...DEFAULT_HORAIRE },
    samedi: { ouverture: '09:00', fermeture: '13:00', ouvert: false },
    dimanche: { ouverture: '09:00', fermeture: '13:00', ouvert: false },
  },
};

export default function Parametres() {
  const { user } = useAuth();
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const fetchParams = useCallback(async () => {
    const res = await fetch('/api/parametres');
    if (res.ok) {
      const data = await res.json();
      setParams(prev => ({ ...prev, ...data }));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchParams(); }, [fetchParams]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/parametres', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: params.nom,
          adresse: params.adresse,
          voixActive: params.voixActive,
          horaires: params.horaires,
          seuilTempsAttente: params.seuilTempsAttente,
          seuilInactiviteGuichet: params.seuilInactiviteGuichet,
        }),
      });
      if (res.ok) {
        setSavedAt(new Date().toLocaleString('fr-FR'));
      }
    } finally {
      setSaving(false);
    }
  };

  const setHoraire = (jour: Jour, field: keyof HoraireJour, value: string | boolean) => {
    setParams(p => ({
      ...p,
      horaires: {
        ...p.horaires,
        [jour]: { ...p.horaires[jour], [field]: value },
      },
    }));
  };

  const nomComplet = user ? `${user.prenom} ${user.nom}` : 'Chargement…';

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <aside className="h-screen w-72 left-0 top-0 fixed bg-surface-container-low shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex flex-col py-8 z-20">
        <div className="px-6 mb-12">
          <h1 className="text-xl font-black text-on-surface font-headline">Vista Gui Admin</h1>
          <p className="text-xs font-semibold tracking-wide text-primary-container/70 uppercase mt-1">Sovereign Authority</p>
        </div>
        <nav className="flex-1">
          <Link href="/admin" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <LayoutDashboard className="w-5 h-5" />
            Vue d&apos;ensemble
          </Link>
          <Link href="/admin/utilisateurs" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <Users className="w-5 h-5" />
            Gestion Utilisateurs
          </Link>
          <Link href="/admin/services" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <Settings className="w-5 h-5" />
            Services
          </Link>
          <Link href="/admin/guichets" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <Monitor className="w-5 h-5" />
            Guichets
          </Link>
          <Link href="/admin/parametres" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <Settings className="w-5 h-5 fill-current" />
            Paramètres
          </Link>
        </nav>
        <div className="mt-auto px-6 flex flex-col gap-3">
          <AdminLogoutButton />
          <div className="bg-primary-fixed/30 rounded-xl p-4 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Système Actif</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-medium text-on-surface">Serveur Cloud Est</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="ml-72 min-h-screen flex flex-col relative">
        <header className="flex justify-between items-center w-full px-8 h-24 bg-surface border-b border-on-surface/5 sticky top-0 z-10">
          <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">Configuration Système</h2>
          <div className="flex items-center gap-4 border-l border-on-surface/10 pl-6">
            <div className="flex flex-col items-end">
              <span className="font-bold text-sm text-on-surface">{nomComplet}</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Administrateur</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-sm">
              {user ? `${user.prenom[0]}${user.nom[0]}` : '…'}
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-secondary">Chargement…</p>
          </div>
        ) : (
          <div className="p-10 max-w-6xl mx-auto w-full">
            <div className="mb-12">
              <h3 className="text-4xl font-extrabold text-on-surface mb-3 tracking-tight font-headline">Paramètres de l&apos;Agence</h3>
              <p className="text-secondary text-lg leading-relaxed">Gérez l&apos;identité de votre établissement et les règles opérationnelles.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="col-span-12 lg:col-span-7 space-y-8">
                {/* Identity */}
                <div className="bg-surface-container-lowest p-8 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)]">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-secondary-container text-primary rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-headline font-bold text-on-surface">Identité de l&apos;Agence</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-secondary uppercase tracking-widest ml-1">Nom de l&apos;agence</label>
                      <input
                        type="text"
                        value={params.nom}
                        onChange={e => setParams(p => ({ ...p, nom: e.target.value }))}
                        placeholder="Ex: Centre Principal"
                        className="w-full px-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface font-medium placeholder:text-slate-400 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-secondary uppercase tracking-widest ml-1">Adresse physique</label>
                      <textarea
                        value={params.adresse}
                        onChange={e => setParams(p => ({ ...p, adresse: e.target.value }))}
                        placeholder="Adresse complète..."
                        rows={3}
                        className="w-full px-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface font-medium placeholder:text-slate-400 outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="bg-surface-container-lowest p-8 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)]">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-secondary-container text-primary rounded-xl flex items-center justify-center">
                      <BellRing className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-headline font-bold text-on-surface">Système de Notifications</h3>
                  </div>
                  <div className="p-6 bg-surface-container-low rounded-2xl flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm">
                        <BellRing className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-on-surface font-headline text-lg">Annonce Vocale</p>
                        <p className="text-sm text-secondary">Activer le haut-parleur pour les nouveaux appels.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={params.voixActive}
                        onChange={e => setParams(p => ({ ...p, voixActive: e.target.checked }))}
                      />
                      <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-5 space-y-8">
                {/* Opening Hours */}
                <div className="bg-surface-container-lowest p-8 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)]">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-secondary-container text-primary rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-headline font-bold text-on-surface">Horaires d&apos;Ouverture</h3>
                  </div>
                  <div className="space-y-4">
                    {JOURS.map(jour => {
                      const h = params.horaires[jour];
                      return (
                        <div key={jour} className={`flex items-center justify-between gap-4 py-2 ${!h.ouvert ? 'opacity-50' : ''}`}>
                          <label className="flex items-center gap-2 w-28 shrink-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={h.ouvert}
                              onChange={e => setHoraire(jour, 'ouvert', e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-bold text-secondary">{JOURS_LABEL[jour]}</span>
                          </label>
                          {h.ouvert ? (
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="text"
                                value={h.ouverture}
                                onChange={e => setHoraire(jour, 'ouverture', e.target.value)}
                                className="w-full text-center px-3 py-3 bg-surface-container-low border-none rounded-xl font-headline font-bold text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              <span className="text-slate-300">—</span>
                              <input
                                type="text"
                                value={h.fermeture}
                                onChange={e => setHoraire(jour, 'fermeture', e.target.value)}
                                className="w-full text-center px-3 py-3 bg-surface-container-low border-none rounded-xl font-headline font-bold text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </div>
                          ) : (
                            <div className="flex-1 py-3 bg-surface-container-low rounded-xl text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Fermé
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-10">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full py-5 bg-gradient-to-br from-primary to-primary-container text-white rounded-full font-headline font-bold text-lg shadow-[0_10px_30px_rgba(230,0,66,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:hover:scale-100"
                    >
                      <Save className="w-5 h-5" />
                      {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
                      {savedAt ? `Dernière mise à jour le ${savedAt}` : 'Non encore sauvegardé'}
                    </p>
                  </div>
                </div>

                {/* Server Status */}
                <div className="p-8 bg-slate-900 rounded-[1.5rem] text-white relative overflow-hidden shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status du Serveur</p>
                    </div>
                    <p className="text-3xl font-headline font-black text-white">Opérationnel</p>
                    <p className="text-sm text-slate-400 mt-2 font-medium">Synchronisation Cloud Active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
