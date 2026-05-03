'use client';

import { LayoutDashboard, Users, Monitor, Settings, ShieldCheck, Activity } from 'lucide-react';
import Link from 'next/link';
import { AdminLogoutButton } from '@/components/admin-logout-button';
import { useAuth } from '@/hooks/useAuth';
import { useStats } from '@/hooks/useStats';
import { useGuichets } from '@/hooks/useGuichets';

const STATUT_COLORS: Record<string, string> = {
  ouvert: 'bg-emerald-500',
  pause: 'bg-amber-500',
  ferme: 'bg-slate-300',
  hors_ligne: 'bg-slate-300',
};

const STATUT_LABELS: Record<string, string> = {
  ouvert: 'Actif',
  pause: 'En pause',
  ferme: 'Fermé',
  hors_ligne: 'Hors ligne',
};

export default function Admin() {
  const { user } = useAuth();
  const { stats, loading: statsLoading } = useStats();
  const { guichets } = useGuichets();

  const nomComplet = user ? `${user.prenom} ${user.nom}` : 'Chargement…';
  const initiales = user ? `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}` : '…';

  const total = stats.terminesAujourdhui + stats.enAttente + stats.enCours;
  const tauxService = total > 0
    ? Math.round((stats.terminesAujourdhui / total) * 100)
    : 0;

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* Sidebar */}
      <aside className="h-screen w-72 left-0 top-0 fixed bg-surface-container-low shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex flex-col py-8 z-20">
        <div className="px-6 mb-12">
          <h1 className="text-xl font-black text-on-surface font-headline">Vista Gui Admin</h1>
          <p className="text-xs font-semibold tracking-wide text-primary-container/70 uppercase mt-1">Sovereign Authority</p>
        </div>
        <nav className="flex-1">
          <Link href="/admin" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <LayoutDashboard className="w-5 h-5 fill-current" />
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
          <Link href="/admin/parametres" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <Settings className="w-5 h-5" />
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

      {/* Main Content */}
      <main className="ml-72 min-h-screen flex flex-col">
        <header className="flex justify-between items-center w-full px-8 h-24 bg-surface border-b border-on-surface/5 sticky top-0 z-40">
          <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">Vue d&apos;ensemble</h2>
          <div className="flex items-center gap-4 border-l border-on-surface/10 pl-6">
            <div className="flex flex-col items-end">
              <span className="font-bold text-sm text-on-surface">{nomComplet}</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Administrateur</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-sm">
              {initiales}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          <div className="mb-12">
            <h3 className="text-4xl font-extrabold text-on-surface mb-3 tracking-tight font-headline">Performances du jour</h3>
            <p className="text-secondary text-lg leading-relaxed">Supervision globale de l&apos;activité et de l&apos;efficacité de vos guichets en temps réel.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-surface-container-lowest p-8 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-secondary-container text-primary rounded-2xl flex items-center justify-center">
                  <Users className="w-7 h-7" />
                </div>
                <span className="text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1.5 rounded-lg">
                  {statsLoading ? '…' : `${stats.enAttente} en att.`}
                </span>
              </div>
              <div>
                <p className="text-secondary text-sm font-bold uppercase tracking-widest mb-2">Clients Servis</p>
                <p className="text-5xl font-headline font-black text-on-surface">
                  {statsLoading ? '…' : stats.terminesAujourdhui}
                </p>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-8 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-primary-fixed text-primary rounded-2xl flex items-center justify-center">
                  <Activity className="w-7 h-7" />
                </div>
                <span className="text-primary text-sm font-bold bg-primary-fixed px-3 py-1.5 rounded-lg">
                  {statsLoading ? '…' : `${stats.enCours} en cours`}
                </span>
              </div>
              <div>
                <p className="text-secondary text-sm font-bold uppercase tracking-widest mb-2">Attente Moyenne</p>
                <p className="text-5xl font-headline font-black text-on-surface">
                  {statsLoading ? '…' : <>{stats.tempsMoyenAttente}<span className="text-2xl text-secondary">m</span></>}
                </p>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-8 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <span className="text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1.5 rounded-lg">
                  {statsLoading ? '…' : `${tauxService}%`}
                </span>
              </div>
              <div>
                <p className="text-secondary text-sm font-bold uppercase tracking-widest mb-2">Taux de Service</p>
                <p className="text-5xl font-headline font-black text-on-surface">
                  {statsLoading ? '…' : <>{tauxService}<span className="text-2xl text-secondary">%</span></>}
                </p>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-8 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-surface-container text-secondary rounded-2xl flex items-center justify-center">
                  <Monitor className="w-7 h-7" />
                </div>
                <span className="text-secondary text-sm font-bold bg-surface-container px-3 py-1.5 rounded-lg">Actif</span>
              </div>
              <div>
                <p className="text-secondary text-sm font-bold uppercase tracking-widest mb-2">Guichets Ouverts</p>
                <p className="text-5xl font-headline font-black text-on-surface">
                  {stats.guichetsOuverts}<span className="text-2xl text-secondary">/{stats.totalGuichets}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-surface-container-lowest rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] overflow-hidden">
              <div className="p-8 border-b border-surface-container-low flex items-center justify-between">
                <h3 className="font-headline font-extrabold text-xl text-on-surface">État des Guichets</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low">
                      <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Guichet</th>
                      <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Nom</th>
                      <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Statut</th>
                      <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Service</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low">
                    {guichets.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-secondary">Aucun guichet configuré</td>
                      </tr>
                    ) : guichets.map((g) => (
                      <tr key={g.id} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="px-8 py-6 font-headline font-bold text-lg text-on-surface">
                          G-{String(g.numero).padStart(2, '0')}
                        </td>
                        <td className="px-8 py-6 text-secondary font-medium">{g.nom}</td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <span className={`w-2.5 h-2.5 rounded-full ${STATUT_COLORS[g.statut] ?? 'bg-slate-300'}`}></span>
                            <span className="text-sm font-bold text-on-surface">{STATUT_LABELS[g.statut] ?? g.statut}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-secondary font-medium">{g.serviceCode ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] p-8">
              <h3 className="font-headline font-extrabold text-xl text-on-surface mb-8">Résumé d&apos;activité</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center p-4 bg-surface-container-low rounded-xl">
                  <span className="font-bold text-secondary">En attente</span>
                  <span className="font-headline font-black text-2xl text-on-surface">{stats.enAttente}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-surface-container-low rounded-xl">
                  <span className="font-bold text-secondary">En cours</span>
                  <span className="font-headline font-black text-2xl text-on-surface">{stats.enCours}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-surface-container-low rounded-xl">
                  <span className="font-bold text-secondary">Terminés</span>
                  <span className="font-headline font-black text-2xl text-emerald-600">{stats.terminesAujourdhui}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-surface-container-low rounded-xl">
                  <span className="font-bold text-secondary">Guichets ouverts</span>
                  <span className="font-headline font-black text-2xl text-on-surface">{stats.guichetsOuverts}/{stats.totalGuichets}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
