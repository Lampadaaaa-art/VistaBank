'use client';

import { useState, useMemo, useRef } from 'react';
import { LayoutDashboard, ListOrdered, MonitorSmartphone, FileText, Clock, Users, BarChart3, PieChart, BellRing, TrendingUp, CheckCircle2, AlertCircle, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useStats } from '@/hooks/useStats';
import { useTickets } from '@/hooks/useTickets';
import { useGuichets } from '@/hooks/useGuichets';
import { useAuth } from '@/hooks/useAuth';
import { AdminLogoutButton } from '@/components/admin-logout-button';

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  week: 'Cette Semaine',
  month: 'Ce Mois',
};

const CHART_COLORS = ['bg-primary', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500'];
const CHART_COLORS_LIGHT = ['bg-primary/10', 'bg-blue-50', 'bg-emerald-50', 'bg-orange-50', 'bg-purple-50'];
const CHART_TEXT = ['text-primary', 'text-blue-600', 'text-emerald-600', 'text-orange-600', 'text-purple-600'];

function getRange(period: Period): [Date, Date] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86_400_000);
  if (period === 'today') return [today, tomorrow];
  if (period === 'week') {
    const d = new Date(today);
    d.setDate(today.getDate() - ((today.getDay() || 7) - 1));
    return [d, tomorrow];
  }
  return [new Date(today.getFullYear(), today.getMonth(), 1), tomorrow];
}

function tsMs(ts: unknown): number {
  if (!ts) return 0;
  return new Date(ts as string).getTime();
}

