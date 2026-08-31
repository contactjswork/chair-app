'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X, Loader, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import BottomSheet from '@/components/ui/BottomSheet';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Appelé une fois le SIRET vérifié avec succès — laisse l'appelant relancer son action initiale. */
  onVerified: () => void;
  /** Ce que le coiffeur essayait de faire — personnalise le message ("louer un fauteuil", "postuler"...). */
  action: string;
}

// Bottom sheet premium expliquant pourquoi une action nécessite un SIRET
// vérifié, avec le formulaire de vérification directement dedans (source
// unique : POST /profile/siret, réutilise la même API publique que le SIRET
// salon — voir SiretVerificationService côté backend).
export default function SiretVerificationSheet({ open, onClose, onVerified, action }: Props) {
  const { user, updateUser } = useAuth();
  const [siret, setSiret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ business_name: string; city: string } | null>(null);

  const status = user?.hairdresser_profile?.siret_verification_status;

  if (!open) return null;

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ verified: boolean; message?: string; business_name?: string; city?: string }>(
        '/profile/siret',
        { siret: siret.replace(/\s/g, '') }
      );
      if (res.verified) {
        setSuccess({ business_name: res.business_name ?? '', city: res.city ?? '' });
        if (user?.hairdresser_profile) {
          updateUser({ hairdresser_profile: { ...user.hairdresser_profile, siret_verification_status: 'verified' } });
        }
      } else {
        setError(res.message ?? 'Vérification impossible.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la vérification.');
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <BottomSheet onClose={onClose} maxHeight="max-h-[85vh]" zIndexClassName="z-[100]">
      <div className="px-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center justify-between mb-5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-900 flex items-center justify-center">
            <ShieldCheck size={19} className="text-white" />
          </div>
          <button onClick={onClose} className="w-8 h-8 relative before:absolute before:-inset-1.5 before:content-[''] flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-neutral-900 mb-1">SIRET vérifié</h2>
            <p className="text-[13px] text-neutral-500 mb-6">
              {success.business_name}{success.city ? ` · ${success.city}` : ''}
            </p>
            <button
              onClick={() => { onVerified(); onClose(); }}
              className="w-full py-3.5 bg-neutral-900 text-white text-sm font-semibold rounded-2xl hover:bg-neutral-700 transition-colors"
            >
              Continuer
            </button>
          </div>
        ) : status === 'pending' ? (
          <div className="text-center py-4">
            <Loader size={32} className="text-neutral-300 mx-auto mb-3 animate-spin" />
            <p className="text-sm font-semibold text-neutral-700">Vérification en cours</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-neutral-900 mb-1.5">SIRET vérifié requis</h2>
            <p className="text-[13px] text-neutral-500 leading-relaxed mb-5">
              Pour {action}, CHAIR vous demande un SIRET actif et déclaré en activité coiffure. Cette vérification protège tout le monde :
            </p>
            <div className="space-y-2.5 mb-6">
              {[
                'Sécurité — seuls des professionnels réels échangent entre eux',
                'Anti-fraude — impossible de se faire passer pour un pro sans existence légale',
                'Réservé aux professionnels — cohérent avec l\'esprit CHAIR',
              ].map((line) => (
                <div key={line} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-900 mt-1.5 flex-shrink-0" />
                  <p className="text-[13px] text-neutral-600 leading-snug">{line}</p>
                </div>
              ))}
            </div>

            {status === 'rejected' && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 mb-4">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-600 leading-snug">
                  Le SIRET précédent n&apos;a pas pu être validé (établissement fermé ou activité non-coiffure). Réessayez avec un autre numéro.
                </p>
              </div>
            )}

            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Numéro SIRET (14 chiffres)</label>
            <input
              type="text"
              inputMode="numeric"
              value={siret}
              onChange={(e) => setSiret(e.target.value.replace(/[^\d]/g, '').slice(0, 14))}
              placeholder="123 456 789 00012"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm tracking-wide focus:outline-none focus:border-neutral-400 focus:bg-white transition-all mb-2"
            />
            {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={siret.length !== 14 || loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-neutral-900 text-white text-sm font-semibold rounded-2xl hover:bg-neutral-700 transition-colors disabled:opacity-40 mt-2"
            >
              {loading ? <Loader size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              {loading ? 'Vérification...' : 'Faire vérifier mon SIRET'}
            </button>
          </>
        )}
      </div>
    </BottomSheet>,
    document.body
  );
}
