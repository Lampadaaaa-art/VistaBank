import Link from 'next/link';
import { User, Tv, Monitor, LayoutDashboard, Eye, Lock, ArrowRight, PlayCircle, Landmark } from 'lucide-react';


export default function Home() {
  return (
    <>
    <div className="flex-grow pt-32 pb-20 px-8 max-w-7xl mx-auto w-full">
      {/* TopNavBar */}
      <nav className="fixed top-0 left-0 z-50 bg-white/80 backdrop-blur-md shadow-sm flex items-center w-full px-8 py-4">
        <div className="flex-1"></div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <Landmark className="w-5 h-5" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-headline tracking-tight">Vista Gui</span>
        </div>
        <div className="flex-1 flex justify-end">
          <Link href="/login" className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-full font-bold hover:opacity-90 transition-all shadow-md shadow-red-100">
            <Lock className="w-5 h-5" />
            Se connecter
          </Link>
        </div>
      </nav>

      <header className="mb-16">
        <h1 className="text-5xl font-extrabold font-headline text-on-surface tracking-tight mb-4">
          Souveraineté des Flux.
        </h1>
        <p className="text-xl text-secondary font-body max-w-2xl leading-relaxed">
          Gérez vos files d&apos;attente avec une précision chirurgicale. Une expérience concierge pour vos clients et une efficacité absolue pour vos équipes.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Borne Client */}
        <div className="md:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm p-8 flex flex-col justify-between min-h-[340px] group transition-all hover:-translate-y-1 border border-slate-100">
          <div className="flex justify-between items-start">
            <div className="w-16 h-16 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
              <User className="w-8 h-8" />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-primary uppercase tracking-widest">Opérationnel</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-secondary">En ligne</span>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold font-headline mb-2 text-on-surface">Borne Client</h2>
            <p className="text-secondary mb-8 max-w-md">Interface intuitive pour la distribution de tickets et l&apos;orientation des visiteurs à leur arrivée.</p>
            <Link href="/borne" className="bg-gradient-to-br from-primary to-primary-container text-white font-bold py-3 px-8 rounded-full flex items-center gap-3 w-fit group-hover:shadow-lg group-hover:shadow-red-200 transition-all">
              Lancer la Borne <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Écran TV */}
        <Link href="/tv" className="md:col-span-4 bg-surface-container-lowest rounded-xl shadow-sm p-8 flex flex-col justify-between min-h-[340px] border-t-4 border-primary transition-all hover:bg-surface-container-low group border border-slate-100">
          <div className="w-16 h-16 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
            <Tv className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold font-headline mb-2 text-on-surface">Écran TV</h2>
            <p className="text-secondary text-sm leading-relaxed mb-4">Affichage dynamique des appels et informations publiques en temps réel.</p>
          </div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide">
            <PlayCircle className="w-5 h-5" />
            Aperçu direct
          </div>
        </Link>

        {/* Caissier */}
        <Link href="/caissier" className="md:col-span-4 bg-surface-container-lowest rounded-xl shadow-sm p-8 min-h-[300px] flex flex-col justify-between transition-all hover:-translate-y-1 group border border-slate-100">
          <div className="w-14 h-14 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
            <Monitor className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold font-headline mb-2 text-on-surface">Caissier</h3>
            <p className="text-sm text-secondary">Appelez le client suivant et gérez vos états de service depuis votre poste.</p>
          </div>
          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary w-2/3"></div>
          </div>
        </Link>

        {/* Administrateur */}
        <Link href="/admin" className="md:col-span-4 bg-slate-900 text-white rounded-xl shadow-sm p-8 min-h-[300px] flex flex-col justify-between transition-all hover:-translate-y-1 group">
          <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-primary-fixed">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold font-headline mb-2">Administrateur</h3>
            <p className="text-sm text-slate-400">Supervision globale, gestion des services et analytique de performance.</p>
          </div>
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700"></div>
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-600"></div>
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-primary flex items-center justify-center text-[10px] font-bold">+3</div>
          </div>
        </Link>

        {/* Superviseur */}
        <Link href="/superviseur" className="md:col-span-4 bg-surface-container-lowest rounded-xl shadow-sm p-8 min-h-[300px] flex flex-col justify-between transition-all hover:-translate-y-1 group border border-slate-100">
          <div className="w-14 h-14 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
            <Eye className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold font-headline mb-2 text-on-surface">Superviseur</h3>
            <p className="text-sm text-secondary">Supervision des flux et gestion des alertes en temps réel.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary px-3 py-1 bg-red-50 rounded-full">Temps Réel</span>
          </div>
        </Link>
      </div>
    </div>

    {/* Footer */}
    <footer className="w-full bg-white border-t border-slate-100 px-8 py-4 flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-sm font-bold text-on-surface font-headline">Vista Gui Sovereign Authority</span>
        <span className="text-xs text-secondary mt-0.5">Statut Système&nbsp;: En ligne&nbsp;|&nbsp;© 2026 Vista Gui Sovereign Authority</span>
      </div>
      <span className="text-sm font-bold text-primary bg-red-50 px-4 py-1.5 rounded-full">Session Sécurisée</span>
    </footer>
    </>
  );
}
