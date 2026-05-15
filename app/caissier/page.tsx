"use client";

import { useState, useMemo } from 'react';
import { Megaphone, PauseCircle, PlayCircle, CheckCircle2, User, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useTickets } from '@/hooks/useTickets';
import { useGuichets } from '@/hooks/useGuichets';
import { useStats } from '@/hooks/useStats';
import { useAuth } from '@/hooks/useAuth';
import { CaissierNav } from '@/components/caissier-nav';

const PRIORITY_ORDER: Record<string, number> = {
  handicap: 1, enceinte: 2, age: 3, vip: 4, standard: 5,
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Caissier() {
  const { user, loading: authLoading } = useAuth();
  const { tickets: attenteTickets, refresh: refreshAttente } = useTickets({ statut: "attente" });
  const { tickets: enCoursTickets, refresh: refreshEnCours } = useTickets({ statut: "en_cours" });
  const { guichets, loading: guichetsLoading, refresh: refreshGuichets } = useGuichets();
  const { stats } = useStats();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const monGuichet = guichets.find(g =>
    user?.guichetId ? g.id === user.guichetId : g.caissierUid === user?.uid
  );

  const ticketActuel = monGuichet
    ? (enCoursTickets.find(t => t.guichetId === monGuichet.id) ?? null)
    : null;

  const sortedAttenteTickets = useMemo(() =>
    [...attenteTickets].sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priorite] ?? 5) - (PRIORITY_ORDER[b.priorite] ?? 5) ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ),
    [attenteTickets]
  );

  const queuePreview = sortedAttenteTickets.slice(0, 3);

  const handleAppelerSuivant = async () => {
    if (actionLoading) return;
    setActionError(null);

    if (!monGuichet) {
      setActionError("Aucun guichet n'est assigné à votre compte. Contactez un administrateur.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/tickets/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guichetId: monGuichet.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) {
          setActionError("Aucun ticket en attente dans la file d'attente.");
        } else if (res.status === 409) {
          setActionError("Tous les tickets viennent d'être pris. Réessayez dans un instant.");
        } else {
          setActionError(d.error ?? `Erreur ${res.status}`);
        }
      } else {
        refreshAttente();
        refreshEnCours();
        refreshGuichets();
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminer = async () => {
    if (!ticketActuel || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketActuel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: "termine" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setActionError(d.error ?? `Erreur ${res.status}`);
      } else {
        refreshEnCours();
        refreshAttente();
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!monGuichet || actionLoading) return;
    const nouveauStatut = monGuichet.statut === "pause" ? "ouvert" : "pause";
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/guichets/${monGuichet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: nouveauStatut }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setActionError(d.error ?? `Erreur ${res.status}`);
      } else {
        refreshGuichets();
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelancerAppel = async () => {
    if (!ticketActuel || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketActuel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relance: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setActionError(d.error ?? `Erreur ${res.status}`);
      } else {
        refreshEnCours();
      }
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setActionLoading(false);
    }
  };

  const nomComplet = user ? `${user.prenom} ${user.nom}` : 'Chargement…';
  const guichetLabel = monGuichet ? `Guichet ${String(monGuichet.numero).padStart(2, '0')}` : 'Guichet —';

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <CaissierNav activeHref="/caissier" guichetLabel={guichetLabel} />

      <main className="lg:ml-72 flex flex-col relative pb-20 lg:pb-0">
        <header className="flex justify-between items-center w-full px-4 lg:px-8 h-16 lg:h-24 bg-surface border-b border-on-surface/5 sticky top-0 z-10">
          <h2 className="font-headline tracking-tight font-bold text-lg lg:text-2xl text-on-surface">Vista Gui Queue Manager</h2>
          <div className="flex items-center gap-3 lg:gap-4 border-l border-on-surface/10 pl-3 lg:pl-6">
            <div className="hidden lg:flex flex-col items-end">
              <span className="font-bold text-sm text-on-surface">{nomComplet}</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Caissier</span>
            </div>
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-sm">
              {user ? `${user.prenom[0]}${user.nom[0]}` : '…'}
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-10 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {!authLoading && user && !monGuichet && (
            <div className="lg:col-span-12 bg-amber-50 border border-amber-200 rounded-xl px-4 lg:px-6 py-4 text-amber-800 text-sm font-semibold flex items-center gap-3">
              <span className="text-amber-500 text-lg">⚠</span>
              Aucun guichet n&apos;est assigné à votre compte. Contactez un administrateur pour l&apos;assigner à un guichet.
            </div>
          )}
          {actionError && (
            <div className="lg:col-span-12 bg-red-50 border border-red-200 rounded-xl px-4 lg:px-6 py-4 text-red-700 text-sm font-semibold flex items-center justify-between gap-3">
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 font-bold text-lg leading-none">×</button>
            </div>
          )}

          <div className="lg:col-span-8 flex flex-col gap-4 lg:gap-6">
            {/* Ticket actuel */}
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 lg:p-12 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(17,28,45,0.06)] relative overflow-hidden">
              <span className="text-slate-500 text-sm uppercase tracking-widest mb-3 lg:mb-4 font-bold">Ticket Actuel</span>
              <h2 className="text-7xl lg:text-9xl font-headline font-extrabold text-primary tracking-tighter mb-6 lg:mb-10">
                {ticketActuel ? ticketActuel.numero : '—'}
              </h2>
              {ticketActuel ? (
                <p className="text-secondary text-sm mb-4 lg:mb-6">{ticketActuel.serviceName}</p>
              ) : null}
              <button
                onClick={handleAppelerSuivant}
                disabled={actionLoading}
                className="bg-gradient-to-br from-primary to-primary-container text-white px-6 lg:px-12 py-4 lg:py-6 rounded-full font-headline font-bold text-xl lg:text-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Megaphone className="w-6 h-6 lg:w-8 lg:h-8" />
                {actionLoading ? 'Appel en cours…' : 'Appeler le Suivant'}
              </button>
            </div>

            {/* Boutons d'action */}
            <div className="grid grid-cols-3 gap-3 lg:gap-4">
              <button
                onClick={handlePause}
                disabled={!monGuichet || actionLoading}
                className={`flex flex-col items-center justify-center gap-2 lg:gap-3 p-4 lg:p-6 rounded-xl font-headline font-semibold transition-colors border disabled:opacity-50 ${monGuichet?.statut === 'pause' ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}
              >
                {monGuichet?.statut === 'pause' ? <PlayCircle className="w-6 h-6 lg:w-8 lg:h-8" /> : <PauseCircle className="w-6 h-6 lg:w-8 lg:h-8" />}
                <span className="text-xs lg:text-sm">{monGuichet?.statut === 'pause' ? 'Reprendre' : 'Pause'}</span>
              </button>
              <button
                onClick={handleRelancerAppel}
                disabled={!ticketActuel || actionLoading}
                className="flex flex-col items-center justify-center gap-2 lg:gap-3 p-4 lg:p-6 bg-white rounded-xl text-slate-600 font-headline font-semibold hover:bg-slate-50 transition-colors border border-slate-100 disabled:opacity-50"
              >
                <Volume2 className="w-6 h-6 lg:w-8 lg:h-8" />
                <span className="text-xs lg:text-sm">Relancer</span>
              </button>
              <button
                onClick={handleTerminer}
                disabled={!ticketActuel || actionLoading}
                className="flex flex-col items-center justify-center gap-2 lg:gap-3 p-4 lg:p-6 bg-white rounded-xl text-primary font-headline font-semibold hover:bg-red-50 transition-colors border border-slate-100 disabled:opacity-50"
              >
                <CheckCircle2 className="w-6 h-6 lg:w-8 lg:h-8" />
                <span className="text-xs lg:text-sm">Terminer</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">
            {/* Stats */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 lg:p-8">
              <h3 className="font-headline text-base lg:text-lg font-bold mb-4 lg:mb-6">Performance du jour</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-3xl lg:text-4xl font-headline font-black text-rose-400">{stats.terminesAujourdhui}</span>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-1">Clients servis</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl lg:text-4xl font-headline font-black text-rose-400">
                    {stats.tempsMoyenService > 0 ? formatDuration(stats.tempsMoyenService * 60) : '—'}
                  </span>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-1">Temps moyen</span>
                </div>
              </div>
            </div>

            {/* File d'attente preview */}
            <div className="bg-surface-container-low rounded-2xl p-6 lg:p-8 flex flex-col gap-4 lg:gap-6">
              <div className="flex justify-between items-center">
                <h3 className="font-headline text-base lg:text-lg font-bold text-on-surface">File d&apos;attente</h3>
                <span className="px-3 py-1 bg-secondary-container text-slate-700 rounded-full text-xs font-bold">
                  {attenteTickets.length} en attente
                </span>
              </div>
              <div className="space-y-3 lg:space-y-4">
                {queuePreview.length > 0 ? queuePreview.map((ticket, i) => (
                  <div key={ticket.id} className={`flex items-center justify-between p-3 lg:p-4 bg-white rounded-xl shadow-sm ${i === 0 ? 'border-l-4 border-primary' : ''}`}>
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-red-50' : 'bg-slate-100'}`}>
                        <User className={`w-4 h-4 lg:w-5 lg:h-5 ${i === 0 ? 'text-primary' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline font-bold text-on-surface">{ticket.numero}</span>
                        <span className="text-xs text-slate-500">{ticket.serviceName}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-secondary text-sm text-center py-4">Aucun ticket en attente</p>
                )}
              </div>
              <Link href="/caissier/file-attente" className="mt-2 text-primary font-headline text-sm font-bold flex items-center gap-2 hover:gap-3 transition-all">
                Voir toute la liste →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
