'use client';

import { useState, useMemo } from 'react';
import {
  LayoutDashboard, ListOrdered, MonitorSmartphone, FileText,
  Search, Filter, AlertCircle, Clock, ArrowRightLeft, Star, Baby,
  HeartPulse, ShieldAlert, MoreVertical, BellRing, CheckCircle2, XCircle
} from 'lucide-react';
import Link from 'next/link';
import { AdminLogoutButton } from '@/components/admin-logout-button';
import { useTickets } from '@/hooks/useTickets';
import { useGuichets } from '@/hooks/useGuichets';
import { useServices } from '@/hooks/useServices';
import { useAuth } from '@/hooks/useAuth';
import { useAlertes } from '@/hooks/useAlertes';
import type { Ticket } from '@/lib/types';
function minutesWaiting(ts: string): number {
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

const PRIORITY_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  vip:      { label: 'VIP',            icon: <Star className="w-4 h-4 text-purple-500 fill-purple-500" />,  cls: 'bg-purple-50 text-purple-700' },
  handicap: { label: 'Urgence',        icon: <ShieldAlert className="w-4 h-4 text-primary" />,              cls: 'bg-primary-fixed text-primary' },
  enceinte: { label: 'Femme Enceinte', icon: <Baby className="w-4 h-4 text-pink-500" />,                   cls: 'bg-pink-50 text-pink-700' },
  age:      { label: 'Pers. Âgée',    icon: <HeartPulse className="w-4 h-4 text-blue-500" />,             cls: 'bg-blue-50 text-blue-700' },
  standard: { label: 'Standard',       icon: null,                                                          cls: 'bg-surface-container text-secondary' },
};

interface ReassignState { ticket: Ticket; guichetId: string }

