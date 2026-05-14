"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Landmark, Megaphone, Globe, ArrowRight, Clock, History, Maximize, Minimize } from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import { useGuichets } from '@/hooks/useGuichets';
import type { Ticket } from '@/lib/types';
const M = 'Manrope, sans-serif';

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  return `Il y a ${Math.floor(minutes / 60)}h`;
}

function sortByRecent(tickets: Ticket[], field: keyof Ticket): Ticket[] {
  return [...tickets].sort((a, b) => {
    const ta = a[field] ? new Date(a[field] as string).getTime() : 0;
    const tb = b[field] ? new Date(b[field] as string).getTime() : 0;
    return tb - ta;
  });
}

export default function TvDisplay() {
  const [time, setTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const { tickets: enCoursTickets } = useTickets({ statut: "en_cours", publicMode: true });
  const { tickets: attenteTickets } = useTickets({ statut: "attente", publicMode: true });
  const { tickets: terminesTickets } = useTickets({ statut: "termine", dateFrom: todayStart, publicMode: true });
  const { guichets } = useGuichets(true);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const currentTicket = useMemo(() => {
    if (enCoursTickets.length === 0) return null;
    return [...enCoursTickets].sort(
      (a, b) =>
        new Date(b.appelleAt ?? b.createdAt).getTime() -
        new Date(a.appelleAt ?? a.createdAt).getTime()
    )[0];
  }, [enCoursTickets]);

  const currentGuichet = useMemo(
    () => guichets.find(g => g.id === currentTicket?.guichetId),
    [guichets, currentTicket]
  );

  const lastAnnouncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentTicket) return;
    if (currentTicket.id === lastAnnouncedRef.current) return;
    lastAnnouncedRef.current = currentTicket.id;
    const guichetNum = currentGuichet?.numero ?? '';
    const text = `Ticket ${currentTicket.numero}. Veuillez vous rendre au guichet ${guichetNum}.`;

    const bestVoice = voicesRef.current.find(v => v.lang === 'fr-FR' && v.name.toLowerCase().includes('google'))
      ?? voicesRef.current.find(v => v.lang === 'fr-FR')
      ?? null;

    const makeUtterance = () => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      u.rate = 0.85;
      u.pitch = 1.0;
      if (bestVoice) u.voice = bestVoice;
      return u;
    };

    window.speechSynthesis.cancel();
    const first = makeUtterance();
    first.onend = () => setTimeout(() => window.speechSynthesis.speak(makeUtterance()), 1200);
    window.speechSynthesis.speak(first);
  }, [currentTicket?.id, currentGuichet?.numero]);
  const nextTickets = attenteTickets.slice(0, 4);
  const history = useMemo(
    () => sortByRecent(terminesTickets, 'termineAt').slice(0, 4),
    [terminesTickets]
  );

  const timeStr = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="bg-surface text-on-surface h-screen flex flex-col overflow-hidden antialiased">
      <style dangerouslySetInnerHTML={{__html: `
        .ticker-wrap { overflow: hidden; width: 100%; }
        .ticker { display: inline-block; white-space: nowrap; animation: ticker 30s linear infinite; }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
      `}} />

      {/* Header */}
      <header className="bg-white flex justify-between items-center w-full px-12 h-24 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary flex items-center justify-center rounded-xl">
            <Landmark className="text-white w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black tracking-tighter text-primary" style={{fontFamily: M}}>Banque Vista Gui</span>
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Gestion de File d&apos;Attente</span>
          </div>
        </div>
        <div className="flex items-center gap-12">
          <div className="flex flex-col items-end">
            <span className="text-4xl font-extrabold text-on-surface tracking-tight" style={{fontFamily: M}}>{timeStr}</span>
            <span className="text-sm font-medium text-slate-500">{dateStr}</span>
          </div>
          <div className="w-14 h-14 bg-surface-container rounded-full flex items-center justify-center text-primary">
            <Globe className="w-7 h-7" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden p-8 gap-8 min-h-0">

        {/* Colonne gauche : hero + prochains billets */}
        <div className="flex-1 flex flex-col gap-8 min-h-0">

          {/* Hero */}
          <section
            className="flex-1 rounded-xl flex flex-col items-center justify-center p-10 text-white min-h-0"
            style={{
              background: 'linear-gradient(135deg, #b80033 0%, #e60042 100%)',
              boxShadow: '0 20px 50px rgba(17,28,45,0.08)',
            }}
          >
            <p className="font-medium mb-4 tracking-widest uppercase" style={{fontSize: '1.25rem', opacity: 0.9, fontFamily: 'Inter, sans-serif'}}>
              Ticket Appelé
            </p>

            <h1
              className="font-extrabold tracking-tighter mb-7 drop-shadow-xl text-white"
              style={{ fontSize: 'clamp(3rem, 11vh, 7rem)', lineHeight: 1, fontFamily: M }}
            >
              {currentTicket ? currentTicket.numero : '—'}
            </h1>

            {currentTicket && (
              <div
                className="inline-flex items-center gap-4 px-8 py-4 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <ArrowRight className="w-9 h-9 shrink-0" />
                <span className="font-bold text-white" style={{fontSize: '2.5rem', fontFamily: M}}>
                  {currentGuichet ? `Guichet ${currentGuichet.numero}` : 'Guichet —'}
                </span>
              </div>
            )}

            {!currentTicket && (
              <p className="text-white/60 text-xl font-medium">Aucun ticket en cours</p>
            )}
          </section>

          {/* Prochains Billets */}
          <section className="bg-white rounded-xl p-8 shrink-0" style={{boxShadow: '0 20px 50px rgba(17,28,45,0.06)'}}>
            <h2 className="font-bold mb-6 text-on-surface flex items-center gap-3" style={{fontSize: '1.6rem', fontFamily: M}}>
              <Clock className="text-primary w-6 h-6 shrink-0" />
              Prochains Billets
              {attenteTickets.length > 0 && (
                <span className="ml-auto text-sm font-bold text-secondary" style={{fontFamily: 'Inter, sans-serif'}}>
                  {attenteTickets.length} en attente
                </span>
              )}
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {nextTickets.length > 0 ? nextTickets.map((ticket) => (
                <div key={ticket.id} className="bg-surface-container-low p-4 rounded-lg flex items-center justify-center" style={{border: '1px solid rgba(231,188,189,0.15)'}}>
                  <span className="text-2xl font-bold text-on-surface" style={{fontFamily: M}}>{ticket.numero}</span>
                </div>
              )) : (
                <div className="col-span-4 text-center text-secondary font-medium py-4">
                  Aucun ticket en attente
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Colonne droite : Derniers Appels */}
        <aside className="flex flex-col min-h-0 shrink-0" style={{width: '33%'}}>
          <section className="flex-1 bg-white rounded-xl p-8 flex flex-col overflow-hidden min-h-0" style={{boxShadow: '0 20px 50px rgba(17,28,45,0.06)'}}>
            <h2 className="font-bold text-on-surface flex items-center gap-3 mb-6 pb-6 shrink-0" style={{fontSize: '1.6rem', fontFamily: M, borderBottom: '1px solid #d9e3fb'}}>
              <History className="text-primary w-6 h-6 shrink-0" />
              Derniers Appels
            </h2>

            <div className="flex-1 flex flex-col gap-5 min-h-0 overflow-hidden">
              {history.length > 0 ? history.map((item, i) => {
                const guichet = guichets.find(g => g.id === item.guichetId);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-surface rounded-xl shadow-sm flex-1 px-6"
                    style={{ opacity: [1, 0.9, 0.8, 0.7][i], border: '1px solid rgba(231,188,189,0.15)' }}
                  >
                    <div className="flex flex-col">
                      <span className="font-extrabold text-on-surface" style={{fontSize: '2rem', fontFamily: M, lineHeight: 1.2}}>
                        {item.numero}
                      </span>
                      <span className="text-sm text-secondary mt-1">
                        {item.appelleAt ? timeAgo(item.appelleAt) : '—'}
                      </span>
                    </div>
                    <span className="font-bold text-primary" style={{fontSize: '1.1rem', fontFamily: M}}>
                      {guichet ? `Guichet ${guichet.numero}` : '—'}
                    </span>
                  </div>
                );
              }) : (
                <div className="flex-1 flex items-center justify-center text-secondary font-medium">
                  Aucun appel récent
                </div>
              )}
            </div>
          </section>
        </aside>
      </main>

      {/* Bouton plein écran discret */}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        className="fixed bottom-4 right-4 z-50 p-2.5 rounded-full bg-white/10 text-white opacity-20 hover:opacity-80 transition-opacity duration-300"
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>

      {/* Footer ticker */}
      <footer className="bg-primary h-16 flex items-center overflow-hidden shrink-0">
        <div className="bg-primary-container px-8 h-full flex items-center z-10 shadow-lg shrink-0">
          <span className="text-white font-black uppercase tracking-widest flex items-center gap-2 text-sm">
            <Megaphone className="w-5 h-5 shrink-0" />
            FLASH INFO
          </span>
        </div>
        <div className="ticker-wrap flex-1 flex items-center overflow-hidden">
          <div className="ticker text-white font-medium" style={{fontSize: '1.1rem'}}>
            Bienvenue à la Banque Vista Gui. Nous sommes ravis de vous accueillir. Pour votre sécurité, veuillez garder vos effets personnels à portée de main. Notre équipe est à votre disposition pour toute assistance. Profitez de nos services de banque en ligne disponibles 24h/24 et 7j/7. Vista Gui, votre partenaire de confiance.
          </div>
        </div>
        <div className="px-8 h-full flex items-center bg-primary z-10 shrink-0">
          <span className="font-bold" style={{color: 'rgba(255,255,255,0.6)'}}>VISTA GUI</span>
        </div>
      </footer>
    </div>
  );
}
