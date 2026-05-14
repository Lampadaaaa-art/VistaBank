'use client';

import { useState } from 'react';
import { LayoutDashboard, Users, Monitor, Settings, UserPlus, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useGuichets } from '@/hooks/useGuichets';
import { useServices } from '@/hooks/useServices';
import { useUsers } from '@/hooks/useUsers';
import { useUsersPresence } from '@/hooks/useUsersPresence';
import type { User as AppUser } from '@/lib/types';
import { AdminLogoutButton } from '@/components/admin-logout-button';

const STATUT_LABELS: Record<string, string> = {
  actif: 'Actif',
  inactif: 'Inactif',
  pause: 'En pause',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  superviseur: 'Superviseur',
  caissier: 'Caissier',
  borne: 'Borne (Kiosque)',
};

interface FormState {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: string;
  guichetId: string;
  servicesAutorises: string[];
  statut: string;
}

const FORM_INIT: FormState = {
  nom: '', prenom: '', email: '', password: '',
  role: 'caissier', guichetId: '', servicesAutorises: [], statut: 'actif',
};

export default function Utilisateurs() {
  const { user: authUser } = useAuth();
  const { guichets } = useGuichets();
  const { services } = useServices(true);
  const { users, loading, refresh } = useUsers();
  const presences = useUsersPresence();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [form, setForm] = useState<FormState>(FORM_INIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const openCreate = () => {
    setEditTarget(null);
    setForm(FORM_INIT);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditTarget(u);
    setForm({
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      password: '',
      role: u.role,
      guichetId: u.guichetId ?? '',
      servicesAutorises: u.servicesAutorises ?? [],
      statut: u.statut,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    setError('');
    if (!form.nom || !form.prenom || !form.email || !form.password) {
      setError('Tous les champs obligatoires doivent être remplis.');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        nom: form.nom, prenom: form.prenom, email: form.email,
        password: form.password, role: form.role, statut: 'actif',
      };
      if (form.role === 'caissier') {
        if (form.guichetId) body.guichetId = form.guichetId;
        if (form.servicesAutorises.length) body.servicesAutorises = form.servicesAutorises;
      }
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = 'Erreur lors de la création';
        try { const d = await res.json(); msg = d.error ?? msg; } catch { /* non-JSON */ }
        setError(msg);
        return;
      }
      setIsModalOpen(false);
      setForm(FORM_INIT);
      setSuccess(`Utilisateur "${form.prenom} ${form.nom}" créé avec succès.`);
      setTimeout(() => setSuccess(''), 4000);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setError('');
    if (!form.nom || !form.prenom) {
      setError('Le nom et le prénom sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        nom: form.nom,
        prenom: form.prenom,
        role: form.role,
        statut: form.statut,
      };
      if (form.role === 'caissier') {
        body.guichetId = form.guichetId || null;
        body.servicesAutorises = form.servicesAutorises;
      }
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = 'Erreur lors de la modification';
        try { const d = await res.json(); msg = d.error ?? msg; } catch { /* non-JSON */ }
        setError(msg);
        return;
      }
      setIsModalOpen(false);
      setEditTarget(null);
      setSuccess(`Utilisateur "${form.prenom} ${form.nom}" modifié avec succès.`);
      setTimeout(() => setSuccess(''), 4000);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Supprimer cet utilisateur définitivement ?')) return;
    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      await refresh();
    } catch { /* ignore */ }
  };

  const toggleService = (code: string) => {
    setForm(f => ({
      ...f,
      servicesAutorises: f.servicesAutorises.includes(code)
        ? f.servicesAutorises.filter(s => s !== code)
        : [...f.servicesAutorises, code],
    }));
  };

  const nomComplet = authUser ? `${authUser.prenom} ${authUser.nom}` : 'Chargement…';

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* Sidebar */}
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
          <Link href="/admin/utilisateurs" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <Users className="w-5 h-5 fill-current" />
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
          <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">Gestion utilisateurs</h2>
          <div className="flex items-center gap-4 border-l border-on-surface/10 pl-6">
            <div className="flex flex-col items-end">
              <span className="font-bold text-sm text-on-surface">{nomComplet}</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Administrateur</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-sm">
              {authUser ? `${authUser.prenom?.[0] ?? ''}${authUser.nom?.[0] ?? ''}` : '…'}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {success && (
            <div className="mb-6 px-6 py-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-semibold text-sm">
              {success}
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div className="max-w-2xl">
              <h3 className="text-4xl font-extrabold text-on-surface mb-3 tracking-tight font-headline">Annuaire des accès</h3>
              <p className="text-secondary text-lg leading-relaxed">Gérez les privilèges de votre autorité souveraine. Créez et modifiez les profils des agents de guichet et de supervision.</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-full font-bold shadow-[0_10px_30px_rgba(230,0,66,0.2)] hover:scale-105 transition-transform"
            >
              <UserPlus className="w-5 h-5" />
              Nouvel Utilisateur
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Utilisateur</th>
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Rôle</th>
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Statut</th>
                  <th className="px-8 py-5 text-right text-sm font-extrabold text-on-surface uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {loading ? (
                  <tr><td colSpan={4} className="px-8 py-12 text-center text-secondary">Chargement…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={4} className="px-8 py-12 text-center text-secondary">Aucun utilisateur</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold">
                          {u.prenom?.[0] ?? ''}{u.nom?.[0] ?? ''}
                        </div>
                        <div>
                          <div className="font-bold text-on-surface">{u.prenom} {u.nom}</div>
                          <div className="text-xs text-secondary">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold px-3 py-1 bg-surface-container rounded-full text-secondary">
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        <span className={cn(
                          "text-xs font-bold px-2.5 py-1 rounded-full w-fit",
                          u.statut === 'actif' && "bg-emerald-100 text-emerald-700",
                          u.statut === 'inactif' && "bg-slate-100 text-slate-500",
                          u.statut === 'pause' && "bg-amber-100 text-amber-700",
                        )}>
                          {STATUT_LABELS[u.statut] ?? u.statut}
                        </span>
                        {presences[u.id] ? (
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex w-2 h-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-600">En ligne</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span className="text-[10px] text-slate-400">Hors ligne</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-2 text-secondary hover:text-primary hover:bg-surface-container rounded-full transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-2 text-secondary hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Créer / Modifier */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-headline font-black text-2xl text-slate-900">
                {editTarget ? 'Modifier l\'utilisateur' : 'Nouvel Utilisateur'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                {editTarget
                  ? `Modifiez les informations de ${editTarget.prenom} ${editTarget.nom}.`
                  : 'Créez un profil pour un administrateur, superviseur ou caissier.'}
              </p>
            </div>

            <div className="p-8 space-y-6">
              {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nom</label>
                  <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} type="text" placeholder="Ex: Diallo" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Prénom</label>
                  <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} type="text" placeholder="Ex: Amadou" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>

              {!editTarget && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" placeholder="Ex: a.diallo@banque.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mot de passe</label>
                    <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Rôle</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none">
                    <option value="admin">Administrateur</option>
                    <option value="superviseur">Superviseur</option>
                    <option value="caissier">Caissier</option>
                    <option value="borne">Borne (Kiosque)</option>
                  </select>
                </div>
                {editTarget && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Statut</label>
                    <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none">
                      <option value="actif">Actif</option>
                      <option value="inactif">Inactif</option>
                      <option value="pause">En pause</option>
                    </select>
                  </div>
                )}
              </div>

              {form.role === 'caissier' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="w-full h-px bg-slate-100"></div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Guichet assigné</label>
                    <select value={form.guichetId} onChange={e => setForm(f => ({ ...f, guichetId: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none">
                      <option value="">Sélectionner un guichet...</option>
                      {guichets.map(g => (
                        <option key={g.id} value={g.id}>Guichet {String(g.numero).padStart(2, '0')} — {g.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Services autorisés</label>
                    <div className="grid grid-cols-2 gap-3">
                      {services.map(s => (
                        <label key={s.code} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={form.servicesAutorises.includes(s.code)}
                            onChange={() => toggleService(s.code)}
                            className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="font-bold text-slate-700 text-sm">{s.nom}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => { setIsModalOpen(false); setEditTarget(null); }} className="flex-1 py-3 px-4 rounded-full font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                Annuler
              </button>
              <button
                onClick={editTarget ? handleUpdate : handleCreate}
                disabled={saving}
                className="flex-1 py-3 px-4 rounded-full font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {saving ? (editTarget ? 'Modification…' : 'Création…') : (editTarget ? 'Enregistrer' : "Créer l'utilisateur")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
