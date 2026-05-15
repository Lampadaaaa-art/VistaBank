'use client';

import { useState } from 'react';
import { LayoutDashboard, ListOrdered, MonitorSmartphone, FileText, Power, PowerOff, PauseCircle, PlayCircle, BellRing } from 'lucide-react';
import { AdminLogoutButton } from '@/components/admin-logout-button';
import Link from 'next/link';
import { useGuichets } from '@/hooks/useGuichets';
import { useAuth } from '@/hooks/useAuth';
import { useAlertes } from '@/hooks/useAlertes';
import type { GuichetStatut } from '@/lib/types';

const STATUT_CFG: Record<GuichetStatut, { label: string; dotCls: string; textCls: string; barCls: string }> = {
  ouvert:     { label: 'Ouvert',     dotCls: 'bg-emerald-500 animate-pulse', textCls: 'text-emerald-600', barCls: 'bg-emerald-500' },
  pause:      { label: 'Suspendu',   dotCls: 'bg-orange-400',               textCls: 'text-orange-600',  barCls: 'bg-orange-400'  },
  ferme:      { label: 'Fermé',      dotCls: 'bg-slate-300',                textCls: 'text-secondary',   barCls: 'bg-slate-300'   },
  hors_ligne: { label: 'Hors ligne', dotCls: 'bg-slate-300',                textCls: 'text-secondary',   barCls: 'bg-slate-300'   },
};

export default function SuperviseurGuichets() {
  const { user } = useAuth();
  const { guichets, loading } = useGuichets();
  const { alertes } = useAlertes(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const nomComplet = user ? `${user.prenom} ${user.nom}` : 'Chargement…';

  const changeStatut = async (guichetId: string, statut: GuichetStatut) => {
    if (actionLoading) return;
    setActionLoading(guichetId);
    try {
      await fetch(`/api/guichets/${guichetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex">
      <aside className="h-screen w-72 left-0 top-0 fixed bg-surface-container-low shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex flex-col py-8 z-20">
        <div className="px-6 mb-12">
          <p className="text-primary font-headline text-2xl font-black tracking-tight">Supervision</p>
          <p className="text-secondary text-xs font-bold uppercase tracking-widest mt-1">Agence Principale</p>
        </div>
        <nav className="flex-1">
          <Link href="/superviseur" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <LayoutDashboard className="w-5 h-5" />
            Vue d&apos;ensemble
          </Link>
          <Link href="/superviseur/files-attente" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <ListOrdered className="w-5 h-5" />
            Files d&apos;attente
          </Link>
          <Link href="/superviseur/guichets" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <MonitorSmartphone className="w-5 h-5 fill-current" />
            Guichets
          </Link>
          <Link href="/superviseur/alertes" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <BellRing className="w-5 h-5" />
            Alertes
            {alertes.length > 0 && (
              <span className="ml-auto bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">{alertes.length}</span>
            )}
          </Link>
          <Link href="/superviseur/rapports" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <FileText className="w-5 h-5" />
            Rapports
          </Link>
        </nav>
        <div className="mt-auto px-6">
          <AdminLogoutButton />
        </div>
      </aside>

      <main className="ml-72 flex-1 flex flex-col relative">
        <header className="flex justify-between items-center w-full px-8 h-24 bg-surface border-b border-on-surface/5 sticky top-0 z-40">
          <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">État des Guichets</h2>
          <div className="flex items-center gap-4 border-l border-on-surface/10 pl-6">
            <div className="flex flex-col items-end">
              <span className="font-bold text-sm text-on-surface">{nomComplet}</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Superviseur</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-sm">
              {user ? `${user.prenom[0]}${user.nom[0]}` : '…'}
            </div>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto w-full">
          {loading ? (
            <p className="text-secondary text-center py-20">Chargement…</p>
          ) : guichets.length === 0 ? (
            <p className="text-secondary text-center py-20">Aucun guichet configuré</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {guichets.map((g) => {
                const cfg = STATUT_CFG[g.statut];
                const busy = actionLoading === g.id;
                return (
                  <div key={g.id} className="bg-surface-container-lowest rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(17,28,45,0.06)] border border-on-surface/5 flex flex-col relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-2 ${cfg.barCls}`} />

                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-3xl font-black font-headline text-on-surface">
                          Guichet {String(g.numero).padStart(2, '0')}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <div className={`w-2 h-2 rounded-full ${cfg.dotCls}`} />
                          <span className={`text-sm font-bold uppercase tracking-widest ${cfg.textCls}`}>{cfg.label}</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center text-secondary">
                        <MonitorSmartphone className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="space-y-6 flex-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Caissier</p>
                          <p className="font-bold text-on-surface text-sm">{g.caissierNom ?? <span className="text-secondary font-medium italic">Non assigné</span>}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Nom</p>
                          <p className="font-bold text-on-surface text-sm">{g.nom}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-container-low rounded-xl p-4">
                          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Ticket Actuel</p>
                          <p className={`text-2xl font-black font-headline ${g.ticketEnCours ? 'text-primary' : 'text-secondary'}`}>
                            {g.ticketEnCours ?? '—'}
                          </p>
                        </div>
                        <div className="bg-surface-container-low rounded-xl p-4">
                          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Service</p>
                          <p className="text-2xl font-black font-headline text-on-surface">{g.serviceCode}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-on-surface/5 flex gap-3">
                      {g.statut === 'ouvert' && (
                        <>
                          <button onClick={() => changeStatut(g.id, 'pause')} disabled={busy} className="flex-1 flex items-center justify-center gap-2 bg-orange-50 text-orange-600 hover:bg-orange-100 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
                            <PauseCircle className="w-4 h-4" /> Suspendre
                          </button>
                          <button onClick={() => changeStatut(g.id, 'ferme')} disabled={busy} className="flex-1 flex items-center justify-center gap-2 bg-surface-container text-secondary hover:bg-surface-container-low py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
                            <PowerOff className="w-4 h-4" /> Fermer
                          </button>
                        </>
                      )}
                      {g.statut === 'pause' && (
                        <>
                          <button onClick={() => changeStatut(g.id, 'ouvert')} disabled={busy} className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
                            <PlayCircle className="w-4 h-4" /> Réouvrir
                          </button>
                          <button onClick={() => changeStatut(g.id, 'ferme')} disabled={busy} className="flex-1 flex items-center justify-center gap-2 bg-surface-container text-secondary hover:bg-surface-container-low py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
                            <PowerOff className="w-4 h-4" /> Fermer
                          </button>
                        </>
                      )}
                      {(g.statut === 'ferme' || g.statut === 'hors_ligne') && (
                        <button onClick={() => changeStatut(g.id, 'ouvert')} disabled={busy} className="w-full flex items-center justify-center gap-2 bg-primary-fixed text-primary hover:bg-primary hover:text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50">
                          <Power className="w-4 h-4" /> Ouvrir le guichet
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
