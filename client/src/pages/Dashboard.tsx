import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { io, type Socket } from 'socket.io-client';
import { authFetch } from '../lib/authFetch';

// Lazy-load sub-pages — each loads only when the user navigates to it.
// This keeps the initial JS bundle small and makes the first paint fast.
const AlertsPage  = lazy(() => import('./AlertsPage').then(m => ({ default: m.AlertsPage })));
const FamilyPage  = lazy(() => import('./FamilyPage').then(m => ({ default: m.FamilyPage })));
const GlucosePage = lazy(() => import('./GlucosePage').then(m => ({ default: m.GlucosePage })));
const HistoryPage = lazy(() => import('./HistoryPage').then(m => ({ default: m.HistoryPage })));
const InsulinPage = lazy(() => import('./InsulinPage').then(m => ({ default: m.InsulinPage })));
const MealsPage   = lazy(() => import('./MealsPage').then(m => ({ default: m.MealsPage })));
const MomsKitchen = lazy(() => import('./MomsKitchen').then(m => ({ default: m.MomsKitchen })));

// ── Types ────────────────────────────────────────────────────────────────────

type AuthUser = {
  id: string; name: string; email: string;
  role: 'owner' | 'viewer';
  diabetesType: string;
  targetGlucoseMin: number;
  targetGlucoseMax: number;
};

// ── Design tokens ────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#F7F8FA', sidebar: '#FFFFFF', card: '#FFFFFF',
  primary: '#2563EB', primaryLight: '#EFF6FF',
  accent: '#10B981', accentLight: '#ECFDF5',
  danger: '#EF4444', dangerLight: '#FEF2F2',
  warning: '#F59E0B', warningLight: '#FFFBEB',
  text: '#0F172A', muted: '#64748B', border: '#E2E8F0',
};

const SIDEBAR_W = 220;
const MOBILE_BP = 768;
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const TOKEN_KEY = 'diabetes_app_token';

