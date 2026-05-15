"use client";

import { useState } from 'react';
import { LayoutDashboard, ListOrdered, MonitorSmartphone, BellRing, FileText, AlertTriangle, CheckCircle2, Clock, Search, MoreVertical, Trash2 } from 'lucide-react';
import { AdminLogoutButton } from '@/components/admin-logout-button';
import Link from 'next/link';
import { useAlertes } from '@/hooks/useAlertes';
import { useAuth } from '@/hooks/useAuth';
type AlerteFilter = 'toutes' | 'critiques' | 'avertissements' | 'resolues';

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  return `Il y a ${Math.floor(m / 60)}h`;
}

export default function Alertes() {
  const { user } = useAuth();
  const { alertes: actives, loading: loadingActives } = useAlertes(false);
  const { alertes: resolues } = useAlertes(true);
  const [filter, setFilter] = useState<AlerteFilter>('toutes');
  const [search, setSearch] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const nomComplet = user ? `${user.prenom} ${user.nom}` : 'Chargement…';

  const handleSupprimer = async (alerteId: string) => {
    setOpenMenuId(null);
    await fetch(`/api/alertes/${alerteId}`, { method: 'DELETE' });
  };

  const handleResoude = async (alerteId: string) => {
    if (!user || resolvingId) return;
    setResolvingId(alerteId);
    try {
      await fetch(`/api/alertes/${alerteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolue: true, resolueParUid: user.uid }),
      });
    } finally {
      setResolvingId(null);
    }
  };

  const critiques = actives.filter(a => a.severite === 'critique');
  const avertissements = actives.filter(a => a.severite === 'avertissement');

  const allAlertes = [...actives, ...resolues].filter(
    (a, i, self) => self.findIndex(b => b.id === a.id) === i
  );

  const displayed = allAlertes.filter(a => {
    if (search && !a.titre.toLowerCase().includes(search.toLowerCase()) && !a.message.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'critiques') return a.severite === 'critique' && !a.resolue;
    if (filter === 'avertissements') return a.severite === 'avertissement' && !a.resolue;
    if (filter === 'resolues') return a.resolue;
    return true;
  });

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
          <Link href="/superviseur/files-attente" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <ListOrdered className="w-5 h-5" />
            Files d&apos;attente
          </Link>
          <Link href="/superviseur/guichets" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <MonitorSmartphone className="w-5 h-5" />
            Guichets
          </Link>
          <Link href="/superviseur/alertes" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <BellRing className="w-5 h-5 fill-current" />
            Alertes
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
          <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">Gestion des Alertes</h2>
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
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-primary-fixed rounded-[1.5rem] p-6 shadow-[0_20px_50px_rgba(200,16,46,0.15)] flex items-center justify-between relative overflow-hidden">
              <div className={`absolute inset-0 bg-primary/5 ${critiques.length > 0 ? 'animate-pulse' : ''}`}></div>
              <div className="relative z-10">
                <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">Alertes Critiques</p>
                <p className="text-4xl font-headline font-black text-primary">{critiques.length}</p>
              </div>
              <div className="w-12 h-12 bg-white text-primary rounded-xl flex items-center justify-center relative z-10 shadow-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex items-center justify-between border border-on-surface/5">
              <div>
                <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Avertissements</p>
                <p className="text-4xl font-headline font-black text-orange-500">{avertissements.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex items-center justify-between border border-on-surface/5">
              <div>
                <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Résolues (Total)</p>
                <p className="text-4xl font-headline font-black text-emerald-600">{resolues.length}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div className="flex items-center bg-surface-container-lowest rounded-full px-4 py-2 shadow-[0_10px_30px_rgba(17,28,45,0.04)] w-full md:w-96 border border-on-surface/5">
              <Search className="w-5 h-5 text-secondary mr-3" />
              <input
                type="text"
                placeholder="Rechercher une alerte..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-medium text-on-surface w-full"
              />
            </div>
            <div className="flex items-center gap-2 bg-surface-container-lowest p-1.5 rounded-full shadow-sm border border-on-surface/5">
              {(['toutes', 'critiques', 'avertissements', 'resolues'] as AlerteFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-2 rounded-full font-bold text-sm transition-colors capitalize ${filter === f ? 'bg-surface-container text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'}`}
                >
                  {f === 'toutes' ? 'Toutes' : f === 'critiques' ? 'Critiques' : f === 'avertissements' ? 'Avertissements' : 'Résolues'}
                </button>
              ))}
            </div>
          </div>

          {/* Alerts List */}
          <div className="space-y-4">
            {loadingActives ? (
              <div className="text-center py-12 text-secondary">Chargement…</div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-12 text-secondary">Aucune alerte correspondante</div>
            ) : displayed.map((alerte) => {
              const isCritique = alerte.severite === 'critique';
              const isResolue = alerte.resolue;
              const borderColor = isResolue ? 'bg-emerald-500' : isCritique ? 'bg-primary' : 'bg-orange-400';
              const containerClass = isResolue
                ? 'border border-on-surface/5 opacity-70 hover:opacity-100'
                : isCritique ? 'border border-primary/20' : 'border border-on-surface/5';

              return (
                <div key={alerte.id} className={`bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-[0_20px_50px_rgba(17,28,45,0.06)] ${containerClass} relative overflow-hidden group transition-opacity`}>
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${borderColor}`}></div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-start gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                        ${isResolue ? 'bg-emerald-50 text-emerald-600' : isCritique ? 'bg-primary-fixed text-primary' : 'bg-orange-50 text-orange-500'}`}>
                        {isResolue ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={`font-headline font-extrabold text-lg text-on-surface ${isResolue ? 'line-through decoration-on-surface/30' : ''}`}>
                            {alerte.titre}
                          </h3>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md
                            ${isResolue ? 'bg-emerald-50 text-emerald-600' : isCritique ? 'bg-primary-fixed text-primary' : 'bg-orange-50 text-orange-600'}`}>
                            {isResolue ? 'Résolu' : isCritique ? 'Critique' : 'Avertissement'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-secondary mb-2">{alerte.message}</p>
                        <div className="flex items-center gap-4 text-xs font-bold text-secondary uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {timeAgo(alerte.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!isResolue && (
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                          onClick={() => handleResoude(alerte.id)}
                          disabled={resolvingId === alerte.id}
                          className="flex-1 md:flex-none px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-50"
                        >
                          {resolvingId === alerte.id ? 'En cours…' : 'Résoudre'}
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === alerte.id ? null : alerte.id)}
                            className="p-3 text-secondary hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openMenuId === alerte.id && (
                            <>
                              <div className="fixed inset-0 z-[5]" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 bg-surface-container-lowest rounded-xl shadow-lg border border-on-surface/10 z-10 min-w-[150px] overflow-hidden">
                                <button
                                  onClick={() => handleSupprimer(alerte.id)}
                                  className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Supprimer
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
