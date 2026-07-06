'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('chair_admin_token') : null;

type Period = '7' | '30' | '90';

interface DayData {
  date: string;
  count: number;
}

interface CityData {
  city: string;
  count: number;
}

interface Analytics {
  registrations: DayData[];
  appointments: DayData[];
  top_cities: CityData[];
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-100 rounded-xl ${className ?? ''}`} />;
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

function LineChart({ data, color = '#171717' }: { data: DayData[]; color?: string }) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-[13px] text-neutral-400">Pas de données</div>;

  const W = 600;
  const H = 140;
  const PAD = { top: 10, right: 10, bottom: 30, left: 35 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const minVal = 0;

  const xScale = (i: number) => PAD.left + (i / (data.length - 1 || 1)) * chartW;
  const yScale = (v: number) => PAD.top + chartH - ((v - minVal) / (maxVal - minVal || 1)) * chartH;

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.count)}`).join(' ');
  const area = [
    `M ${xScale(0)},${yScale(0)}`,
    ...data.map((d, i) => `L ${xScale(i)},${yScale(d.count)}`),
    `L ${xScale(data.length - 1)},${yScale(0)}`,
    'Z',
  ].join(' ');

  // x labels: show ~6 evenly spaced
  const step = Math.ceil(data.length / 6);
  const xLabels = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  // y labels
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  function formatLabel(iso: string) {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
      {/* y gridlines */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left} x2={W - PAD.right}
            y1={yScale(v)} y2={yScale(v)}
            stroke="#f0f0f0" strokeWidth={1}
          />
          <text x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end" fontSize={10} fill="#aaa">{v}</text>
        </g>
      ))}

      {/* Area */}
      <path d={area} fill={color} opacity={0.07} />

      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {data.length <= 30 && data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.count)} r={3} fill={color} />
      ))}

      {/* x labels */}
      {xLabels.map((d, i) => {
        const idx = data.indexOf(d);
        return (
          <text key={i} x={xScale(idx)} y={H - 6} textAnchor="middle" fontSize={10} fill="#aaa">
            {formatLabel(d.date)}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────────

function HorizontalBars({ data }: { data: CityData[] }) {
  if (!data.length) return <div className="text-[13px] text-neutral-400 py-4 text-center">Pas de données</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex flex-col gap-2">
      {data.slice(0, 10).map((d) => (
        <div key={d.city} className="flex items-center gap-3">
          <div className="w-24 text-[12px] text-neutral-500 text-right truncate flex-shrink-0">{d.city}</div>
          <div className="flex-1 bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-neutral-900 rounded-full transition-all"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <div className="w-10 text-[12px] text-neutral-500 text-right flex-shrink-0">{d.count}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatistiquesPage() {
  const [period, setPeriod] = useState<Period>('30');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    setLoading(true);
    fetch(`${API_URL}/admin/analytics?period=${period}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setAnalytics(d); setLoading(false); })
      .catch(() => { setError('Erreur de chargement'); setLoading(false); });
  }, [period]);

  const PERIODS: { value: Period; label: string }[] = [
    { value: '7', label: '7 jours' },
    { value: '30', label: '30 jours' },
    { value: '90', label: '90 jours' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900">Statistiques</h1>
          <p className="text-[13px] text-neutral-400 mt-0.5">Analytiques de la plateforme</p>
        </div>
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                period === value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inscriptions */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <h2 className="text-[14px] font-semibold text-neutral-900 mb-4">Inscriptions par jour</h2>
          {loading ? <Skeleton className="h-40" /> : (
            <LineChart data={analytics?.registrations ?? []} color="#7c3aed" />
          )}
        </div>

        {/* RDV */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <h2 className="text-[14px] font-semibold text-neutral-900 mb-4">Réservations par jour</h2>
          {loading ? <Skeleton className="h-40" /> : (
            <LineChart data={analytics?.appointments ?? []} color="#059669" />
          )}
        </div>
      </div>

      {/* Top villes */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
        <h2 className="text-[14px] font-semibold text-neutral-900 mb-5">Top 10 villes</h2>
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6" />)}
          </div>
        ) : (
          <HorizontalBars data={analytics?.top_cities ?? []} />
        )}
      </div>
    </div>
  );
}