// ── Hooks ────────────────────────────────────────────────────────────────────

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  role, userName, active, setActive, isMobile, open, onClose, unreadAlerts,
}: {
  role: string; userName: string; active: string;
  setActive: (id: string) => void; isMobile: boolean;
  open: boolean; onClose: () => void; unreadAlerts: number;
}) {
  const ownerNav = [
    { id: 'dashboard', icon: '⬛', label: 'Dashboard' },
    { id: 'glucose', icon: '🩸', label: 'Glucose' },
    { id: 'insulin', icon: '💉', label: 'Insulin' },
    { id: 'meals', icon: '🍛', label: 'Meals' },
    { id: 'kitchen', icon: '🏠', label: "Mom's Kitchen" },
    { id: 'history', icon: '📋', label: 'History' },
    { id: 'alerts', icon: '🔔', label: 'Alerts', badge: unreadAlerts },
    { id: 'family', icon: '👨‍👩‍👦', label: 'Family' },
  ];
  const viewerNav = [
    { id: 'dashboard', icon: '⬛', label: 'Overview' },
    { id: 'glucose', icon: '🩸', label: 'Glucose Logs' },
    { id: 'meals', icon: '🍛', label: 'Meal Logs' },
    { id: 'history', icon: '📋', label: 'History' },
    { id: 'alerts', icon: '🔔', label: 'Alerts', badge: unreadAlerts },
    { id: 'kitchen', icon: '🏠', label: "Mom's Kitchen" },
    { id: 'family', icon: '👨‍👩‍👦', label: 'Family' },
  ];
  const nav = role === 'owner' ? ownerNav : viewerNav;

  if (isMobile && !open) return null;

  function handleNav(id: string) { setActive(id); if (isMobile) onClose(); }

  return (
    <>
      {isMobile && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 19 }} />}
      <aside style={{ width: SIDEBAR_W, background: COLORS.sidebar, borderRight: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', padding: '24px 0', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 20, overflowY: 'auto', boxShadow: isMobile ? '4px 0 24px rgba(0,0,0,0.12)' : 'none', transition: 'transform 0.25s ease' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💊</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text, fontFamily: 'Georgia, serif' }}>GlucoFamily</div>
              <div style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
                {role === 'owner' ? 'My Dashboard' : 'Family View'}
              </div>
            </div>
          </div>
          {isMobile && <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: COLORS.muted }}>✕</button>}
        </div>

        <nav style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map((item) => (
            <button key={item.id} onClick={() => handleNav(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: active === item.id ? COLORS.primaryLight : 'transparent', color: active === item.id ? COLORS.primary : COLORS.muted, fontWeight: active === item.id ? 700 : 500, fontSize: 14, textAlign: 'left', transition: 'all 0.15s', width: '100%' }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                <span style={{ background: COLORS.danger, color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ background: role === 'owner' ? COLORS.primaryLight : COLORS.accentLight, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 2 }}>Logged in as</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.text }}>{userName} ({role})</div>
            <div style={{ fontSize: 11, marginTop: 4, color: role === 'owner' ? COLORS.primary : COLORS.accent, fontWeight: 600 }}>
              {role === 'owner' ? 'Full Access' : 'View Only'}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Small reusable pieces ─────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, colorLight }: { label: string; value: string; sub: string; icon: string; colorLight: string }) {
  return (
    <div style={{ background: COLORS.card, borderRadius: 16, padding: '20px 22px', border: `1px solid ${COLORS.border}`, flex: '1 1 160px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, fontFamily: 'Georgia, serif' }}>{value}</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{sub}</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: colorLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
      </div>
    </div>
  );
}

function GlucoseStatus({ value, min, max }: { value: number; min: number; max: number }) {
  const isHigh = value > max; const isLow = value < min;
  const color = isHigh ? COLORS.danger : isLow ? COLORS.warning : COLORS.accent;
  return <span style={{ color, fontWeight: 700, fontSize: 13 }}>{isHigh ? 'Above Target' : isLow ? 'Below Target' : 'In Range'}</span>;
}

// ── Live Owner Dashboard ──────────────────────────────────────────────────────

type LiveStats = {
  lastGlucose: number | null; lastGlucoseTime: string;
  glucoseTrend: Array<{ time: string; value: number }>;
  todayCarbs: number; todayProtein: number; todayCalories: number; todayFat: number;
  lastInsulinDose: number | null; lastInsulinType: string;
};

const EMPTY_STATS: LiveStats = {
  lastGlucose: null, lastGlucoseTime: '—',
  glucoseTrend: [],
  todayCarbs: 0, todayProtein: 0, todayCalories: 0, todayFat: 0,
  lastInsulinDose: null, lastInsulinType: '—',
};

type LiveFeedItem = { id: string; icon: string; text: string; time: string; badge?: 'warning' | 'danger' };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LiveOwnerDashboard({ user, isMobile, socket }: { user: AuthUser; isMobile: boolean; socket: Socket | null }) {
  const [stats, setStats] = useState<LiveStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [feed, setFeed] = useState<LiveFeedItem[]>([]);

  async function fetchStats() {
    try {
      const [glucoseRes, insulinRes, mealsRes] = await Promise.all([
        authFetch<{ logs: Array<{ id: string; value: number; loggedAt: string }> }>('/api/glucose?filter=7d'),
        authFetch<{ logs: Array<{ id: string; dose: number; insulinType: string; loggedAt: string }> }>('/api/insulin?filter=today'),
        authFetch<{ logs: Array<{ id: string; carbs: number; protein: number; calories: number; fat: number; mealName: string; loggedAt: string }> }>('/api/meals?filter=today'),
      ]);

      const gLogs = glucoseRes.logs;
      const iLogs = insulinRes.logs;
      const mLogs = mealsRes.logs;

      const lastG = gLogs[0] ?? null;
      const lastI = iLogs[0] ?? null;

      // Build chart trend (7 days, oldest→newest)
      const trend = [...gLogs].reverse().slice(-20).map((l) => ({
        time: new Date(l.loggedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        value: l.value,
      }));

      setStats({
        lastGlucose: lastG?.value ?? null,
        lastGlucoseTime: lastG ? timeAgo(lastG.loggedAt) : '—',
        glucoseTrend: trend,
        todayCarbs: Math.round(mLogs.reduce((s, l) => s + l.carbs, 0)),
        todayProtein: Math.round(mLogs.reduce((s, l) => s + l.protein, 0)),
        todayCalories: Math.round(mLogs.reduce((s, l) => s + l.calories, 0)),
        todayFat: Math.round(mLogs.reduce((s, l) => s + l.fat, 0)),
        lastInsulinDose: lastI?.dose ?? null,
        lastInsulinType: lastI?.insulinType ?? '—',
      });

      // Seed the live feed with recent logs from today
      const feedItems: LiveFeedItem[] = [];
      for (const g of gLogs.slice(0, 3)) {
        const badge: LiveFeedItem['badge'] = g.value > 250 || g.value < 54 ? 'danger' : g.value > 180 || g.value < 70 ? 'warning' : undefined;
        feedItems.push({ id: g.id, icon: '🩸', text: `Glucose: ${g.value} mg/dL`, time: timeAgo(g.loggedAt), badge });
      }
      for (const i of iLogs.slice(0, 2)) {
        feedItems.push({ id: i.id, icon: '💉', text: `${i.dose}u ${i.insulinType === 'FAST' ? 'fast' : 'slow'}-acting insulin`, time: timeAgo(i.loggedAt) });
      }
      for (const m of mLogs.slice(0, 2)) {
        feedItems.push({ id: m.id, icon: '🍛', text: `${m.mealName} · ${m.carbs}g carbs`, time: timeAgo(m.loggedAt) });
      }
      feedItems.sort((a, b) => a.time.localeCompare(b.time));
      setFeed(feedItems.slice(0, 6));
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchStats(); }, []);

  // Socket.IO: push new events into the live feed
  useEffect(() => {
    if (!socket) return;

    function pushFeed(icon: string, text: string, badge?: LiveFeedItem['badge']) {
      const item: LiveFeedItem = { id: String(Date.now()), icon, text, time: 'just now', badge };
      setFeed((prev) => [item, ...prev].slice(0, 8));
      // Also refresh stats so numbers update
      void fetchStats();
    }

    socket.on('glucose:new', ({ log }: { log: { value: number } }) => {
      const badge: LiveFeedItem['badge'] = log.value > 250 || log.value < 54 ? 'danger' : log.value > 180 || log.value < 70 ? 'warning' : undefined;
      pushFeed('🩸', `Glucose: ${log.value} mg/dL`, badge);
    });
    socket.on('insulin:new', ({ log }: { log: { dose: number; insulinType: string } }) => {
      pushFeed('💉', `${log.dose}u ${log.insulinType === 'fast' ? 'fast' : 'slow'}-acting insulin`);
    });
    socket.on('meal:new', ({ log }: { log: { mealName: string; carbs: number } }) => {
      pushFeed('🍛', `${log.mealName} · ${log.carbs}g carbs`);
    });

    return () => { socket.off('glucose:new'); socket.off('insulin:new'); socket.off('meal:new'); };
  }, [socket]);

  const target = { min: user.targetGlucoseMin, max: user.targetGlucoseMax };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: COLORS.text, fontFamily: 'Georgia, serif' }}>Hello, {user.name}! 👋</h1>
        <div style={{ color: COLORS.muted, fontSize: 14 }}>Loading your health summary…</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: COLORS.text, fontFamily: 'Georgia, serif' }}>Hello, {user.name}! 👋</h1>
        <div style={{ background: COLORS.warningLight, border: `1px solid ${COLORS.warning}44`, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, color: COLORS.text, fontSize: 14 }}>Couldn't load health data</div>
            <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>Make sure the server is running. Your logs are safe —{' '}
              <span style={{ color: COLORS.primary, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setFetchError(false); setLoading(true); void fetchStats(); }}>retry</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const g = stats;
  const glucoseColor = g.lastGlucose === null ? COLORS.muted
    : g.lastGlucose > target.max ? COLORS.danger
    : g.lastGlucose < target.min ? COLORS.warning : COLORS.accent;

  // Macro pie data
  const macros = [
    { name: 'Carbs', value: g.todayCarbs, fill: COLORS.warning },
    { name: 'Protein', value: g.todayProtein, fill: COLORS.accent },
    { name: 'Fat', value: g.todayFat, fill: COLORS.primary },
  ];
  const totalMacros = g.todayCarbs + g.todayProtein + g.todayFat;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: COLORS.text, fontFamily: 'Georgia, serif' }}>
            Hello, {user.name}! 👋
          </h1>
          <p style={{ margin: '4px 0 0', color: COLORS.muted, fontSize: 14 }}>Here's your health summary</p>
        </div>
        {socket && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLORS.accent, fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.accent, display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Live
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard label="Last Glucose"
          value={g.lastGlucose !== null ? `${g.lastGlucose} mg/dL` : 'No data'}
          sub={g.lastGlucose !== null ? `${g.lastGlucoseTime} · ${g.lastGlucose > target.max ? 'Above target' : g.lastGlucose < target.min ? 'Below target' : 'In range'}` : 'Log your first reading'}
          icon="🩸" colorLight={g.lastGlucose !== null && g.lastGlucose > target.max ? COLORS.dangerLight : COLORS.accentLight} />
        <StatCard label="Last Insulin"
          value={g.lastInsulinDose !== null ? `${g.lastInsulinDose}u` : 'No data'}
          sub={g.lastInsulinDose !== null ? (g.lastInsulinType === 'FAST' ? 'Fast-acting' : 'Slow-acting') : 'Log a dose'}
          icon="💉" colorLight={COLORS.primaryLight} />
        <StatCard label="Today's Carbs" value={`${g.todayCarbs}g`} sub={`${g.todayCalories} kcal total`} icon="🍛" colorLight={COLORS.warningLight} />
        <StatCard label="Today's Protein" value={`${g.todayProtein}g`} sub={`${g.todayFat}g fat`} icon="💪" colorLight={COLORS.accentLight} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

        {/* Glucose trend — Recharts AreaChart */}
        <div style={{ flex: '2 1 300px', background: COLORS.card, borderRadius: 16, padding: 22, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>Glucose Trend (7 days)</div>
            {g.lastGlucose !== null && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: glucoseColor, fontFamily: 'Georgia, serif' }}>{g.lastGlucose}</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>mg/dL · {g.lastGlucoseTime}</div>
              </div>
            )}
          </div>
          {g.glucoseTrend.length > 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={g.glucoseTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="glucoseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={glucoseColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={glucoseColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: COLORS.muted }} />
                <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 12 }}
                  formatter={(v: number) => [`${v} mg/dL`, 'Glucose']}
                />
                {/* Target range reference lines */}
                <Area type="monotone" dataKey="value" stroke={glucoseColor} strokeWidth={2.5}
                  fill="url(#glucoseGrad)" dot={{ r: 3, fill: glucoseColor }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.muted, fontSize: 14 }}>
              No readings in the last 7 days
            </div>
          )}
          {g.lastGlucose !== null && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <GlucoseStatus value={g.lastGlucose} min={target.min} max={target.max} />
              <span style={{ fontSize: 12, color: COLORS.muted }}>· Target: {target.min}–{target.max} mg/dL</span>
            </div>
          )}
        </div>

        {/* Macro donut + bars */}
        <div style={{ flex: '1 1 220px', background: COLORS.card, borderRadius: 16, padding: 22, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 16 }}>Today's Macros</div>
          {totalMacros > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <PieChart width={130} height={130}>
                  <Pie data={macros} cx={65} cy={65} innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {macros.map((m) => <Cell key={m.name} fill={m.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}g`, '']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                {macros.map((m) => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: m.fill, display: 'inline-block' }} />
                    <span style={{ color: COLORS.muted }}>{m.name}: </span>
                    <strong style={{ color: COLORS.text }}>{m.value}g</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.muted, fontSize: 13 }}>
              No meals logged today
            </div>
          )}
          {[
            { label: 'Carbs', value: g.todayCarbs, max: 130, color: COLORS.warning },
            { label: 'Protein', value: g.todayProtein, max: 80, color: COLORS.accent },
            { label: 'Calories', value: g.todayCalories, max: 2000, color: COLORS.primary },
          ].map((m) => (
            <div key={m.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600 }}>{m.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>
                  {m.value}<span style={{ color: COLORS.muted, fontWeight: 400 }}>/{m.max}{m.label === 'Calories' ? ' kcal' : 'g'}</span>
                </span>
              </div>
              <div style={{ height: 7, background: COLORS.border, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%`, height: '100%', background: m.color, transition: 'width 0.5s ease', borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live activity feed */}
      <div style={{ background: COLORS.card, borderRadius: 16, padding: 22, border: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>Recent Activity</div>
          {socket && (
            <span style={{ fontSize: 11, color: COLORS.accent, fontWeight: 600, background: COLORS.accentLight, borderRadius: 6, padding: '3px 8px' }}>
              🟢 Live
            </span>
          )}
        </div>
        {feed.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
            No activity yet — start logging!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {feed.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: item.badge === 'danger' ? COLORS.dangerLight : item.badge === 'warning' ? COLORS.warningLight : '#F8FAFC', border: `1px solid ${item.badge === 'danger' ? COLORS.danger + '33' : item.badge === 'warning' ? COLORS.warning + '33' : COLORS.border}` }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: COLORS.text }}>{item.text}</span>
                <span style={{ fontSize: 11, color: COLORS.muted, flexShrink: 0 }}>{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Viewer Dashboard (live data from /api/viewer/summary) ────────────────────

type ViewerSummary = {
  owner: { name: string; targetGlucoseMin: number; targetGlucoseMax: number; diabetesType: string };
  latestGlucose: { value: number; unit: string; loggedAt: string } | null;
  glucoseTrend: Array<{ value: number; time: string }>;
  latestMeal: { mealName: string; calories: number; carbs: number; protein: number; fat: number; loggedAt: string } | null;
  latestInsulin: { dose: number; insulinType: string; loggedAt: string } | null;
  recentAlerts: Array<{ id: string; type: string; message: string; triggeredAt: string }>;
  todayStats: { glucoseReadings: number; mealsLogged: number };
};

function AlertBadge({ type }: { type: string }) {
  const c = type === 'HIGH_GLUCOSE' || type === 'LOW_GLUCOSE' ? COLORS.danger : COLORS.warning;
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, marginRight: 8, marginTop: 2 }} />;
}

function ViewerDashboard({ viewerName, isMobile }: { viewerName: string; isMobile: boolean }) {
  const [summary, setSummary] = useState<ViewerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch<ViewerSummary>('/api/viewer/summary')
      .then((d) => { setSummary(d); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : 'Failed to load'); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: COLORS.muted, fontSize: 14 }}>
        Loading health data…
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div style={{ background: COLORS.dangerLight, border: `1px solid ${COLORS.danger}33`, borderRadius: 16, padding: 24, color: COLORS.danger, fontSize: 14 }}>
        {error ?? 'Could not load health summary. Make sure you are an accepted family member.'}
      </div>
    );
  }

  const { owner, latestGlucose, glucoseTrend, latestMeal, latestInsulin, recentAlerts, todayStats } = summary;
  const glucoseVal = latestGlucose?.value ?? null;
  const glucoseColor = glucoseVal === null ? COLORS.muted
    : glucoseVal > owner.targetGlucoseMax ? COLORS.danger
    : glucoseVal < owner.targetGlucoseMin ? COLORS.warning : COLORS.accent;
  const glucoseLabel = glucoseVal === null ? '—'
    : glucoseVal > owner.targetGlucoseMax ? 'Above target'
    : glucoseVal < owner.targetGlucoseMin ? 'Below target' : 'In range';
  const ownerInitial = owner.name.charAt(0).toUpperCase();
  const trendData = glucoseTrend.map((g) => ({
    time: new Date(g.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: g.value,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: COLORS.text, fontFamily: 'Georgia, serif' }}>
          Hello, {viewerName}! 👀
        </h1>
        <p style={{ margin: '4px 0 0', color: COLORS.muted, fontSize: 14 }}>
          Monitoring <strong>{owner.name}</strong>'s health · {owner.diabetesType} diabetes
        </p>
      </div>

      {/* Glucose hero banner */}
      <div style={{ background: glucoseVal !== null && glucoseVal > owner.targetGlucoseMax ? COLORS.dangerLight : COLORS.accentLight, border: `1.5px solid ${glucoseVal !== null && glucoseVal > owner.targetGlucoseMax ? COLORS.danger : COLORS.accent}`, borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: glucoseColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', fontWeight: 800 }}>{ownerInitial}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>{owner.name}</div>
            {glucoseVal !== null
              ? <GlucoseStatus value={glucoseVal} min={owner.targetGlucoseMin} max={owner.targetGlucoseMax} />
              : <span style={{ fontSize: 12, color: COLORS.muted }}>No readings yet</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {glucoseVal !== null ? (
            <>
              <div style={{ fontSize: 32, fontWeight: 800, color: glucoseColor, fontFamily: 'Georgia, serif' }}>
                {glucoseVal} <span style={{ fontSize: 14, fontWeight: 500 }}>{latestGlucose!.unit}</span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>{timeAgo(latestGlucose!.loggedAt)} · {glucoseLabel}</div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: COLORS.muted }}>No data</div>
          )}
        </div>
      </div>

      {/* Stat cards row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard
          label="Last Glucose"
          value={glucoseVal !== null ? `${glucoseVal} ${latestGlucose!.unit}` : 'No data'}
          sub={glucoseVal !== null ? timeAgo(latestGlucose!.loggedAt) : '—'}
          icon="🩸"
          colorLight={glucoseVal !== null && glucoseVal > owner.targetGlucoseMax ? COLORS.dangerLight : COLORS.accentLight} />
        <StatCard
          label="Target Range"
          value={`${owner.targetGlucoseMin}–${owner.targetGlucoseMax}`}
          sub="mg/dL"
          icon="🎯"
          colorLight={COLORS.primaryLight} />
        <StatCard
          label="Today's Readings"
          value={String(todayStats.glucoseReadings)}
          sub="glucose logs today"
          icon="📊"
          colorLight={COLORS.accentLight} />
        <StatCard
          label="Today's Meals"
          value={String(todayStats.mealsLogged)}
          sub="meals logged today"
          icon="🍛"
          colorLight={COLORS.warningLight} />
      </div>

      {/* Glucose trend chart */}
      {trendData.length > 0 && (
        <div style={{ background: COLORS.card, borderRadius: 16, padding: 22, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 16 }}>Glucose Trend (7 days)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="vg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: COLORS.muted }} />
              <YAxis tick={{ fontSize: 11, fill: COLORS.muted }} />
              <Tooltip formatter={(v: number) => [`${v} mg/dL`, 'Glucose']} />
              <Area type="monotone" dataKey="value" stroke={COLORS.primary} fill="url(#vg2)" strokeWidth={2} dot={{ r: 3, fill: COLORS.primary }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Latest meal + insulin row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {latestMeal && (
          <div style={{ flex: '1 1 240px', background: COLORS.card, borderRadius: 16, padding: 20, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, marginBottom: 10 }}>Last Meal 🍛</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{latestMeal.mealName}</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{timeAgo(latestMeal.loggedAt)}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              {[['Carbs', `${latestMeal.carbs}g`], ['Protein', `${latestMeal.protein}g`], ['Fat', `${latestMeal.fat}g`], ['Cal', `${latestMeal.calories}`]].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{v}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {latestInsulin && (
          <div style={{ flex: '1 1 200px', background: COLORS.card, borderRadius: 16, padding: 20, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, marginBottom: 10 }}>Last Insulin 💉</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.primary, fontFamily: 'Georgia, serif' }}>{latestInsulin.dose}<span style={{ fontSize: 14 }}>u</span></div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>
              {latestInsulin.insulinType === 'fast' ? 'Fast-acting' : 'Slow-acting'} · {timeAgo(latestInsulin.loggedAt)}
            </div>
          </div>
        )}
      </div>

      {/* Recent alerts */}
      {recentAlerts.length > 0 && (
        <div style={{ background: COLORS.card, borderRadius: 16, padding: 22, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 16 }}>Recent Alerts</div>
          {recentAlerts.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: a.type === 'HIGH_GLUCOSE' || a.type === 'LOW_GLUCOSE' ? COLORS.dangerLight : COLORS.warningLight, marginBottom: 8 }}>
              <AlertBadge type={a.type} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{a.message}</div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{timeAgo(a.triggeredAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {recentAlerts.length === 0 && (
        <div style={{ background: COLORS.accentLight, border: `1px solid ${COLORS.accent}33`, borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div style={{ fontSize: 13, color: COLORS.accent, fontWeight: 600 }}>No unread alerts — {owner.name} is doing well!</div>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard shell ──────────────────────────────────────────────────────

type DashboardProps = { user: AuthUser; onLogout: () => void };

export function Dashboard({ user, onLogout }: DashboardProps) {
  const role = user.role;
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const width = useWindowWidth();
  const isMobile = width < MOBILE_BP;

  useEffect(() => { if (!isMobile) setSidebarOpen(false); }, [isMobile]);

  // Load unread alert count
  useEffect(() => {
    authFetch<{ count: number }>('/api/alerts/unread-count')
      .then((d) => setUnreadAlerts(d.count))
      .catch(() => {});
  }, [activeNav]); // refresh whenever tab changes

  // Socket.IO connection
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const socket = io(API_BASE, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    // On any new event, re-fetch unread count
    socket.on('glucose:new', () => setUnreadAlerts((c) => c)); // stats only
    socket.on('alert:new', () => {
      setUnreadAlerts((c) => c + 1);
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, []);

  function ComingSoon({ title }: { title: string }) {
    return (
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
        <h2 style={{ margin: '0 0 8px', color: COLORS.text, fontFamily: 'Georgia, serif' }}>{title}</h2>
        <p style={{ margin: 0, color: COLORS.muted, fontSize: 14 }}>Coming soon.</p>
      </div>
    );
  }

  function renderContent() {
    if (activeNav === 'dashboard') {
      return role === 'owner'
        ? <LiveOwnerDashboard user={user} isMobile={isMobile} socket={socketRef.current} />
        : <ViewerDashboard viewerName={user.name} isMobile={isMobile} />;
    }
    if (activeNav === 'glucose') return <GlucosePage />;
    if (activeNav === 'insulin') return role === 'owner' ? <InsulinPage /> : <ComingSoon title="Insulin" />;
    if (activeNav === 'meals') return <MealsPage />;
    if (activeNav === 'kitchen') return <MomsKitchen />;
    if (activeNav === 'history') return <HistoryPage />;
    if (activeNav === 'alerts') return <AlertsPage />;
    if (activeNav === 'family') return <FamilyPage role={role} userName={user.name} />;
    return role === 'owner'
      ? <LiveOwnerDashboard user={user} isMobile={isMobile} socket={socketRef.current} />
      : <ViewerDashboard viewerName={user.name} isMobile={isMobile} />;
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: COLORS.bg, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <Sidebar
        role={role} userName={user.name} active={activeNav} setActive={setActiveNav}
        isMobile={isMobile} open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        unreadAlerts={unreadAlerts}
      />

      {isMobile && (
        <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 15 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: COLORS.text, lineHeight: 1, padding: 4 }}>☰</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💊</div>
            <span style={{ fontWeight: 800, fontSize: 15, color: COLORS.text, fontFamily: 'Georgia, serif' }}>GlucoFamily</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unreadAlerts > 0 && (
              <button onClick={() => setActiveNav('alerts')} style={{ background: COLORS.danger, color: '#fff', border: 'none', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {unreadAlerts}
              </button>
            )}
            <button onClick={onLogout} style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: COLORS.muted, cursor: 'pointer' }}>Out</button>
          </div>
        </header>
      )}

      <main style={{ marginLeft: isMobile ? 0 : SIDEBAR_W, padding: isMobile ? '72px 16px 24px' : '28px 32px', minHeight: '100vh', boxSizing: 'border-box' }}>
        {!isMobile && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: COLORS.muted }}>Signed in as <strong style={{ color: COLORS.text }}>{user.name}</strong></span>
            {unreadAlerts > 0 && (
              <button onClick={() => setActiveNav('alerts')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: COLORS.dangerLight, border: `1px solid ${COLORS.danger}33`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: COLORS.danger, cursor: 'pointer' }}>
                🔔 {unreadAlerts} alert{unreadAlerts !== 1 ? 's' : ''}
              </button>
            )}
            <button onClick={onLogout} style={{ padding: '7px 16px', borderRadius: 8, border: `1.5px solid ${COLORS.border}`, background: '#fff', color: COLORS.muted, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Sign Out</button>
          </div>
        )}
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: COLORS.muted, fontSize: 14 }}>
            Loading…
          </div>
        }>
          {renderContent()}
        </Suspense>
      </main>
    </div>
  );
}
