"use client";

import { useMemo, useState } from 'react';
import { Search, User, Clock, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTickets } from '@/hooks/useTickets';
import { useGuichets } from '@/hooks/useGuichets';
import { useAuth } from '@/hooks/useAuth';
import { CaissierNav } from '@/components/caissier-nav';

function minutesWaiting(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  return `${m} min`;
}

const PRIORITY_LABEL: Record<string, string> = {
  standard: 'Normale',
  vip: 'VIP',
  enceinte: 'Prioritaire',
  age: 'Prioritaire',
  handicap: 'Prioritaire',
};

export default function FileAttente() {
  const { user, loading: authLoading } = useAuth();
  const { tickets: attenteTickets, loading, refresh: refreshAttente } = useTickets({ statut: "attente" });
  const { guichets, loading: guichetsLoading } = useGuichets();
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const monGuichet = guichets.find(g =>
    user?.guichetId ? g.id === user.guichetId : g.caissierUid === user?.uid
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return attenteTickets;
    const q = search.toLowerCase();
    return attenteTickets.filter(t =>
      t.numero.toLowerCase().includes(q) || t.serviceName.toLowerCase().includes(q)
    );
  }, [attenteTickets, search]);

  const handleAppeler = async (ticketId: string) => {
    if (!monGuichet || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: "en_cours", guichetId: monGuichet.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setActionError(d.error ?? `Erreur ${res.status}`);
      } else {
        refreshAttente();
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
      <CaissierNav activeHref="/caissier/file-attente" guichetLabel={guichetLabel} />

      <main className="lg:ml-72 min-h-screen flex flex-col relative pb-20 lg:pb-0">
        <header className="flex justify-between items-center w-full px-4 lg:px-8 h-16 lg:h-24 bg-surface border-b border-on-surface/5 sticky top-0 z-10">
          <h2 className="font-headline tracking-tight font-bold text-lg lg:text-2xl text-on-surface">File d&apos;attente globale</h2>
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

        <div className="p-4 lg:p-10 max-w-6xl mx-auto w-full">
          {!guichetsLoading && !authLoading && user && !monGuichet && (
            <div className="mb-4 lg:mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 lg:px-6 py-4 text-amber-800 text-sm font-semibold flex items-center gap-3">
              <span className="text-amber-500 text-lg">⚠</span>
              Aucun guichet assigné — vous pouvez voir les tickets mais pas les appeler. Contactez un administrateur.
            </div>
          )}
          {actionError && (
            <div className="mb-4 lg:mb-6 bg-red-50 border border-red-200 rounded-xl px-4 lg:px-6 py-4 text-red-700 text-sm font-semibold flex items-center justify-between gap-3">
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 font-bold text-lg leading-none">×</button>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 lg:mb-12 gap-4 lg:gap-6">
            <div>
              <h3 className="text-2xl lg:text-4xl font-extrabold text-on-surface mb-2 lg:mb-3 tracking-tight font-headline">Tickets en attente</h3>
              <p className="text-secondary text-base lg:text-lg leading-relaxed">
                {loading ? 'Chargement…' : `${attenteTickets.length} client${attenteTickets.length !== 1 ? 's' : ''} en attente`}
              </p>
            </div>
            <div className="flex items-center bg-surface-container-lowest rounded-full px-4 py-2 shadow-[0_10px_30px_rgba(17,28,45,0.04)] w-full md:w-auto">
              <Search className="w-5 h-5 text-secondary mr-3 shrink-0" />
              <input
                type="text"
                placeholder="Rechercher un ticket..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-medium text-on-surface w-full md:w-64"
              />
            </div>
          </div>

          {/* Vue mobile — cartes */}
          <div className="lg:hidden space-y-3">
            {loading ? (
              <p className="text-center text-secondary py-8">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-secondary py-8">Aucun ticket en attente</p>
            ) : filtered.map((ticket) => {
              const isHighPriority = ticket.priorite !== 'standard';
              return (
                <div key={ticket.id} className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isHighPriority ? 'bg-primary-fixed' : 'bg-slate-100'}`}>
                    <User className={`w-6 h-6 ${isHighPriority ? 'text-primary' : 'text-slate-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-headline font-black text-xl text-on-surface">{ticket.numero}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest shrink-0 ${isHighPriority ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-secondary'}`}>
                        {PRIORITY_LABEL[ticket.priorite] ?? ticket.priorite}
                      </span>
                    </div>
                    <p className="text-sm text-secondary truncate">{ticket.serviceName}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {minutesWaiting(ticket.createdAt)}
                    </div>
                  </div>
                  {monGuichet && (
                    <button
                      onClick={() => handleAppeler(ticket.id)}
                      disabled={actionLoading}
                      className="shrink-0 px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold disabled:opacity-50 active:scale-95 transition-transform"
                    >
                      Appeler
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Vue desktop — tableau */}
          <div className="hidden lg:block bg-surface-container-lowest rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Ticket</th>
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Service Demandé</th>
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Temps d&apos;attente</th>
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Priorité</th>
                  <th className="px-8 py-5 text-right text-sm font-extrabold text-on-surface uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-secondary">Chargement…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-secondary">Aucun ticket en attente</td>
                  </tr>
                ) : filtered.map((ticket) => {
                  const isHighPriority = ticket.priorite !== 'standard';
                  return (
                    <tr key={ticket.id} className="hover:bg-surface-container-low/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isHighPriority ? 'bg-primary-fixed' : 'bg-slate-100'}`}>
                            <User className={`w-6 h-6 ${isHighPriority ? 'text-primary' : 'text-slate-600'}`} />
                          </div>
                          <span className="font-headline font-black text-xl text-on-surface">{ticket.numero}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-medium text-secondary">{ticket.serviceName}</td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-on-surface font-headline font-bold">
                          <Clock className="w-4 h-4 text-secondary" />
                          {minutesWaiting(ticket.createdAt)}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest ${isHighPriority ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-secondary'}`}>
                          {PRIORITY_LABEL[ticket.priorite] ?? ticket.priorite}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => handleAppeler(ticket.id)}
                          disabled={!monGuichet || actionLoading}
                          className="text-primary font-bold text-sm hover:underline flex items-center justify-end gap-1 w-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                        >
                          Appeler <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
