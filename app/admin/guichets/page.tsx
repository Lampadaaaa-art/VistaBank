'use client';

import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Users, Monitor, Settings, Plus, UserX, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useGuichets } from '@/hooks/useGuichets';
import { useServices } from '@/hooks/useServices';
import { useAuth } from '@/hooks/useAuth';
import type { Guichet, User as AppUser, GuichetStatut } from '@/lib/types';
import { AdminLogoutButton } from '@/components/admin-logout-button';

const STATUT_BADGE: Record<GuichetStatut, { label: string; cls: string }> = {
  ouvert:     { label: 'Ouvert',     cls: 'bg-emerald-50 text-emerald-600' },
  pause:      { label: 'Pause',      cls: 'bg-orange-50 text-orange-600'   },
  ferme:      { label: 'Fermé',      cls: 'bg-slate-200 text-slate-600'    },
  hors_ligne: { label: 'Hors ligne', cls: 'bg-slate-200 text-slate-600'    },
};

interface GuichetForm {
  numero: string;
  nom: string;
  serviceCode: string;
  caissierUid: string;
  statut: GuichetStatut;
}

const FORM_INIT: GuichetForm = { numero: '', nom: '', serviceCode: '', caissierUid: '', statut: 'ferme' };

export default function AdminGuichets() {
  const { user: authUser } = useAuth();
  const { guichets, loading, refresh } = useGuichets();
  const { services } = useServices(true);

  const [caissiers, setCaissiers] = useState<AppUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Guichet | null>(null);
  const [form, setForm] = useState<GuichetForm>(FORM_INIT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const fetchCaissiers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data: AppUser[] = await res.json();
        setCaissiers(data.filter(u => u.role === 'caissier'));
      }
    } catch { /* ignore — user may not be authenticated yet */ }
  }, []);

  useEffect(() => { fetchCaissiers(); }, [fetchCaissiers]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(FORM_INIT);
    setError('');
    setConfirmDelete(false);
    fetchCaissiers();
    setIsModalOpen(true);
  };

  const openEdit = (g: Guichet) => {
    setEditTarget(g);
    setConfirmDelete(false);
    fetchCaissiers();
    setForm({
      numero: String(g.numero),
      nom: g.nom,
      serviceCode: g.serviceCode,
      caissierUid: g.caissierUid ?? '',
      statut: g.statut,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!editTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/guichets/${editTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        let msg = 'Erreur lors de la suppression';
        try { const d = await res.json(); msg = d.error ?? msg; } catch { /* non-JSON */ }
        setError(msg);
        setConfirmDelete(false);
        return;
      }
      setIsModalOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    setError('');
    if (!form.numero || !form.nom || !form.serviceCode) {
      setError('Numéro, nom et service sont obligatoires.');
      return;
    }
    const numeroInt = parseInt(form.numero, 10);
    const dupExists = guichets.some(
      g => g.numero === numeroInt && g.id !== editTarget?.id
    );
    if (dupExists) {
      setError(`Le guichet numéro ${numeroInt} existe déjà.`);
      return;
    }
    setSaving(true);
    try {
      const body = {
        numero: parseInt(form.numero, 10),
        nom: form.nom,
        serviceCode: form.serviceCode,
        statut: form.statut,
        caissierUid: form.caissierUid || null,
      };

      let res: Response;
      if (editTarget) {
        res = await fetch(`/api/guichets/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/guichets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        let msg = 'Erreur lors de la sauvegarde';
        try { const d = await res.json(); msg = d.error ?? msg; } catch { /* non-JSON */ }
        setError(msg);
        return;
      }
      setIsModalOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const ouverts = guichets.filter(g => g.statut === 'ouvert').length;
  const pauses  = guichets.filter(g => g.statut === 'pause').length;
  const fermes  = guichets.filter(g => g.statut === 'ferme' || g.statut === 'hors_ligne').length;
  const nomComplet = authUser ? `${authUser.prenom} ${authUser.nom}` : 'Chargement…';

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <aside className="h-screen w-72 left-0 top-0 fixed bg-surface-container-low shadow-[0_20px_50px_rgba(17,28,45,0.06)] flex flex-col py-8 z-20">
        <div className="px-6 mb-12">
          <h1 className="text-xl font-black text-on-surface font-headline">Vista Gui Admin</h1>
          <p className="text-xs font-semibold tracking-wide text-primary-container/70 uppercase mt-1">Sovereign Authority</p>
        </div>
        <nav className="flex-1">
          <Link href="/admin" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <LayoutDashboard className="w-5 h-5" />
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
          <Link href="/admin/guichets" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <Monitor className="w-5 h-5 fill-current" />
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

      <main className="ml-72 min-h-screen flex flex-col relative">
        <header className="flex justify-between items-center w-full px-8 h-24 bg-surface border-b border-on-surface/5 sticky top-0 z-40">
          <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">Gestion des Guichets</h2>
          <div className="flex items-center gap-4 border-l border-on-surface/10 pl-6">
            <div className="flex flex-col items-end">
              <span className="font-bold text-sm text-on-surface">{nomComplet}</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Administrateur</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-sm">
              {authUser ? `${authUser.prenom[0]}${authUser.nom[0]}` : '…'}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto w-full">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
              <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-2">Total Guichets</p>
              <p className="text-4xl font-headline font-black text-on-surface">{String(guichets.length).padStart(2, '0')}</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
              <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-2">Ouverts</p>
              <p className="text-4xl font-headline font-black text-on-surface">{String(ouverts).padStart(2, '0')}</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-400"></div>
              <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-2">En Pause</p>
              <p className="text-4xl font-headline font-black text-on-surface">{String(pauses).padStart(2, '0')}</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-300"></div>
              <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-2">Fermés</p>
              <p className="text-4xl font-headline font-black text-on-surface">{String(fermes).padStart(2, '0')}</p>
            </div>
          </div>

          {/* Guichets Grid */}
          {loading ? (
            <p className="text-secondary text-center py-20">Chargement…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {guichets.map((g) => {
                const badge = STATUT_BADGE[g.statut];
                const caissier = caissiers.find(c => c.id === g.caissierUid);
                const isFerme = g.statut === 'ferme' || g.statut === 'hors_ligne';
                return (
                  <div
                    key={g.id}
                    className={`p-8 rounded-[1.5rem] flex flex-col h-[280px] group relative transition-transform
                      ${isFerme
                        ? 'bg-surface-container-low/50 border-2 border-dashed border-surface-container'
                        : 'bg-surface-container-lowest shadow-[0_20px_50px_rgba(17,28,45,0.06)] hover:-translate-y-1'
                      }`}
                  >
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={() => openEdit(g)} className="p-2 text-secondary hover:text-primary bg-white shadow-sm rounded-full transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isFerme ? 'bg-surface-container text-secondary opacity-50' : 'bg-secondary-container text-primary'}`}>
                        <Monitor className="w-6 h-6" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className={`mb-auto ${isFerme ? 'opacity-50' : ''}`}>
                      <h3 className="font-headline font-extrabold text-2xl text-on-surface mb-1">
                        Guichet {String(g.numero).padStart(2, '0')}
                      </h3>
                      <p className="text-secondary text-sm">{g.nom}</p>
                    </div>

                    <div className={`pt-4 border-t border-surface-container-low flex items-center gap-3 ${isFerme ? 'opacity-50' : ''}`}>
                      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                        {caissier ? (
                          <span className="text-xs font-bold text-primary">{caissier.prenom[0]}{caissier.nom[0]}</span>
                        ) : (
                          <UserX className="w-4 h-4 text-secondary" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-on-surface truncate">
                          {caissier ? `${caissier.prenom} ${caissier.nom}` : 'Non assigné'}
                        </span>
                        <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                          {caissier ? 'Caissier' : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={openCreate}
          className="fixed bottom-12 right-12 w-16 h-16 bg-gradient-to-br from-primary to-primary-container rounded-full shadow-[0_10px_30px_rgba(230,0,66,0.3)] flex items-center justify-center text-white hover:scale-110 transition-transform z-50"
        >
          <Plus className="w-8 h-8" />
        </button>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-headline font-black text-2xl text-slate-900">
                {editTarget ? `Guichet ${String(editTarget.numero).padStart(2, '0')}` : 'Nouveau Guichet'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">Configurez les paramètres et l&apos;assignation du guichet.</p>
            </div>

            <div className="p-8 space-y-6">
              {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Numéro du guichet</label>
                <input
                  type="number"
                  min={1}
                  value={form.numero}
                  onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                  placeholder="Ex: 09"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nom / Description</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex: Opérations Bancaires"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Service</label>
                <select
                  value={form.serviceCode}
                  onChange={e => setForm(f => ({ ...f, serviceCode: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                >
                  <option value="">Sélectionner un service...</option>
                  {services.map(s => (
                    <option key={s.code} value={s.code}>{s.code} — {s.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Caissier assigné</label>
                <select
                  value={form.caissierUid}
                  onChange={e => setForm(f => ({ ...f, caissierUid: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                >
                  <option value="">Aucun caissier assigné</option>
                  {caissiers.map(c => {
                    const autreGuichet = guichets.find(
                      g => g.caissierUid === c.id && g.id !== editTarget?.id
                    );
                    return (
                      <option key={c.id} value={c.id}>
                        {c.prenom} {c.nom}
                        {autreGuichet ? ` (actuellement Guichet ${String(autreGuichet.numero).padStart(2, '0')} — sera réaffecté)` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Statut du guichet</label>
                <select
                  value={form.statut}
                  onChange={e => setForm(f => ({ ...f, statut: e.target.value as GuichetStatut }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                >
                  <option value="ouvert">Ouvert</option>
                  <option value="pause">En pause</option>
                  <option value="ferme">Fermé</option>
                  <option value="hors_ligne">Hors ligne</option>
                </select>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
              {confirmDelete ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-3 rounded-xl font-semibold text-center">
                    Confirmer la suppression du <strong>Guichet {String(editTarget?.numero).padStart(2, '0')}</strong> ?
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 px-4 rounded-full font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                      Annuler
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 px-4 rounded-full font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      {deleting ? 'Suppression…' : 'Supprimer définitivement'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-full font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                    Annuler
                  </button>
                  {editTarget && (
                    <button onClick={() => setConfirmDelete(true)} className="py-3 px-4 rounded-full font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  )}
                  <button onClick={handleSave} disabled={saving} className="flex-1 py-3 px-4 rounded-full font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-60">
                    {saving ? 'Sauvegarde…' : 'Enregistrer'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