export default function FilesAttente() {
  const { user } = useAuth();
  const { alertes } = useAlertes(false);
  const { tickets: attenteTickets, loading: l1 } = useTickets({ statut: 'attente' });
  const { tickets: enCoursTickets, loading: l2 } = useTickets({ statut: 'en_cours' });
  const { guichets } = useGuichets();
  const { services } = useServices(true);

  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [reassign, setReassign] = useState<ReassignState | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const allTickets = useMemo(() => [
    ...attenteTickets,
    ...enCoursTickets,
  ], [attenteTickets, enCoursTickets]);

  const filtered = useMemo(() => {
    return allTickets.filter(t => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.numero.toLowerCase().includes(q) || t.serviceName.toLowerCase().includes(q);
      const matchService = !serviceFilter || t.serviceCode === serviceFilter;
      return matchSearch && matchService;
    });
  }, [allTickets, search, serviceFilter]);

  const handleTerminer = async (ticketId: string) => {
    if (actionLoading) return;
    setActionLoading(ticketId);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'termine' }),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReassign = async () => {
    if (!reassign?.guichetId || actionLoading) return;
    setActionLoading(reassign.ticket.id);
    try {
      await fetch(`/api/tickets/${reassign.ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'en_cours', guichetId: reassign.guichetId }),
      });
      setReassign(null);
    } finally {
      setActionLoading(null);
    }
  };

  const nomComplet = user ? `${user.prenom} ${user.nom}` : 'Chargement…';
  const loading = l1 || l2;

  return (
    <div className="bg-surface text-on-surface min-h-screen flex">
      {/* Sidebar */}
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
          <Link href="/superviseur/files-attente" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <ListOrdered className="w-5 h-5 fill-current" />
            Files d&apos;attente
          </Link>
          <Link href="/superviseur/guichets" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <MonitorSmartphone className="w-5 h-5" />
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

      {/* Main Content */}
      <main className="ml-72 flex-1 flex flex-col relative">
        <header className="flex justify-between items-center w-full px-8 h-24 bg-surface border-b border-on-surface/5 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">Gestion des Files d&apos;attente</h2>
            <span className="text-xs font-bold bg-surface-container px-3 py-1 rounded-full text-secondary">
              {loading ? '…' : `${filtered.length} ticket${filtered.length !== 1 ? 's' : ''}`}
            </span>
          </div>
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
          {/* Filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div className="flex items-center bg-surface-container-lowest rounded-full px-4 py-2 shadow-[0_10px_30px_rgba(17,28,45,0.04)] w-full md:w-96 border border-on-surface/5">
              <Search className="w-5 h-5 text-secondary mr-3 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un ticket (ex: A-023)..."
                className="bg-transparent border-none outline-none text-sm font-medium text-on-surface w-full"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilter(v => !v)}
                className={`flex items-center gap-2 text-sm font-bold transition-colors border px-6 py-3 rounded-full shadow-sm ${showFilter ? 'bg-primary text-white border-primary' : 'text-secondary hover:text-primary bg-surface-container-lowest border-on-surface/5'}`}
              >
                <Filter className="w-4 h-4" />
                Filtrer par Service
              </button>
            </div>
          </div>

          {/* Service filter pills */}
          {showFilter && (
            <div className="flex flex-wrap gap-3 mb-6 animate-in fade-in duration-200">
              <button
                onClick={() => setServiceFilter('')}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${!serviceFilter ? 'bg-primary text-white' : 'bg-surface-container text-secondary hover:bg-surface-container-low'}`}
              >
                Tous
              </button>
              {services.map(s => (
                <button
                  key={s.code}
                  onClick={() => setServiceFilter(s.code)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${serviceFilter === s.code ? 'bg-primary text-white' : 'bg-surface-container text-secondary hover:bg-surface-container-low'}`}
                >
                  {s.nom}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="bg-surface-container-lowest rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] border border-on-surface/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-on-surface/5">
                    <th className="px-8 py-5 text-xs font-extrabold text-secondary uppercase tracking-widest">Ticket</th>
                    <th className="px-8 py-5 text-xs font-extrabold text-secondary uppercase tracking-widest">Service</th>
                    <th className="px-8 py-5 text-xs font-extrabold text-secondary uppercase tracking-widest">Priorité</th>
                    <th className="px-8 py-5 text-xs font-extrabold text-secondary uppercase tracking-widest">Attente</th>
                    <th className="px-8 py-5 text-xs font-extrabold text-secondary uppercase tracking-widest">Statut</th>
                    <th className="px-8 py-5 text-right text-xs font-extrabold text-secondary uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {loading ? (
                    <tr><td colSpan={6} className="px-8 py-16 text-center text-secondary">Chargement…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-8 py-16 text-center text-secondary">Aucun ticket actif</td></tr>
                  ) : filtered.map(ticket => {
                    const pc = PRIORITY_CONFIG[ticket.priorite] ?? PRIORITY_CONFIG.standard;
                    const wait = minutesWaiting(ticket.createdAt);
                    const isDelayed = wait > 15;
                    const isEnCours = ticket.statut === 'en_cours';
                    const busy = actionLoading === ticket.id;
                    return (
                      <tr key={ticket.id} className="hover:bg-surface-container-low/30 transition-colors group">
                        <td className="px-8 py-6">
                          <span className="font-headline font-black text-xl text-on-surface">{ticket.numero}</span>
                        </td>
                        <td className="px-8 py-6 font-medium text-secondary">{ticket.serviceName}</td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            {pc.icon}
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest ${pc.cls}`}>
                              {pc.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className={`flex items-center gap-2 font-headline font-bold ${isDelayed ? 'text-primary' : 'text-on-surface'}`}>
                            {isDelayed && <AlertCircle className="w-4 h-4 text-primary" />}
                            <Clock className={`w-4 h-4 ${isDelayed ? 'text-primary' : 'text-secondary'}`} />
                            {wait}m
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            {isEnCours ? (
                              <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm font-bold text-emerald-600">En cours</span></>
                            ) : (
                              <><Clock className="w-4 h-4 text-secondary" /><span className="text-sm font-bold text-secondary">En attente</span></>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setReassign({ ticket, guichetId: '' })}
                              disabled={busy}
                              className="p-2 text-secondary hover:text-primary hover:bg-primary-fixed rounded-full transition-colors disabled:opacity-40"
                              title="Réattribuer à un autre guichet"
                            >
                              <ArrowRightLeft className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleTerminer(ticket.id)}
                              disabled={busy}
                              className="p-2 text-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors disabled:opacity-40"
                              title="Forcer terminer"
                            >
                              {busy ? <XCircle className="w-5 h-5 animate-pulse" /> : <MoreVertical className="w-5 h-5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Reassign Modal */}
      {reassign && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-headline font-black text-2xl text-slate-900">Réattribuer le ticket</h3>
              <p className="text-slate-500 text-sm mt-1">
                Ticket <span className="font-bold text-primary">{reassign.ticket.numero}</span> — {reassign.ticket.serviceName}
              </p>
            </div>
            <div className="p-8">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Guichet de destination</label>
              <select
                value={reassign.guichetId}
                onChange={e => setReassign(r => r ? { ...r, guichetId: e.target.value } : null)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
              >
                <option value="">Sélectionner un guichet ouvert...</option>
                {guichets.filter(g => g.statut === 'ouvert').map(g => (
                  <option key={g.id} value={g.id}>Guichet {String(g.numero).padStart(2, '0')} — {g.nom}</option>
                ))}
              </select>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setReassign(null)} className="flex-1 py-3 px-4 rounded-full font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                Annuler
              </button>
              <button
                onClick={handleReassign}
                disabled={!reassign.guichetId || actionLoading !== null}
                className="flex-1 py-3 px-4 rounded-full font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {actionLoading ? 'En cours…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
