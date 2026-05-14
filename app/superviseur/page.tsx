"use client";

import { useMemo } from 'react';
import { LayoutDashboard, Users, Clock, Activity, AlertTriangle, Filter, ArrowUpRight, ListOrdered, MonitorSmartphone, FileText, BellRing } from 'lucide-react';
import { AdminLogoutButton } from '@/components/admin-logout-button';
import Link from 'next/link';
import { useStats } from '@/hooks/useStats';
import { useAlertes } from '@/hooks/useAlertes';
import { useServices } from '@/hooks/useServices';
import { useAuth } from '@/hooks/useAuth';
function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  return `Il y a ${Math.floor(m / 60)}h`;
}

export default function Superviseur() {
  const { user } = useAuth();
  const { stats, loading: statsLoading, tickets: allTickets } = useStats();
  const { alertes } = useAlertes(false);
  const { services } = useServices(true);

  const attenteTickets = useMemo(
    () => allTickets.filter(t => t.statut === 'attente'),
    [allTickets]
  );

  const fluxServices = useMemo(() =>
    services.map(s => {
      const enAttente = attenteTickets.filter(t => t.serviceCode === s.code);
      const waitTimes = enAttente.map(t =>
        Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000)
      );
      const attenteMax = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;
      return { ...s, enAttente: enAttente.length, attenteMax };
    }),
    [services, attenteTickets]
  );

  const alertesCritiques = alertes.filter(a => a.severite === 'critique');
  const nomComplet = user ? `${user.prenom} ${user.nom}` : 'Chargement…';

  return (
    <div className="bg-surface text-on-surface min-h-screen flex">
      {/* Sidebar */}
      <aside className="h-screen w-72 left-0 top-0 fixed bg-surface-container-low shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex flex-col py-8 z-20">
        <div className="px-6 mb-12">
          <p className="text-primary font-headline text-2xl font-black tracking-tight">Supervision</p>
          <p className="text-secondary text-xs font-bold uppercase tracking-widest mt-1">Agence Principale</p>
        </div>
        <nav className="flex-1">
          <Link href="/superviseur" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <LayoutDashboard className="w-5 h-5 fill-current" />
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
            <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">Supervision Temps Réel</h2>
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full ml-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">Système Opérationnel</span>
            </div>
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
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex items-center justify-between border border-on-surface/5">
              <div>
                <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">En Attente</p>
                <p className="text-4xl font-headline font-black text-on-surface">
                  {statsLoading ? '…' : stats.enAttente}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary-container text-primary rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex items-center justify-between border border-on-surface/5">
              <div>
                <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Temps Moy. Attente</p>
                <p className="text-4xl font-headline font-black text-orange-500">
                  {statsLoading ? '…' : `${stats.tempsMoyenAttente}m`}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex items-center justify-between border border-on-surface/5">
              <div>
                <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Guichets Actifs</p>
                <p className="text-4xl font-headline font-black text-emerald-600">
                  {statsLoading ? '…' : `${stats.guichetsOuverts}/${stats.totalGuichets}`}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-primary-fixed rounded-[1.5rem] p-6 shadow-[0_20px_50px_rgba(200,16,46,0.15)] flex items-center justify-between relative overflow-hidden">
              <div className={`absolute inset-0 bg-primary/5 ${alertesCritiques.length > 0 ? 'animate-pulse' : ''}`}></div>
              <div className="relative z-10">
                <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">Alertes</p>
                <p className="text-4xl font-headline font-black text-primary">{alertes.length}</p>
              </div>
              <div className="w-12 h-12 bg-white text-primary rounded-xl flex items-center justify-center relative z-10 shadow-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Flux par Service */}
            <div className="lg:col-span-2 bg-surface-container-lowest rounded-[1.5rem] p-8 shadow-[0_20px_50px_rgba(17,28,45,0.06)] border border-on-surface/5">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-headline font-extrabold text-xl text-on-surface">Flux par Service</h3>
                <button className="flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary transition-colors bg-surface-container px-4 py-2 rounded-full">
                  <Filter className="w-4 h-4" />
                  Filtrer
                </button>
              </div>
              <div className="space-y-4">
                {fluxServices.length === 0 ? (
                  <p className="text-secondary text-sm text-center py-8">Aucun service actif</p>
                ) : fluxServices.map((service) => {
                  const status = service.attenteMax > 20 ? 'warning' : service.enAttente === 0 ? 'good' : 'normal';
                  return (
                    <div key={service.id} className="bg-surface-container-low rounded-2xl p-5 flex items-center justify-between border border-on-surface/5 hover:bg-surface-container transition-colors group">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-headline font-black text-xl shadow-sm
                          ${status === 'warning' ? 'bg-orange-100 text-orange-600' :
                            status === 'good' ? 'bg-emerald-100 text-emerald-600' :
                            'bg-white text-primary'}`}>
                          {service.code}
                        </div>
                        <div>
                          <h4 className="font-bold text-on-surface text-lg">{service.nom}</h4>
                          <p className="text-xs font-bold text-secondary uppercase tracking-widest mt-0.5">Service Actif</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-2xl font-black text-on-surface font-headline">{service.enAttente}</p>
                          <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1">En attente</p>
                        </div>
                        <div className="text-center w-20">
                          <p className={`text-2xl font-black font-headline ${status === 'warning' ? 'text-orange-600' : 'text-on-surface'}`}>
                            {service.attenteMax}m
                          </p>
                          <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1">Attente Max</p>
                        </div>
                        <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-secondary hover:text-primary hover:shadow-md transition-all opacity-0 group-hover:opacity-100">
                          <ArrowUpRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alertes Actives */}
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-8 shadow-[0_20px_50px_rgba(17,28,45,0.06)] border border-on-surface/5 flex flex-col">
              <h3 className="font-headline font-extrabold text-xl text-on-surface mb-8 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-primary" />
                Alertes Actives
              </h3>
              <div className="flex-1 space-y-4">
                {alertes.length === 0 ? (
                  <p className="text-secondary text-sm text-center py-8">Aucune alerte active</p>
                ) : alertes.slice(0, 3).map((alerte) => {
                  const isCritique = alerte.severite === 'critique';
                  return (
                    <div key={alerte.id} className={`rounded-2xl p-5 relative overflow-hidden ${isCritique ? 'bg-primary-fixed border border-primary/10' : 'bg-orange-50 border border-orange-100'}`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCritique ? 'bg-primary' : 'bg-orange-400'}`}></div>
                      <div className="flex items-start gap-4">
                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${isCritique ? 'bg-primary animate-pulse' : 'bg-orange-400'}`}></div>
                        <div>
                          <h4 className={`font-bold text-sm uppercase tracking-wider mb-1 ${isCritique ? 'text-primary' : 'text-orange-700'}`}>
                            {alerte.titre}
                          </h4>
                          <p className="text-sm text-on-surface/80 leading-relaxed">{alerte.message}</p>
                          <p className="text-xs text-secondary mt-2">{timeAgo(alerte.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {alertes.length > 3 && (
                  <Link href="/superviseur/alertes" className="block text-center text-primary font-bold text-sm hover:underline pt-2">
                    Voir toutes les alertes ({alertes.length})
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
