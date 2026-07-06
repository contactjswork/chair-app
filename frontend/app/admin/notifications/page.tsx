'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Bell, ChevronLeft, ChevronRight, Search } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('chair_admin_token') : null;

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-100 rounded-xl ${className ?? ''}`} />;
}

function ConfirmModal({ open, title, message, onCancel, onConfirm, loading }: {
  open: boolean; title: string; message: string;
  onCancel: () => void; onConfirm: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
        <h3 className="text-[16px] font-bold text-neutral-900">{title}</h3>
        <p className="text-[13px] text-neutral-500">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors">Annuler</button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-neutral-900 hover:bg-neutral-700 transition-colors disabled:opacity-50">
            {loading ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface UserSuggestion {
  id: number;
  name: string;
  email: string;
}

interface NotifHistory {
  id: number;
  title: string;
  target: string;
  sent_at: string;
  recipients_count: number;
}

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [userId, setUserId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [sendError, setSendError] = useState('');

  const [history, setHistory] = useState<NotifHistory[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  const searchRef = useRef<HTMLInputElement>(null);

  const fetchHistory = useCallback(() => {
    const token = getToken();
    fetch(`${API_URL}/admin/notifications/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setHistory(d.history ?? d ?? []); setHistLoading(false); })
      .catch(() => setHistLoading(false));
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Autocomplete users
  useEffect(() => {
    if (target !== 'user' || userSearch.length < 2) { setUserSuggestions([]); return; }
    const t = setTimeout(async () => {
      const token = getToken();
      try {
        const res = await fetch(`${API_URL}/admin/users?search=${encodeURIComponent(userSearch)}&per_page=5`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        setUserSuggestions(json.data ?? []);
        setShowSuggestions(true);
      } catch { setUserSuggestions([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch, target]);

  async function handleSend() {
    setSending(true);
    setSendError('');
    const token = getToken();
    try {
      const body: Record<string, unknown> = { title, message, target };
      if (target === 'user' && userId) body.user_id = userId;
      const res = await fetch(`${API_URL}/admin/notifications/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Erreur envoi');
      setSuccess('Notification envoyée avec succès !');
      setTitle(''); setMessage(''); setTarget('all'); setUserId(null); setSelectedUser(null); setUserSearch('');
      fetchHistory();
    } catch { setSendError("Erreur lors de l'envoi"); }
    finally { setSending(false); setConfirm(false); }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  const targetLabels: Record<string, string> = {
    all: 'Tous les utilisateurs',
    clients: 'Clients uniquement',
    hairdressers: 'Coiffeurs uniquement',
    user: '1 utilisateur',
  };

  const canSend = title.trim() && message.trim() && (target !== 'user' || userId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900">Notifications</h1>
        <p className="text-[13px] text-neutral-400 mt-0.5">Envoyer des notifications push aux utilisateurs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulaire */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell size={16} className="text-neutral-400" />
            <h2 className="text-[15px] font-semibold text-neutral-900">Nouvelle notification</h2>
          </div>

          {success && (
            <div className="px-4 py-3 bg-emerald-50 rounded-xl text-[13px] text-emerald-700 mb-4">{success}</div>
          )}
          {sendError && (
            <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600 mb-4">{sendError}</div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-neutral-500 mb-1.5">Titre</label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setSuccess(''); }}
                placeholder="Ex : Nouvelle fonctionnalité disponible"
                maxLength={100}
                className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-neutral-500 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value); setSuccess(''); }}
                placeholder="Corps de la notification…"
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-all resize-none"
              />
              <div className="text-right text-[11px] text-neutral-300 mt-1">{message.length}/500</div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-neutral-500 mb-1.5">Destinataires</label>
              <select
                value={target}
                onChange={(e) => { setTarget(e.target.value); setUserId(null); setSelectedUser(null); setUserSearch(''); }}
                className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-[14px] text-neutral-700 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-all"
              >
                <option value="all">Tous les utilisateurs</option>
                <option value="clients">Clients uniquement</option>
                <option value="hairdressers">Coiffeurs uniquement</option>
                <option value="user">1 utilisateur spécifique</option>
              </select>
            </div>

            {target === 'user' && (
              <div className="relative">
                <label className="block text-[12px] font-semibold text-neutral-500 mb-1.5">Rechercher l'utilisateur</label>
                {selectedUser ? (
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 rounded-xl">
                    <div>
                      <p className="text-[13px] font-medium text-neutral-900">{selectedUser.name}</p>
                      <p className="text-[11px] text-neutral-400">{selectedUser.email}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedUser(null); setUserId(null); setUserSearch(''); }}
                      className="text-[11px] text-red-400 hover:text-red-600"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onFocus={() => userSuggestions.length && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Nom ou email…"
                      className="w-full pl-9 pr-4 py-3 bg-neutral-50 rounded-xl text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-all"
                    />
                    {showSuggestions && userSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 mt-1 overflow-hidden">
                        {userSuggestions.map((u) => (
                          <button
                            key={u.id}
                            onMouseDown={() => {
                              setSelectedUser(u);
                              setUserId(u.id);
                              setUserSearch(u.name);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 transition-colors"
                          >
                            <p className="text-[13px] font-medium text-neutral-900">{u.name}</p>
                            <p className="text-[11px] text-neutral-400">{u.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setConfirm(true)}
              disabled={!canSend}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-neutral-900 text-white rounded-xl text-[14px] font-semibold hover:bg-neutral-700 transition-colors disabled:opacity-40 mt-1"
            >
              <Send size={15} /> Envoyer la notification
            </button>
          </div>
        </div>

        {/* Historique */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-[15px] font-semibold text-neutral-900">Historique récent</h2>
          </div>
          {histLoading ? (
            <div className="p-5 flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : !history.length ? (
            <div className="px-5 py-10 text-center text-[13px] text-neutral-400">Aucune notification envoyée</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {history.slice(0, 20).map((n) => (
                <div key={n.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-neutral-900 truncate">{n.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-neutral-400">{targetLabels[n.target] ?? n.target}</span>
                        <span className="text-neutral-200">·</span>
                        <span className="text-[11px] text-neutral-400">{n.recipients_count} destinataires</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-neutral-300 flex-shrink-0">{formatDate(n.sent_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirm}
        title="Envoyer la notification"
        message={`Envoyer "${title}" à ${targetLabels[target] ?? target}${target === 'user' && selectedUser ? ` (${selectedUser.name})` : ''} ?`}
        onCancel={() => setConfirm(false)}
        onConfirm={handleSend}
        loading={sending}
      />
    </div>
  );
}
