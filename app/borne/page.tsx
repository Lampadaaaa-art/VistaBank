'use client';

import { useState, useEffect } from 'react';
import {
  Banknote, CreditCard, UserPlus, ArrowRightLeft, Smartphone, Headset,
  Home, Printer, Landmark, Star, Baby, HeartPulse, ShieldAlert,
  User, ArrowLeft, Ticket, Loader2, Building2, LogOut,
  Globe, ShieldCheck, CircleHelp, ArrowRight, type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Service } from '@/lib/types';

const CODE_ICONS: Record<string, LucideIcon> = {
  A: Banknote,
  B: CreditCard,
  C: UserPlus,
  D: Smartphone,
  E: Headset,
  F: Landmark,
  G: ArrowRightLeft,
};

type SelectedService = { code: string; name: string };
type TicketData = { number: string; priority: string; serviceName: string };

const PRIORITY_MAP: Record<string, string> = {
  Standard: 'standard',
  VIP: 'vip',
  'Femme Enceinte': 'enceinte',
  'Personne Âgée': 'age',
  'Handicap / Urgence': 'handicap',
};

function useTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function SmallCard({ service, onClick }: { service: Service; onClick: () => void }) {
  const Icon = CODE_ICONS[service.code] ?? Building2;
  return (
    <button
      onClick={onClick}
      className="col-span-4 row-span-1 kiosk-btn bg-white rounded-3xl p-6 flex items-center gap-6 shadow-sm border border-slate-200 hover:border-primary hover:shadow-md group transition-all"
    >
      <div className="w-16 h-16 bg-primary-fixed flex items-center justify-center rounded-2xl group-hover:bg-primary transition-colors shrink-0">
        <Icon className="text-primary w-8 h-8 group-hover:text-white transition-colors" />
      </div>
      <div className="text-left">
        <span className="block text-xs font-bold text-primary tracking-widest mb-1">{service.code}</span>
        <span className="block text-xl font-headline font-extrabold text-on-surface leading-tight">{service.nom}</span>
      </div>
    </button>
  );
}

