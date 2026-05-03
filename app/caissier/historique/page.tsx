'use client';

import { useMemo, useState } from 'react';
import { LayoutDashboard, ListOrdered, History, HelpCircle, Calendar, CheckCircle2, Search, ArrowUpRight } from 'lucide-react';
import { AdminLogoutButton } from '@/components/admin-logout-button';
import Link from 'next/link';
import { useTickets } from '@/hooks/useTickets';
import { useGuichets } from '@/hooks/useGuichets';
import { useAuth } from '@/hooks/useAuth';
function formatTime(ts?: string): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export default function Historique() {
  const { user } = useAuth();
  const { tickets: terminesTickets, loading } = useTickets({ statut: 'termine' });
  const { guichets } = useGuichets();
  const [search, setSearch] = useState('');

  const monGuichet = guichets.find(g =>
    user?.guichetId ? g.id === user.guichetId : g.caissierUid === user?.uid
  );

  // Filtrer les tickets traités par ce caissier, triés du plus récent au plus ancien
  const mesTickets = useMemo(() => {
    return terminesTickets
      .filter(t => !user?.uid || t.caissierUid === user.uid)
      .sort((a, b) => {
        const ta = a.termineAt ? new Date(a.termineAt).getTime() : 0;
        const tb = b.termineAt ? new Date(b.termineAt).getTime() : 0;
        return tb - ta;
      });
  }, [terminesTickets, user?.uid]);

  const filtered = useMemo(() => {
    if (!search.trim()) return mesTickets;
    const q = search.toLowerCase();
    return mesTickets.filter(t =>
      t.numero.toLowerCase().includes(q) || t.serviceName.toLowerCase().includes(q)
    );
  }, [mesTickets, search]);

  const nomComplet = user ? `${user.prenom} ${user.nom}` : 'Chargement…';
  const guichetLabel = monGuichet ? `Guichet ${String(monGuichet.numero).padStart(2, '0')}` : 'Guichet —';

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* Sidebar */}
      <aside className="h-screen w-72 left-0 top-0 fixed bg-surface-container-low shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex flex-col py-8 z-20">
        <div className="px-6 mb-12">
          <p className="text-primary font-headline text-2xl font-black tracking-tight">{guichetLabel}</p>
          <p className="text-secondary text-xs font-bold uppercase tracking-widest mt-1">Hall Principal</p>
        </div>
        <nav className="flex-1">
          <Link href="/caissier" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <LayoutDashboard className="w-5 h-5" />
            Tableau de bord
          </Link>
          <Link href="/caissier/file-attente" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <ListOrdered className="w-5 h-5" />
            File d&apos;attente
          </Link>
          <Link href="/caissier/historique" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <History className="w-5 h-5 fill-current" />
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

      {/* Main Content */}
      <main className="ml-72 min-h-screen flex flex-col relative">
        <header className="flex justify-between items-center w-full px-8 h-24 bg-surface border-b border-on-surface/5 sticky top-0 z-10">
          <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">Historique des opérations</h2>
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

        <div className="p-10 max-w-6xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div className="max-w-2xl">
              <h3 className="text-4xl font-extrabold text-on-surface mb-3 tracking-tight font-headline">Clients Servis</h3>
              <p className="text-secondary text-lg leading-relaxed">
                {loading ? 'Chargement…' : `${mesTickets.length} ticket${mesTickets.length !== 1 ? 's' : ''} traité${mesTickets.length !== 1 ? 's' : ''} aujourd'hui`}
              </p>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <div className="flex items-center bg-surface-container-lowest rounded-full px-4 py-2 shadow-[0_10px_30px_rgba(17,28,45,0.04)] shrink-0">
                <Calendar className="w-5 h-5 text-secondary mr-3" />
                <span className="text-sm font-bold text-on-surface">
                  {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div className="flex items-center bg-surface-container-lowest rounded-full px-4 py-2 shadow-[0_10px_30px_rgba(17,28,45,0.04)] flex-1 md:flex-none">
                <Search className="w-5 h-5 text-secondary mr-3" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="N° Ticket..."
                  className="bg-transparent border-none outline-none text-sm font-medium text-on-surface w-full md:w-32"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Ticket</th>
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Service</th>
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Heure d&apos;appel</th>
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Durée</th>
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {loading ? (
                  <tr><td colSpan={5} className="px-8 py-12 text-center text-secondary">Chargement…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-12 text-center text-secondary">Aucun ticket traité</td></tr>
                ) : filtered.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-8 py-6">
                      <span className="font-headline font-black text-xl text-on-surface">{ticket.numero}</span>
                    </td>
                    <td className="px-8 py-6 font-medium text-secondary">{ticket.serviceName}</td>
                    <td className="px-8 py-6 font-headline font-bold text-on-surface">
                      {formatTime(ticket.appelleAt)}
                    </td>
                    <td className="px-8 py-6 font-headline font-bold text-secondary">
                      {formatDuration(ticket.tempsService)}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {ticket.statut === 'termine' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-bold text-emerald-600">Terminé</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-bold text-orange-600">Transféré</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
