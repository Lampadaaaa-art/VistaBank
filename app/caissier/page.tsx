"use client";

import { useState, useMemo } from 'react';
import { LayoutDashboard, ListOrdered, History, HelpCircle, Megaphone, PauseCircle, PlayCircle, ArrowUpRight, CheckCircle2, User, X } from 'lucide-react';
import { AdminLogoutButton } from '@/components/admin-logout-button';
import Link from 'next/link';
import { useTickets } from '@/hooks/useTickets';
import { useGuichets } from '@/hooks/useGuichets';
import { useStats } from '@/hooks/useStats';
import { useAuth } from '@/hooks/useAuth';
import { useServices } from '@/hooks/useServices';

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
  const { services } = useServices(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferCode, setTransferCode] = useState('');

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
    console.log('[Appeler] click — monGuichet:', monGuichet, '| attenteTickets:', attenteTickets.length, '| actionLoading:', actionLoading);
    if (actionLoading) return;
    setActionError(null);

    if (!monGuichet) {
      setActionError("Aucun guichet n'est assigné à votre compte. Contactez un administrateur.");
      return;
    }
    if (!attenteTickets.length) {
      setActionError("Aucun ticket en attente dans la file d'attente.");
      return;
    }

    setActionLoading(true);
    try {
      // Terminer automatiquement le ticket en cours avant d'en appeler un nouveau
      if (ticketActuel) {
        const termRes = await fetch(`/api/tickets/${ticketActuel.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statut: "termine" }),
        });
        if (!termRes.ok) {
          const d = await termRes.json().catch(() => ({}));
          setActionError(d.error ?? `Erreur ${termRes.status}`);
          return;
        }
      }

      const prochainTicket = sortedAttenteTickets[0];
      const res = await fetch(`/api/tickets/${prochainTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: "en_cours", guichetId: monGuichet.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setActionError(d.error ?? `Erreur ${res.status}`);
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

  const handleTransferer = () => {
    if (!ticketActuel || actionLoading) return;
    setTransferCode('');
    setShowTransferModal(true);
  };

  const handleConfirmTransfer = async () => {
    if (!ticketActuel || !transferCode || actionLoading) return;
    const targetService = services.find(s => s.code === transferCode);
    if (!targetService) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res1 = await fetch(`/api/tickets/${ticketActuel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: "transfere" }),
      });
      if (!res1.ok) {
        const d = await res1.json().catch(() => ({}));
        setActionError(d.error ?? `Erreur ${res1.status}`);
        return;
      }
      await fetch('/api/public/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceCode: targetService.code,
          serviceName: targetService.nom,
          priorite: ticketActuel.priorite,
        }),
      });
      setShowTransferModal(false);
      refreshEnCours();
      refreshAttente();
    } catch {
      setActionError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setActionLoading(false);
    }
  };

  const nomComplet = user ? `${user.prenom} ${user.nom}` : 'Chargement…';
  const guichetLabel = monGuichet ? `Guichet ${String(monGuichet.numero).padStart(2, '0')}` : 'Guichet —';

  return (
    <div className="bg-surface text-on-surface min-h-screen flex">
      {/* Sidebar */}
      <aside className="h-screen w-72 left-0 top-0 fixed bg-surface-container-low shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex flex-col py-8 z-20">
        <div className="px-6 mb-12">
          <p className="text-primary font-headline text-2xl font-black tracking-tight">{guichetLabel}</p>
          <p className="text-secondary text-xs font-bold uppercase tracking-widest mt-1">Hall Principal</p>
        </div>
        <nav className="flex-1">
          <Link href="/caissier" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <LayoutDashboard className="w-5 h-5 fill-current" />
            Tableau de bord
          </Link>
          <Link href="/caissier/file-attente" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <ListOrdered className="w-5 h-5" />
            File d&apos;attente
          </Link>
          <Link href="/caissier/historique" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <History className="w-5 h-5" />
            Historique
          </Link>
          <Link href="/caissier/assistance" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <HelpCircle className="w-5 h-5" />
            Assistance
          </Link>
        </nav>
        <div className="mt-auto px-6">
          <AdminLogoutButton />
        </div>
      </aside>

      <main className="ml-72 flex-1 flex flex-col relative">
        <header className="flex justify-between items-center w-full px-8 h-24 bg-surface border-b border-on-surface/5 sticky top-0 z-10">
          <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">Vista Gui Queue Manager</h2>
          <div className="flex items-center gap-4 border-l border-on-surface/10 pl-6">
            <div className="flex flex-col items-end">
              <span className="font-bold text-sm text-on-surface">{nomComplet}</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Caissier</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-sm">
              {user ? `${user.prenom[0]}${user.nom[0]}` : '…'}
            </div>
          </div>
        </header>

        <div className="p-10 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
          {!authLoading && user && !monGuichet && (
            <div className="lg:col-span-12 bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 text-amber-800 text-sm font-semibold flex items-center gap-3">
              <span className="text-amber-500 text-lg">⚠</span>
              Aucun guichet n&apos;est assigné à votre compte. Contactez un administrateur pour l&apos;assigner à un guichet.
            </div>
          )}
          {actionError && (
            <div className="lg:col-span-12 bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-700 text-sm font-semibold flex items-center justify-between gap-3">
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 font-bold text-lg leading-none">×</button>
            </div>
          )}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-12 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(17,28,45,0.06)] relative overflow-hidden">
              <span className="text-slate-500 text-sm uppercase tracking-widest mb-4 font-bold">Ticket Actuel</span>
              <h2 className="text-9xl font-headline font-extrabold text-primary tracking-tighter mb-10">
                {ticketActuel ? ticketActuel.numero : '—'}
              </h2>
              {ticketActuel ? (
                <p className="text-secondary text-sm mb-6">{ticketActuel.serviceName}</p>
              ) : null}
              <button
                onClick={handleAppelerSuivant}
                disabled={actionLoading}
                className="bg-gradient-to-br from-primary to-primary-container text-white px-12 py-6 rounded-full font-headline font-bold text-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Megaphone className="w-8 h-8" />
                {actionLoading ? 'Appel en cours…' : 'Appeler le Suivant'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={handlePause}
                disabled={!monGuichet || actionLoading}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl font-headline font-semibold transition-colors border disabled:opacity-50 ${monGuichet?.statut === 'pause' ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}
              >
                {monGuichet?.statut === 'pause' ? <PlayCircle className="w-8 h-8" /> : <PauseCircle className="w-8 h-8" />}
                <span>{monGuichet?.statut === 'pause' ? 'Reprendre' : 'Pause'}</span>
              </button>
              <button
                onClick={handleTransferer}
                disabled={!ticketActuel || actionLoading}
                className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-xl text-slate-600 font-headline font-semibold hover:bg-slate-50 transition-colors border border-slate-100 disabled:opacity-50"
              >
                <ArrowUpRight className="w-8 h-8" />
                <span>Transférer</span>
              </button>
              <button
                onClick={handleTerminer}
                disabled={!ticketActuel || actionLoading}
                className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-xl text-primary font-headline font-semibold hover:bg-red-50 transition-colors border border-slate-100 disabled:opacity-50"
              >
                <CheckCircle2 className="w-8 h-8" />
                <span>Terminer</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="bg-slate-900 text-white rounded-2xl p-8">
              <h3 className="font-headline text-lg font-bold mb-6">Performance du jour</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-4xl font-headline font-black text-rose-400">{stats.terminesAujourdhui}</span>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-1">Clients servis</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-4xl font-headline font-black text-rose-400">
                    {stats.tempsMoyenService > 0 ? formatDuration(stats.tempsMoyenService * 60) : '—'}
                  </span>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-1">Temps moyen (m)</span>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-surface-container-low rounded-2xl p-8 flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h3 className="font-headline text-lg font-bold text-on-surface">File d&apos;attente</h3>
                <span className="px-3 py-1 bg-secondary-container text-slate-700 rounded-full text-xs font-bold">
                  {attenteTickets.length} en attente
                </span>
              </div>
              <div className="space-y-4">
                {queuePreview.length > 0 ? queuePreview.map((ticket, i) => (
                  <div key={ticket.id} className={`flex items-center justify-between p-4 bg-white rounded-xl shadow-sm ${i === 0 ? 'border-l-4 border-primary' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-red-50' : 'bg-slate-100'}`}>
                        <User className={`w-5 h-5 ${i === 0 ? 'text-primary' : 'text-slate-400'}`} />
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
              <Link href="/caissier/file-attente" className="mt-4 text-primary font-headline text-sm font-bold flex items-center gap-2 hover:gap-3 transition-all">
                Voir toute la liste
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Transfert */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-headline font-black text-2xl text-slate-900">Transférer le ticket</h3>
                <p className="text-slate-500 text-sm mt-1">Choisissez le service cible pour <span className="font-bold text-primary">{ticketActuel?.numero}</span>.</p>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-3 max-h-80 overflow-y-auto">
              {services.filter(s => s.code !== ticketActuel?.serviceCode).map(s => (
                <button
                  key={s.code}
                  onClick={() => setTransferCode(s.code)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${transferCode === s.code ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary font-headline font-black text-lg flex items-center justify-center shrink-0">
                    {s.code}
                  </div>
                  <span className="font-bold text-on-surface">{s.nom}</span>
                </button>
              ))}
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setShowTransferModal(false)} className="flex-1 py-3 px-4 rounded-full font-bold text-slate-600 hover:bg-slate-200 transition-colors">Annuler</button>
              <button onClick={handleConfirmTransfer} disabled={!transferCode || actionLoading} className="flex-1 py-3 px-4 rounded-full font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-60">
                {actionLoading ? 'Transfert…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