export default function BorneClient() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<SelectedService | null>(null);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const time = useTime();
  const { user } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    const fetchServices = () => {
      fetch('/api/public/services')
        .then((r) => {
          if (!r.ok) return r.json().then((d: { error?: string }) => { throw new Error(d.error ?? `HTTP ${r.status}`); });
          return r.json();
        })
        .then((data: Service[]) => {
          if (cancelled) return;
          setServices(Array.isArray(data) ? data : []);
          setServicesLoading(false);
          setServicesError(null);
        })
        .catch((e: Error) => {
          if (cancelled) return;
          setServicesError(e.message);
          setServicesLoading(false);
        });
    };
    fetchServices();
    const interval = setInterval(fetchServices, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const timeStr = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleServiceClick = (code: string, name: string) => setSelectedService({ code, name });

  const handlePriorityClick = async (priority: string) => {
    if (!selectedService || loading) return;
    setLoading(true);
    setTicketError(null);
    try {
      const res = await fetch('/api/public/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceCode: selectedService.code,
          serviceName: selectedService.name,
          priorite: PRIORITY_MAP[priority] ?? 'standard',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Erreur serveur (${res.status})`);
      }
      const data = await res.json() as { numero: string };
      setTicket({ number: data.numero, priority, serviceName: selectedService.name });
    } catch (e) {
      setTicketError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const [pdfLoading, setPdfLoading] = useState(false);

  const reset = () => { setTicket(null); setSelectedService(null); setTicketError(null); };

  const handleDownloadTicket = async () => {
    const el = document.getElementById('ticket-card');
    if (!el || pdfLoading || !ticket) return;
    setPdfLoading(true);
    try {
      const [{ toCanvas }, { jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ]);
      const canvas = await toCanvas(el, { pixelRatio: 3, backgroundColor: '#ffffff' });
      const widthMm = 80;
      const heightMm = (canvas.height / canvas.width) * widthMm;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [widthMm, heightMm] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, widthMm, heightMm);
      pdf.save(`ticket-${ticket.number}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      if (user?.uid) {
        await supabase.from('presence').upsert({ user_id: user.uid, en_ligne: false, depuis: new Date().toISOString() });
      }
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  /* ── Ticket view ─────────────────────────────────────────────── */
  if (ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-12 relative overflow-hidden bg-[#fdfafb]">
    <div className="fixed inset-0 z-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(230, 0, 66, 0.03) 20px, rgba(230, 0, 66, 0.03) 40px)' }}></div>
        <div id="ticket-card" className="bg-white w-[340px] rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] flex flex-col relative z-10 animate-in zoom-in duration-300">
          <div className="p-8 pb-6 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 text-primary font-bold text-base mb-8">
              <Ticket className="w-5 h-5 fill-current" /> Vista Gui
            </div>
            <p className="text-slate-400 text-[9px] uppercase tracking-[0.15em] font-semibold mb-2">Numéro de passage</p>
            <div className="text-[64px] font-headline font-black text-slate-900 leading-none mb-8 tracking-tight">{ticket.number}</div>
            <div className="w-full h-px bg-slate-100 mb-6"></div>
            <p className="text-slate-400 text-[11px] mb-1">Service demandé</p>
            <p className="text-slate-900 font-bold text-base">{ticket.serviceName}</p>
            {ticket.priority !== 'Standard' && <p className="text-primary font-bold text-sm mt-1">{ticket.priority}</p>}
          </div>
          <div className="relative w-full h-8 flex items-center justify-center overflow-hidden">
            <div className="absolute left-[-16px] w-8 h-8 bg-[#fdfafb] rounded-full shadow-inner"></div>
            <div className="w-full border-t-2 border-dashed border-slate-100 mx-4"></div>
            <div className="absolute right-[-16px] w-8 h-8 bg-[#fdfafb] rounded-full shadow-inner"></div>
          </div>
          <div className="p-8 pt-6 flex flex-col items-center">
            <div className="flex items-end justify-center gap-1.5 h-10 mb-2 opacity-20">
              {[['w-1.5','h-full'],['w-1','h-6'],['w-2','h-full'],['w-1','h-full'],['w-1.5','h-8'],['w-1','h-full'],['w-3','h-full'],['w-1','h-6'],['w-2','h-full'],['w-1','h-8'],['w-1.5','h-full']].map(([w, h], i) => (
                <div key={i} className={`${w} ${h} bg-slate-800`}></div>
              ))}
            </div>
            <p className="text-[7px] text-slate-400 tracking-[0.2em]">01234567890123456789</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 w-[340px] relative z-10 animate-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
          <button onClick={handleDownloadTicket} disabled={pdfLoading} className="w-full py-4 bg-primary text-white rounded-full font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
            {pdfLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
            {pdfLoading ? 'Génération…' : 'Télécharger le ticket'}
          </button>
          <button onClick={reset} className="w-full py-4 bg-white/80 backdrop-blur-md text-slate-600 rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:bg-white transition-all shadow-sm border border-white/20 active:scale-[0.98]">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </div>
      </div>
    );
  }

  /* ── Priority selection view ─────────────────────────────────── */
  if (selectedService) {
    return (
      <div className="min-h-screen bg-white flex flex-col relative">
        <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E60042 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        <header className="h-28 flex items-center justify-between px-16 bg-white border-b border-surface-container relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Home className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="font-headline font-extrabold text-2xl tracking-tight text-on-surface">Banque Vista Gui</h1>
              <p className="text-primary font-bold tracking-[0.2em] text-[10px] uppercase">L&apos;Excellence Institutionnelle</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-2xl font-headline font-extrabold text-on-surface">{timeStr}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider capitalize">{dateStr}</p>
            </div>
            <button onClick={handleLogout} title="Déconnexion" className="w-10 h-10 flex items-center justify-center rounded-full text-slate-300 hover:text-primary hover:bg-slate-50 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
          <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-500">
            <button onClick={() => setSelectedService(null)} className="flex items-center gap-2 text-slate-500 hover:text-primary mb-8 font-bold uppercase tracking-widest text-sm transition-colors">
              <ArrowLeft className="w-5 h-5" /> Retour aux services
            </button>
            <div className="text-center mb-12">
              <h2 className="font-headline font-black text-5xl text-on-surface mb-4">Avez-vous une priorité ?</h2>
              <p className="text-xl text-slate-500 font-medium">Service sélectionné : <span className="text-primary font-bold">{selectedService.name}</span></p>
            </div>
            {ticketError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">{ticketError}</div>
            )}
            <div className="flex flex-col gap-6">
              <button onClick={() => handlePriorityClick('Standard')} disabled={loading} className="w-full bg-white rounded-3xl p-8 flex items-center justify-center gap-4 shadow-sm border border-slate-200 hover:border-primary hover:shadow-md group transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <User className="text-slate-400 w-8 h-8 group-hover:text-primary transition-colors" />}
                <span className="text-2xl font-headline font-extrabold text-on-surface">Non, je suis un client standard</span>
              </button>
              <div className="grid grid-cols-2 gap-6">
                <button onClick={() => handlePriorityClick('VIP')} disabled={loading} className="bg-white rounded-3xl p-6 flex items-center gap-6 shadow-sm border border-slate-200 hover:border-purple-500 hover:shadow-md group transition-all disabled:opacity-60">
                  <div className="w-16 h-16 bg-purple-50 flex items-center justify-center rounded-2xl group-hover:bg-purple-500 transition-colors">
                    <Star className="text-purple-500 w-8 h-8 group-hover:text-white" />
                  </div>
                  <span className="text-xl font-headline font-extrabold text-on-surface">Client VIP</span>
                </button>
                <button onClick={() => handlePriorityClick('Femme Enceinte')} disabled={loading} className="bg-white rounded-3xl p-6 flex items-center gap-6 shadow-sm border border-slate-200 hover:border-pink-500 hover:shadow-md group transition-all disabled:opacity-60">
                  <div className="w-16 h-16 bg-pink-50 flex items-center justify-center rounded-2xl group-hover:bg-pink-500 transition-colors">
                    <Baby className="text-pink-500 w-8 h-8 group-hover:text-white" />
                  </div>
                  <span className="text-xl font-headline font-extrabold text-on-surface">Femme Enceinte</span>
                </button>
                <button onClick={() => handlePriorityClick('Personne Âgée')} disabled={loading} className="bg-white rounded-3xl p-6 flex items-center gap-6 shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md group transition-all disabled:opacity-60">
                  <div className="w-16 h-16 bg-blue-50 flex items-center justify-center rounded-2xl group-hover:bg-blue-500 transition-colors">
                    <HeartPulse className="text-blue-500 w-8 h-8 group-hover:text-white" />
                  </div>
                  <span className="text-xl font-headline font-extrabold text-on-surface">Personne Âgée</span>
                </button>
                <button onClick={() => handlePriorityClick('Handicap / Urgence')} disabled={loading} className="bg-white rounded-3xl p-6 flex items-center gap-6 shadow-sm border border-slate-200 hover:border-primary hover:shadow-md group transition-all disabled:opacity-60">
                  <div className="w-16 h-16 bg-primary-fixed flex items-center justify-center rounded-2xl group-hover:bg-primary transition-colors">
                    <ShieldAlert className="text-primary w-8 h-8 group-hover:text-white" />
                  </div>
                  <span className="text-xl font-headline font-extrabold text-on-surface">Handicap / Urgence</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ── Service selection view ──────────────────────────────────── */
  // Sort by ordre; layout: [0]=small, [1]=small, [2]=featured (col-span-4 row-span-2),
  // [3]=wide (col-span-8), [4+]=small cards appended at the bottom
  const sorted = [...services].sort((a, b) => a.ordre - b.ordre);
  const s0 = sorted[0];
  const s1 = sorted[1];
  const featured = sorted[2];
  const wide = sorted[3];
  const rest = sorted.slice(4);

  return (
    <div className="min-h-screen bg-white flex flex-col relative select-none">
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E60042 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      {/* Header */}
      <header className="h-28 flex items-center justify-between px-16 bg-white border-b border-surface-container relative z-10">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Home className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="font-headline font-extrabold text-2xl tracking-tight text-on-surface">Banque Vista Gui</h1>
            <p className="text-primary font-bold tracking-[0.2em] text-[10px] uppercase">L&apos;Excellence Institutionnelle</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-2xl font-headline font-extrabold text-on-surface">{timeStr}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider capitalize">{dateStr}</p>
          </div>
          <button onClick={handleLogout} title="Déconnexion" className="w-10 h-10 flex items-center justify-center rounded-full text-slate-300 hover:text-primary hover:bg-slate-50 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="text-center mb-16">
            <h2 className="font-headline font-black text-5xl text-on-surface mb-4">Bienvenue</h2>
            <p className="text-xl text-slate-500 font-medium">Veuillez choisir un service pour obtenir votre numéro de passage</p>
          </div>

          {servicesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
          ) : servicesError ? (
            <div className="text-center py-20">
              <p className="text-red-500 font-bold text-lg mb-2">Erreur de chargement</p>
              <p className="text-slate-400 font-mono text-sm">{servicesError}</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-medium">
              Aucun service disponible pour le moment.<br />
              <span className="text-xs mt-2 block">Ajoutez des services depuis le panneau Admin → Services.</span>
            </div>
          ) : (
            /* grid-cols-12: chaque colonne = 1/12.
               small = col-span-4 (1/3), wide = col-span-8 (2/3), featured = col-span-4 row-span-2.
               Ordre DOM : s0, s1, featured, wide, ...rest  → auto-placement CSS positionne correctement. */
            <div className="grid grid-cols-12 gap-6 auto-rows-[160px]">

              {/* Petite carte 1 — col 1-4, ligne 1 */}
              {s0 && <SmallCard service={s0} onClick={() => handleServiceClick(s0.code, s0.nom)} />}

              {/* Petite carte 2 — col 5-8, ligne 1 */}
              {s1 && <SmallCard service={s1} onClick={() => handleServiceClick(s1.code, s1.nom)} />}

              {/* Carte vedette — col 9-12, lignes 1-2 (rouge, grande) */}
              {featured && (() => {
                const Icon = CODE_ICONS[featured.code] ?? Building2;
                return (
                  <button
                    onClick={() => handleServiceClick(featured.code, featured.nom)}
                    className="col-span-4 row-span-2 bg-primary rounded-3xl p-10 flex flex-col justify-between shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-[0.98]"
                  >
                    <div className="w-20 h-20 bg-white/20 flex items-center justify-center rounded-2xl backdrop-blur-md">
                      <Icon className="text-white w-10 h-10" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-white/70 tracking-widest mb-2">{featured.code}</span>
                      <span className="block text-3xl font-headline font-extrabold text-white leading-tight">{featured.nom}</span>
                      <p className="mt-4 text-white/80 text-sm font-medium">Rejoignez-nous aujourd&apos;hui</p>
                    </div>
                  </button>
                );
              })()}

              {/* Carte large — col 1-8, ligne 2 */}
              {wide && (() => {
                const Icon = CODE_ICONS[wide.code] ?? Building2;
                return (
                  <button
                    onClick={() => handleServiceClick(wide.code, wide.nom)}
                    className="col-span-8 row-span-1 bg-slate-50 rounded-3xl p-6 flex items-center justify-between shadow-sm border border-slate-200 hover:border-primary group transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white flex items-center justify-center rounded-2xl shadow-sm group-hover:bg-primary transition-colors">
                        <Icon className="text-primary w-8 h-8 group-hover:text-white transition-colors" />
                      </div>
                      <div className="text-left">
                        <span className="block text-xs font-bold text-primary tracking-widest mb-1">{wide.code}</span>
                        <span className="block text-2xl font-headline font-extrabold text-on-surface">{wide.nom}</span>
                      </div>
                    </div>
                    <ArrowRight className="text-primary w-8 h-8 mr-4 group-hover:translate-x-2 transition-transform" />
                  </button>
                );
              })()}

              {/* Cartes supplémentaires — ligne 3+, col-span-4 chacune */}
              {rest.map(service => (
                <SmallCard key={service.code} service={service} onClick={() => handleServiceClick(service.code, service.nom)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-24 bg-white border-t border-surface-container px-16 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3 text-slate-500">
            <Globe className="w-6 h-6 text-primary" />
            <span className="font-bold text-sm uppercase tracking-wider">Français</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span className="font-bold text-sm uppercase tracking-wider">Session Sécurisée</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-on-surface font-bold text-sm uppercase tracking-wider">
          <CircleHelp className="w-5 h-5 text-primary" />
          <span>Besoin d&apos;aide ? Appelez un conseiller</span>
        </div>
      </footer>
    </div>
  );
}
