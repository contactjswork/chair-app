'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { ApiSpecialty } from '@/lib/types';
import ImageUpload from '@/components/ui/ImageUpload';
import { ChevronLeft, Save, Check, AlertCircle } from 'lucide-react';
import DashboardNav from '@/components/layout/DashboardNav';

const API_BASE = 'http://localhost:8000/api';

interface ProfileData {
  user: { name: string; bio: string | null; city: string | null; avatar: string | null };
  profile: {
    slug: string;
    tagline: string | null;
    city: string | null;
    instagram_url: string | null;
    booking_url: string | null;
    years_experience: number | null;
    banner_image: string | null;
    is_independent: boolean;
    specialties: ApiSpecialty[];
  };
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function DashboardProfilPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const { updateUser } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allSpecialties, setAllSpecialties] = useState<ApiSpecialty[]>([]);

  // Champs du formulaire
  const [bio, setBio] = useState('');
  const [tagline, setTagline] = useState('');
  const [city, setCity] = useState('');
  const [instagram, setInstagram] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<number[]>([]);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user) return;

    Promise.all([
      api.get<ProfileData>('/profile'),
      fetch(`${API_BASE}/specialties`).then((r) => r.json()),
    ])
      .then(([profileData, specs]) => {
        setProfile(profileData);
        setBio(profileData.user.bio ?? '');
        setTagline(profileData.profile.tagline ?? '');
        setCity(profileData.profile.city ?? profileData.user.city ?? '');
        setInstagram(profileData.profile.instagram_url ?? '');
        setBookingUrl(profileData.profile.booking_url ?? '');
        setYearsExp(String(profileData.profile.years_experience ?? ''));
        setSelectedSpecialties(profileData.profile.specialties.map((s) => s.id));
        setAllSpecialties(specs);
        setAvatarUrl(profileData.user.avatar);
        setBannerUrl(profileData.profile.banner_image);
      })
      .catch((e) => setErrorMsg(e instanceof Error ? e.message : 'Impossible de charger le profil.'))
      .finally(() => setLoading(false));
  }, [user]);

  function toggleSpecialty(id: number) {
    setSelectedSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaveStatus('saving');
    setErrorMsg('');
    try {
      await api.put('/profile', {
        bio: bio || null,
        tagline: tagline || null,
        city: city || null,
        instagram_url: instagram || null,
        booking_url: bookingUrl || null,
        years_experience: yearsExp ? parseInt(yearsExp) : null,
        specialties: selectedSpecialties,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.');
      setSaveStatus('error');
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-sm text-neutral-400">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardNav />
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 md:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            <ChevronLeft size={16} />
            Dashboard
          </Link>
          <span className="text-neutral-200">|</span>
          <span className="text-sm font-semibold text-neutral-900">Modifier mon profil</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50 ${
            saveStatus === 'saved'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-900 text-white hover:bg-neutral-700'
          }`}
        >
          {saveStatus === 'saving' ? (
            <>Sauvegarde...</>
          ) : saveStatus === 'saved' ? (
            <><Check size={15} /> Sauvegardé</>
          ) : (
            <><Save size={15} /> Enregistrer</>
          )}
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        {errorMsg && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        {/* Photos */}
        <section className="bg-white rounded-2xl border border-neutral-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Photos de profil</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ImageUpload
              currentUrl={avatarUrl}
              endpoint="/api/profile/avatar"
              onSuccess={(url) => { setAvatarUrl(url); updateUser({ avatar: url }); }}
              label="Photo de profil"
              aspectClass="aspect-square"
              shape="circle"
            />
            <ImageUpload
              currentUrl={bannerUrl}
              endpoint="/api/profile/banner"
              onSuccess={(url) => setBannerUrl(url)}
              label="Bannière"
              aspectClass="aspect-[3/1]"
              shape="rect"
            />
          </div>
        </section>

        {/* Bio */}
        <section className="bg-white rounded-2xl border border-neutral-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Présentation</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                Tagline <span className="text-neutral-400 font-normal">— accroche courte</span>
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={255}
                placeholder="Ex : Spécialiste balayage & colorations naturelles"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
              />
              <p className="text-[11px] text-neutral-400 mt-1 text-right">{tagline.length}/255</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={1000}
                rows={5}
                placeholder="Décrivez votre parcours, vos techniques favorites, ce qui vous distingue..."
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all resize-none"
              />
              <p className="text-[11px] text-neutral-400 mt-1 text-right">{bio.length}/1000</p>
            </div>
          </div>
        </section>

        {/* Infos pro */}
        <section className="bg-white rounded-2xl border border-neutral-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Informations professionnelles</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Ville</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex : Strasbourg"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                Années d'expérience
              </label>
              <input
                type="number"
                value={yearsExp}
                onChange={(e) => setYearsExp(e.target.value)}
                min={0}
                max={50}
                placeholder="Ex : 8"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                Instagram <span className="text-neutral-400 font-normal">— URL complète</span>
              </label>
              <input
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/votre-compte"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
              />
            </div>
            {profile?.profile && !profile.profile.is_independent && (
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                  Lien de réservation salon <span className="text-neutral-400 font-normal">— Planity, Treatwell...</span>
                </label>
                <input
                  type="url"
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                  placeholder="https://planity.com/votre-salon"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
                />
              </div>
            )}
          </div>
        </section>

        {/* Spécialités */}
        <section className="bg-white rounded-2xl border border-neutral-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 mb-1">Spécialités</h2>
          <p className="text-xs text-neutral-400 mb-4">Sélectionnez vos domaines d'expertise</p>
          <div className="flex flex-wrap gap-2">
            {allSpecialties.map((s) => {
              const selected = selectedSpecialties.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSpecialty(s.id)}
                  className={`text-xs font-medium tracking-wide uppercase px-3 py-1.5 rounded-full border transition-all ${
                    selected
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'text-neutral-500 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
          {selectedSpecialties.length > 0 && (
            <p className="text-[11px] text-neutral-400 mt-3">{selectedSpecialties.length} sélectionnée{selectedSpecialties.length > 1 ? 's' : ''}</p>
          )}
        </section>

        {/* Lien profil public */}
        {user.hairdresser_profile && (
          <div className="text-center py-4">
            <Link
              href={`/coiffeur/${user.hairdresser_profile.slug}`}
              className="text-xs text-neutral-400 hover:text-neutral-700 underline transition-colors"
              target="_blank"
            >
              Voir mon profil public →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
