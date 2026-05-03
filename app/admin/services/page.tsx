'use client';

import { useState } from 'react';
import { LayoutDashboard, Users, Monitor, Settings, Plus, Edit2, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useServices } from '@/hooks/useServices';
import { useAuth } from '@/hooks/useAuth';
import { AdminLogoutButton } from '@/components/admin-logout-button';
import type { Service } from '@/lib/types';

interface ServiceForm {
  code: string;
  nom: string;
  tempsEstime: string;
}

const FORM_INIT: ServiceForm = { code: '', nom: '', tempsEstime: '5' };

export default function Services() {
  const { user } = useAuth();
  const { services, loading } = useServices();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(FORM_INIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const nomComplet = user ? `${user.prenom} ${user.nom}` : 'Chargement…';

  const openEdit = (service: Service) => {
    setEditTarget(service);
    setForm({ code: service.code, nom: service.nom, tempsEstime: String(service.tempsEstime) });
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditTarget(null);
    setForm(FORM_INIT);
    setError('');
  };

  const handleCreate = async () => {
    setError('');
    if (!form.code || !form.nom) {
      setError('Le code et le nom sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          nom: form.nom,
          tempsEstime: parseInt(form.tempsEstime) || 5,
          actif: true,
          ordre: services.length,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Erreur lors de la création');
        return;
      }
      closeModal();
      setSuccess(`Service "${form.nom}" créé avec succès.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setError('');
    if (!form.nom) {
      setError('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom,
          tempsEstime: parseInt(form.tempsEstime) || 5,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Erreur lors de la modification');
        return;
      }
      closeModal();
      setSuccess(`Service "${form.nom}" modifié avec succès.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActif = async (serviceId: string, actif: boolean) => {
    await fetch(`/api/services/${serviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !actif }),
    });
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Supprimer ce service ?')) return;
    await fetch(`/api/services/${serviceId}`, { method: 'DELETE' });
  };

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
          <Link href="/admin/utilisateurs" className="flex items-center gap-3 text-on-surface/60 px-4 py-3 mx-4 mb-2 hover:bg-white/50 transition-all font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <Users className="w-5 h-5" />
            Gestion Utilisateurs
          </Link>
          <Link href="/admin/services" className="flex items-center gap-3 bg-surface-container-lowest text-primary-container rounded-xl px-4 py-3 shadow-sm mx-4 mb-2 font-headline text-sm font-semibold tracking-wide translate-x-1 duration-200">
            <Settings className="w-5 h-5 fill-current" />
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
          <h2 className="font-headline tracking-tight font-bold text-2xl text-on-surface">Gestion des Services</h2>
          <div className="flex items-center gap-4 border-l border-on-surface/10 pl-6">
            <div className="flex flex-col items-end">
              <span className="font-bold text-sm text-on-surface">{nomComplet}</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Administrateur</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-sm">
              {user ? `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}` : '…'}
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
              <h3 className="text-4xl font-extrabold text-on-surface mb-3 tracking-tight font-headline">Catalogue des Services</h3>
              <p className="text-secondary text-lg leading-relaxed">Ajoutez, modifiez ou supprimez les services bancaires proposés à la borne.</p>
            </div>
            <button
              onClick={() => { setEditTarget(null); setForm(FORM_INIT); setError(''); setIsModalOpen(true); }}
              className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-full font-bold shadow-[0_10px_30px_rgba(230,0,66,0.2)] hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" />
              Nouveau Service
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-[1.5rem] shadow-[0_20px_50px_rgba(17,28,45,0.06)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Code</th>
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Nom du Service</th>
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Temps Moyen (min)</th>
                  <th className="px-8 py-5 text-sm font-extrabold text-on-surface uppercase tracking-wider">Statut</th>
                  <th className="px-8 py-5 text-right text-sm font-extrabold text-on-surface uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {loading ? (
                  <tr><td colSpan={5} className="px-8 py-12 text-center text-secondary">Chargement…</td></tr>
                ) : services.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-12 text-center text-secondary">Aucun service</td></tr>
                ) : services.map(service => (
                  <tr key={service.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary font-headline font-black text-xl flex items-center justify-center">
                        {service.code}
                      </div>
                    </td>
                    <td className="px-8 py-6 font-bold text-on-surface text-lg">{service.nom}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-secondary font-medium">
                        <Clock className="w-4 h-4" />
                        {service.tempsEstime} min
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => handleToggleActif(service.id, service.actif)}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      >
                        {service.actif ? (
                          <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm font-medium text-emerald-600">Actif</span></>
                        ) : (
                          <><XCircle className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium text-slate-500">Inactif</span></>
                        )}
                      </button>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(service)} className="p-2 text-secondary hover:text-primary hover:bg-surface-container rounded-full transition-colors">
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(service.id)} className="p-2 text-secondary hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
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

      {/* Modal Créer / Modifier Service */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-headline font-black text-2xl text-slate-900">
                {editTarget ? 'Modifier le Service' : 'Nouveau Service'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                {editTarget ? `Modification du service "${editTarget.nom}".` : 'Ajoutez un nouveau service à la borne.'}
              </p>
            </div>

            <div className="p-8 space-y-6">
              {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Code du service (Lettre)</label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  type="text"
                  maxLength={5}
                  placeholder="Ex: F"
                  disabled={!!editTarget}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nom du service</label>
                <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} type="text" placeholder="Ex: Remise de chèque" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Temps moyen estimé (minutes)</label>
                <input value={form.tempsEstime} onChange={e => setForm(f => ({ ...f, tempsEstime: e.target.value }))} type="number" min="1" placeholder="Ex: 5" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={closeModal} className="flex-1 py-3 px-4 rounded-full font-bold text-slate-600 hover:bg-slate-200 transition-colors">Annuler</button>
              <button onClick={editTarget ? handleUpdate : handleCreate} disabled={saving} className="flex-1 py-3 px-4 rounded-full font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-60">
                {saving ? (editTarget ? 'Modification…' : 'Création…') : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