export default function Rapports() {
  const [period, setPeriod] = useState<Period>('today');
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { stats } = useStats();
  const { tickets: allTickets } = useTickets({ statut: ['attente', 'en_cours', 'termine'] });
  const { guichets } = useGuichets();

  const [start, end] = useMemo(() => getRange(period), [period]);

  const filtered = useMemo(
    () => allTickets.filter(t => { const ms = tsMs(t.createdAt); return ms >= start.getTime() && ms < end.getTime(); }),
    [allTickets, start, end]
  );

  const termines = useMemo(() => filtered.filter(t => t.statut === 'termine'), [filtered]);
  const enAttente = useMemo(() => filtered.filter(t => t.statut === 'attente'), [filtered]);

  const tauxCompletion = filtered.length > 0 ? Math.round((termines.length / filtered.length) * 100) : 0;

  const serviceStats = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    termines.forEach(t => {
      map[t.serviceCode] = map[t.serviceCode] ?? { name: t.serviceName, count: 0 };
      map[t.serviceCode].count++;
    });
    const total = termines.length || 1;
    return Object.values(map)
      .map(d => ({ ...d, pct: Math.round(d.count / total * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [termines]);

  const guichetPerf = useMemo(() => {
    const map: Record<string, { nom: string; numero: number; count: number; tempsTotal: number }> = {};
    termines.forEach(t => {
      if (!t.guichetId) return;
      const g = guichets.find(g => g.id === t.guichetId);
      if (!g) return;
      map[t.guichetId] = map[t.guichetId] ?? { nom: g.nom, numero: g.numero, count: 0, tempsTotal: 0 };
      map[t.guichetId].count++;
      map[t.guichetId].tempsTotal += t.tempsService ?? 0;
    });
    return Object.values(map)
      .map(r => ({ ...r, tempsMoyen: r.count > 0 ? Math.round(r.tempsTotal / r.count / 60) : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [termines, guichets]);

  const maxGuichetCount = Math.max(...guichetPerf.map(g => g.count), 1);

  const affluence = useMemo(() => {
    const h = Array(10).fill(0);
    filtered.forEach(t => {
      const idx = new Date(tsMs(t.createdAt)).getHours() - 8;
      if (idx >= 0 && idx < 10) h[idx]++;
    });
    return h;
  }, [filtered]);

  const maxAffluence = Math.max(...affluence, 1);
  const peakHour = affluence.indexOf(Math.max(...affluence));
  const nomComplet = user ? `${user.prenom} ${user.nom}` : '';
  const initiales = user ? `${user.prenom[0]}${user.nom[0]}` : '';

  const handleDownloadPDF = async () => {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#f5f5f5' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.setProperties({ title: `Rapport Vista Gui — ${PERIOD_LABELS[period]}` });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -y, pageW, imgH);
        y += pageH;
      }
      pdf.save(`rapport-vistaGui-${period}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  };

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
          <Link href="/superviseur/alertes" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <BellRing className="w-5 h-5" />
            Alertes
          </Link>
          <Link href="/superviseur/rapports" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <FileText className="w-5 h-5 fill-current" />
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
          <div>
            <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">Rapports & Analyses</h2>
            <p className="text-secondary text-xs font-semibold mt-0.5">{PERIOD_LABELS[period]} · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="flex items-center gap-4 border-l border-on-surface/10 pl-6">
            <button
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'Export...' : 'Télécharger le rapport'}
            </button>
            <div className="flex flex-col items-end">
              <span className="font-bold text-sm text-on-surface">{nomComplet}</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Superviseur</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-sm">
              {initiales}
            </div>
          </div>
        </header>

        <div ref={reportRef} className="p-10 max-w-7xl mx-auto w-full">
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-surface-container-lowest p-1.5 rounded-full shadow-sm border border-on-surface/5 w-fit mb-8">
            {(['today', 'week', 'month'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-200 ${
                  period === p
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-[0_20px_50px_rgba(17,28,45,0.06)] border border-on-surface/5">
              <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Clients servis</p>
              <p className="text-4xl font-headline font-black text-on-surface">{termines.length}</p>
              <p className="text-xs text-secondary font-semibold mt-2">{filtered.length} total · {enAttente.length} en attente</p>
            </div>

            <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-[0_20px_50px_rgba(17,28,45,0.06)] border border-on-surface/5">
              <div className="w-11 h-11 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-5">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Attente moyenne</p>
              <p className="text-4xl font-headline font-black text-on-surface">
                {stats.tempsMoyenAttente > 0 ? `${stats.tempsMoyenAttente}m` : '—'}
              </p>
              <p className="text-xs text-secondary font-semibold mt-2">Traitement · {stats.tempsMoyenService > 0 ? `${stats.tempsMoyenService}m` : '—'}</p>
            </div>

            <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-[0_20px_50px_rgba(17,28,45,0.06)] border border-on-surface/5">
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Taux de complétion</p>
              <p className="text-4xl font-headline font-black text-on-surface">{tauxCompletion}%</p>
              <div className="mt-3 w-full bg-emerald-50 rounded-full h-1.5">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: `${tauxCompletion}%` }} />
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-[0_20px_50px_rgba(17,28,45,0.06)] border border-on-surface/5">
              <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-5">
                <MonitorSmartphone className="w-5 h-5" />
              </div>
              <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Guichets actifs</p>
              <p className="text-4xl font-headline font-black text-on-surface">{stats.guichetsOuverts}</p>
              <p className="text-xs text-secondary font-semibold mt-2">{guichets.length} guichets configurés</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Affluence par Heure */}
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-8 shadow-[0_20px_50px_rgba(17,28,45,0.06)] border border-on-surface/5">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="font-headline font-extrabold text-xl text-on-surface">Affluence par heure</h3>
                  {maxAffluence > 0 && (
                    <p className="text-xs text-secondary font-semibold mt-1">
                      Pic à {8 + peakHour}h00 · {Math.max(...affluence)} clients
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 bg-surface-container rounded-xl flex items-center justify-center text-secondary">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div className="h-44 flex items-end justify-between gap-1.5">
                {affluence.map((count, i) => (
                  <div key={i} className="w-full relative group h-full flex items-end">
                    <div className="w-full bg-primary/8 rounded-t-lg relative h-full">
                      <div
                        className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${i === peakHour ? 'bg-primary' : 'bg-primary/40 group-hover:bg-primary/70'}`}
                        style={{ height: `${Math.round((count / maxAffluence) * 100)}%` }}
                      />
                    </div>
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {8 + i}h · {count} client{count !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-[11px] font-bold text-secondary uppercase tracking-widest">
                <span>08h</span>
                <span>12h</span>
                <span>17h</span>
              </div>
            </div>

            {/* Répartition par Service */}
            <div className="bg-surface-container-lowest rounded-[1.5rem] p-8 shadow-[0_20px_50px_rgba(17,28,45,0.06)] border border-on-surface/5">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-headline font-extrabold text-xl text-on-surface">Répartition par service</h3>
                  <p className="text-xs text-secondary font-semibold mt-1">{serviceStats.length} services actifs</p>
                </div>
                <div className="w-10 h-10 bg-surface-container rounded-xl flex items-center justify-center text-secondary">
                  <PieChart className="w-5 h-5" />
                </div>
              </div>
              {serviceStats.length > 0 ? (
                <div className="space-y-5">
                  {serviceStats.map((service, i) => (
                    <div key={service.name}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${CHART_COLORS[i % CHART_COLORS.length]}`} />
                          <span className="font-bold text-sm text-on-surface">{service.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CHART_COLORS_LIGHT[i % CHART_COLORS_LIGHT.length]} ${CHART_TEXT[i % CHART_TEXT.length]}`}>{service.count}</span>
                          <span className="font-headline font-black text-sm text-on-surface w-9 text-right">{service.pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-surface-container-low rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${CHART_COLORS[i % CHART_COLORS.length]}`}
                          style={{ width: `${service.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-secondary">
                  <AlertCircle className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm font-semibold">Aucune donnée pour cette période</p>
                </div>
              )}
            </div>
          </div>

          {/* Performances des Guichets */}
          <div className="bg-surface-container-lowest rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] border border-on-surface/5 overflow-hidden">
            <div className="p-8 border-b border-on-surface/5 flex justify-between items-center">
              <div>
                <h3 className="font-headline font-extrabold text-xl text-on-surface">Performances des guichets</h3>
                <p className="text-xs text-secondary font-semibold mt-1">{guichetPerf.length} guichet{guichetPerf.length !== 1 ? 's' : ''} avec activité</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-secondary bg-surface-container-low px-3 py-1.5 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                {PERIOD_LABELS[period]}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/60 border-b border-on-surface/5">
                    <th className="px-8 py-4 text-xs font-extrabold text-secondary uppercase tracking-widest">Guichet</th>
                    <th className="px-8 py-4 text-xs font-extrabold text-secondary uppercase tracking-widest">Volume</th>
                    <th className="px-8 py-4 text-xs font-extrabold text-secondary uppercase tracking-widest text-center">Clients servis</th>
                    <th className="px-8 py-4 text-xs font-extrabold text-secondary uppercase tracking-widest text-center">Temps moyen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {guichetPerf.length > 0 ? guichetPerf.map((row, i) => (
                    <tr key={row.nom} className="hover:bg-surface-container-low/40 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-primary/10 text-primary' : 'bg-surface-container text-secondary'}`}>
                            {i + 1}
                          </span>
                          <span className="font-headline font-black text-base text-on-surface">{row.nom}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 w-48">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-surface-container-low rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${i === 0 ? 'bg-primary' : 'bg-primary/40'}`}
                              style={{ width: `${Math.round((row.count / maxGuichetCount) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="font-headline font-black text-on-surface">{row.count}</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`font-bold text-sm px-3 py-1 rounded-full ${row.tempsMoyen > 0 && row.tempsMoyen <= 5 ? 'bg-emerald-50 text-emerald-600' : row.tempsMoyen > 10 ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                          {row.tempsMoyen > 0 ? `${row.tempsMoyen} min` : '—'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-14 text-center">
                        <div className="flex flex-col items-center gap-2 text-secondary">
                          <AlertCircle className="w-8 h-8 opacity-30" />
                          <p className="text-sm font-semibold">Aucune donnée pour cette période</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
