'use client';

import { LayoutDashboard, ListOrdered, History, HelpCircle } from 'lucide-react';
import { AdminLogoutButton } from '@/components/admin-logout-button';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '/caissier', label: 'Tableau de bord', short: 'Accueil', icon: LayoutDashboard },
  { href: '/caissier/file-attente', label: "File d'attente", short: 'File', icon: ListOrdered },
  { href: '/caissier/historique', label: 'Historique', short: 'Historique', icon: History },
  { href: '/caissier/assistance', label: 'Assistance', short: 'Aide', icon: HelpCircle },
];

interface CaissierNavProps {
  activeHref: string;
  guichetLabel: string;
}

export function CaissierNav({ activeHref, guichetLabel }: CaissierNavProps) {
  return (
    <>
      {/* Sidebar — desktop uniquement */}
      <aside className="hidden lg:flex h-screen w-72 left-0 top-0 fixed bg-surface-container-low shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex-col py-8 z-20">
        <div className="px-6 mb-12">
          <p className="text-primary font-headline text-2xl font-black tracking-tight">{guichetLabel}</p>
          <p className="text-secondary text-xs font-bold uppercase tracking-widest mt-1">Hall Principal</p>
        </div>
        <nav className="flex-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200 ${
                activeHref === href
                  ? 'bg-surface-container-lowest text-primary-container rounded-xl shadow-sm'
                  : 'text-on-surface/60 hover:bg-white/50 transition-all rounded-xl'
              }`}
            >
              <Icon className={`w-5 h-5 ${activeHref === href ? 'fill-current' : ''}`} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-6">
          <AdminLogoutButton />
        </div>
      </aside>

      {/* Barre de navigation — mobile uniquement */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-container-low border-t border-on-surface/10 flex safe-area-pb">
        {NAV_LINKS.map(({ href, short, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              activeHref === href ? 'text-primary' : 'text-on-surface/40'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{short}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
