'use client';

import { useState } from 'react';
import { LayoutDashboard, ListOrdered, History, HelpCircle, MessageSquare, PhoneCall, AlertTriangle, BookOpen, CheckCircle2, Loader2 } from 'lucide-react';
import { AdminLogoutButton } from '@/components/admin-logout-button';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useGuichets } from '@/hooks/useGuichets';

type AlerteType = 'superviseur' | 'technique' | null;

export default function Assistance() {
  const { user } = useAuth();
  const { guichets } = useGuichets();

  const [sending, setSending] = useState<AlerteType>(null);
  const [sent, setSent] = useState<AlerteType>(null);
  const [error, setError] = useState('');

  const monGuichet = guichets.find(g =>
    user?.guichetId ? g.id === user.guichetId : g.caissierUid === user?.uid
  );

  const envoyer = async (type: AlerteType) => {
    if (!type || sending) return;
    setSending(type);
    setError('');
    try {
      const body =
        type === 'superviseur'
          ? {
              type: 'autre',
              severite: 'avertissement',
              titre: 'Assistance caissier',
              message: `Le caissier ${user ? `${user.prenom} ${user.nom}` : ''} (${monGuichet ? `Guichet ${monGuichet.numero}` : 'guichet inconnu'}) demande l'intervention d'un superviseur.`,
              ...(monGuichet ? { guichetId: monGuichet.id } : {}),
            }
          : {
              type: 'technique',
              severite: 'avertissement',
              titre: 'Problème technique guichet',
              message: `Problème technique signalé au ${monGuichet ? `Guichet ${monGuichet.numero}` : 'guichet'} par ${user ? `${user.prenom} ${user.nom}` : 'le caissier'}.`,
              ...(monGuichet ? { guichetId: monGuichet.id } : {}),
            };

      const res = await fetch('/api/alertes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Erreur lors de l\'envoi');
        return;
      }

      setSent(type);
      setTimeout(() => setSent(null), 5000);
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setSending(null);
    }
  };

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
          <Link href="/caissier/historique" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <History className="w-5 h-5" />
            Historique
          </Link>
          <Link href="/caissier/assistance" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <HelpCircle className="w-5 h-5 fill-current" />
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
          <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">Centre d&apos;assistance</h2>
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

        <div className="p-10 max-w-5xl mx-auto w-full">
          <div className="mb-12">
            <h3 className="text-4xl font-extrabold text-on-surface mb-3 tracking-tight font-headline">Besoin d&apos;aide ?</h3>
            <p className="text-secondary text-lg leading-relaxed">Contactez un superviseur ou consultez les ressources à votre disposition.</p>
          </div>

          {error && (
            <div className="mb-6 px-6 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Actions Rapides */}
            <div className="space-y-6">
              {/* Alerte Superviseur */}
              <button
                onClick={() => envoyer('superviseur')}
                disabled={!!sending}
                className="w-full bg-surface-container-lowest p-8 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex items-start gap-6 hover:-translate-y-1 transition-transform text-left group disabled:opacity-70 disabled:hover:translate-y-0"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${sent === 'superviseur' ? 'bg-emerald-50' : 'bg-primary-fixed'}`}>
                  {sending === 'superviseur' ? (
                    <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  ) : sent === 'superviseur' ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div>
                  <h4 className="font-headline font-extrabold text-xl text-on-surface mb-2">
                    {sent === 'superviseur' ? 'Alerte envoyée !' : 'Alerte Superviseur'}
                  </h4>
                  <p className="text-secondary text-sm leading-relaxed">
                    {sent === 'superviseur'
                      ? 'Le superviseur a été notifié. Il sera bientôt avec vous.'
                      : 'Signaler un problème complexe nécessitant l\'intervention immédiate d\'un responsable.'}
                  </p>
                </div>
              </button>

              {/* Appel Technique */}
              <button
                onClick={() => envoyer('technique')}
                disabled={!!sending}
                className="w-full bg-surface-container-lowest p-8 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex items-start gap-6 hover:-translate-y-1 transition-transform text-left group disabled:opacity-70 disabled:hover:translate-y-0"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${sent === 'technique' ? 'bg-emerald-50' : 'bg-secondary-container'}`}>
                  {sending === 'technique' ? (
                    <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  ) : sent === 'technique' ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  ) : (
                    <PhoneCall className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div>
                  <h4 className="font-headline font-extrabold text-xl text-on-surface mb-2">
                    {sent === 'technique' ? 'Signalement envoyé !' : 'Appel Technique'}
                  </h4>
                  <p className="text-secondary text-sm leading-relaxed">
                    {sent === 'technique'
                      ? 'Le problème technique a été signalé. Un technicien interviendra rapidement.'
                      : 'Problème matériel avec le guichet, l\'imprimante ou le système informatique.'}
                  </p>
                </div>
              </button>

              {/* Messagerie Interne (UI seulement) */}
              <button className="w-full bg-surface-container-lowest p-8 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex items-start gap-6 hover:-translate-y-1 transition-transform text-left group opacity-60 cursor-not-allowed">
                <div className="w-14 h-14 bg-surface-container text-secondary rounded-2xl flex items-center justify-center shrink-0">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-headline font-extrabold text-xl text-on-surface mb-2">Messagerie Interne</h4>
                  <p className="text-secondary text-sm leading-relaxed">Bientôt disponible — module de chat interne en cours de déploiement.</p>
                </div>
              </button>
            </div>

            {/* Ressources */}
            <div className="bg-surface-container-low p-8 rounded-[1.5rem] h-fit">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-surface-container-lowest text-secondary rounded-xl flex items-center justify-center shadow-sm">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-headline font-bold text-on-surface">Ressources Utiles</h3>
              </div>

              <div className="space-y-4">
                <a href="#" className="block p-4 bg-surface-container-lowest rounded-xl hover:bg-white transition-colors">
                  <p className="font-bold text-on-surface mb-1">Procédure de transfert de ticket</p>
                  <p className="text-xs text-secondary">Comment rediriger un client vers le bon service.</p>
                </a>
                <a href="#" className="block p-4 bg-surface-container-lowest rounded-xl hover:bg-white transition-colors">
                  <p className="font-bold text-on-surface mb-1">Gestion des clients prioritaires</p>
                  <p className="text-xs text-secondary">Règles d&apos;appel pour les femmes enceintes et PMR.</p>
                </a>
                <a href="#" className="block p-4 bg-surface-container-lowest rounded-xl hover:bg-white transition-colors">
                  <p className="font-bold text-on-surface mb-1">Redémarrage du terminal</p>
                  <p className="text-xs text-secondary">Étapes de dépannage de premier niveau.</p>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
