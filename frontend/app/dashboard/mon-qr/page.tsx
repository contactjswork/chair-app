'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { visits } from '@/lib/api';
import type { ApiQrTokenResponse } from '@/lib/types';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, RefreshCw, Clock, Shield, CheckCircle2,
  Smartphone, Copy, Check,
} from 'lucide-react';
import DashboardNav from '@/components/layout/DashboardNav';

export default function MonQrPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);

  const [qr,          setQr]          = useState<ApiQrTokenResponse | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copied,      setCopied]      = useState(false);
  const [fetchError,  setFetchError]  = useState('');

  const fetchToken = useCallback(async (silent = false, forceNew = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setFetchError('');
    try {
      const data = forceNew ? await visits.refreshQrToken() : await visits.getQrToken();
      setQr(data);
      const until = new Date(data.valid_until).getTime();
      setSecondsLeft(Math.max(0, Math.round((until - Date.now()) / 1000)));
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Erreur lors du chargement du QR Code.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Premier chargement
  useEffect(() => {
    if (user) fetchToken();
  }, [user, fetchToken]);

  // Countdown + auto-refresh à expiration
  useEffect(() => {
    if (!qr) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchToken(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qr, fetchToken]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function urgencyColor(s: number) {
    if (s > 600) return 'text-green-600';
    if (s > 180) return 'text-amber-500';
    return 'text-red-500';
  }

  async function copyLink() {
    if (!qr) return;
    await navigator.clipboard.writeText(qr.scan_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const pct = qr ? Math.round((secondsLeft / (qr.ttl_minutes * 60)) * 100) : 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardNav />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 h-14 flex items-center md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors mr-auto">
          <ArrowLeft size={16} />
          <span className="text-xs font-medium">Tableau de bord</span>
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2">
          Mon QR Code
        </span>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-28 md:pb-10 space-y-5">

        {/* Desktop header */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-700 transition-colors">
            <ArrowLeft size={14} />
            <span className="text-xs">Retour</span>
          </Link>
          <span className="text-neutral-200">/</span>
          <h1 className="text-lg font-bold text-neutral-900">Mon QR Code CHAIR</h1>
        </div>

        {/* Explication */}
        <div className="bg-neutral-900 text-white rounded-2xl px-5 py-4">
          <p className="text-sm font-bold mb-1">Comment ça marche</p>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Après chaque prestation, montrez ce QR à votre client. Il le scanne, confirme sa visite,
            et peut laisser un avis certifié. Chaque visite validée alimente votre score CHAIR.
          </p>
        </div>

        {/* QR Code card */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-neutral-100 p-10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center space-y-3">
            <p className="text-sm font-bold text-red-700">Impossible de charger le QR Code</p>
            <p className="text-xs text-red-500 leading-relaxed">{fetchError}</p>
            <button
              onClick={() => fetchToken()}
              className="text-xs font-semibold text-red-600 underline hover:text-red-800"
            >
              Réessayer
            </button>
          </div>
        ) : qr ? (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            {/* Timer bar */}
            <div className="h-1.5 bg-neutral-100 relative">
              <div
                className={`h-full transition-all duration-1000 ${
                  pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-amber-400' : 'bg-red-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="p-6 flex flex-col items-center gap-5">
              {/* QR */}
              <div className="p-4 bg-white rounded-2xl border-2 border-neutral-100 shadow-sm">
                <QRCodeSVG
                  value={qr.scan_url}
                  size={220}
                  level="M"
                  includeMargin={false}
                  style={{ display: 'block' }}
                />
              </div>

              {/* Nom du coiffeur sous le QR */}
              <div className="text-center">
                <p className="font-bold text-neutral-900">{user.name}</p>
                {user.hairdresser_profile?.salon && (
                  <p className="text-xs text-neutral-400 mt-0.5">{user.hairdresser_profile.salon.name}</p>
                )}
              </div>

              {/* Countdown */}
              <div className="flex items-center gap-2">
                <Clock size={14} className={urgencyColor(secondsLeft)} />
                <span className={`text-sm font-bold tabular-nums ${urgencyColor(secondsLeft)}`}>
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-xs text-neutral-400">avant expiration</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => fetchToken(true, true)}
                  disabled={refreshing}
                  className="flex-1 flex items-center justify-center gap-2 border border-neutral-200 rounded-xl py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                  Nouveau QR
                </button>
                <button
                  onClick={copyLink}
                  className="flex-1 flex items-center justify-center gap-2 border border-neutral-200 rounded-xl py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                  {copied ? 'Copié !' : 'Copier le lien'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Instructions */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-50">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
              Mode d&apos;emploi
            </p>
          </div>
          {[
            {
              icon: Smartphone,
              title: 'Après la prestation',
              desc: 'Montrez ce QR à votre client. Il peut scanner avec n\'importe quel appareil photo.',
            },
            {
              icon: CheckCircle2,
              title: 'Le client confirme',
              desc: 'Il sélectionne la prestation et confirme la visite en 2 taps.',
            },
            {
              icon: Shield,
              title: 'Avis certifié débloqué',
              desc: 'Il peut laisser un avis marqué "Visite vérifiée" qui booste votre réputation.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 px-5 py-4 border-b border-neutral-50 last:border-0">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-white" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{title}</p>
                <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Anti-fraude info */}
        <div className="flex items-start gap-3 px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-100">
          <Shield size={14} className="text-neutral-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Ce QR est unique et change automatiquement toutes les {qr?.ttl_minutes ?? 30} minutes.
            Un QR photographié et partagé sera inutilisable une fois expiré.
          </p>
        </div>

      </div>
    </div>
  );
}
