import { useState } from 'react';

const COLORS = {
  bg: '#F7F8FA',
  sidebar: '#FFFFFF',
  card: '#FFFFFF',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  accent: '#10B981',
  accentLight: '#ECFDF5',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
};

const MOCK_OWNER = {
  name: 'Rohan',
  role: 'owner',
  lastGlucose: 142,
  lastGlucoseTime: '2h ago',
  glucoseTarget: { min: 70, max: 180 },
  currentIOB: 1.4,
  todayCarbs: 68,
  todayProtein: 42,
  todayCalories: 1240,
  alerts: [
    { id: 1, type: 'danger', message: 'Glucose above target: 142 mg/dL', time: '2h ago' },
    { id: 2, type: 'warning', message: 'High carb meal detected — low protein', time: '1h ago' },
    { id: 3, type: 'info', message: 'Post-meal walk reminder', time: '45m ago' },
  ],
  glucoseTrend: [88, 95, 110, 142, 138, 125, 118, 142],
  recentLogs: [
    { type: 'glucose', value: '142 mg/dL', time: '2h ago', icon: '🩸' },
    { type: 'meal', value: 'Dal Chawal · 68g carbs', time: '1h ago', icon: '🍛' },
    { type: 'insulin', value: '4u Fast-acting', time: '1h ago', icon: '💉' },
  ],
};

const MOCK_VIEWER = {
  name: 'Mom',
  role: 'viewer',
  watching: 'Rohan',
  lastGlucose: 142,
  lastGlucoseTime: '2h ago',
  glucoseTarget: { min: 70, max: 180 },
  currentIOB: 1.4,
  alerts: [
    { id: 1, type: 'danger', message: "Rohan's glucose is above target: 142 mg/dL", time: '2h ago' },
    { id: 2, type: 'warning', message: 'High carb meal detected', time: '1h ago' },
  ],
  glucoseTrend: [88, 95, 110, 142, 138, 125, 118, 142],
};

function GlucoseStatus({ value, min, max }: { value: number; min: number; max: number }) {
  const isHigh = value > max;
  const isLow = value < min;
  const color = isHigh ? COLORS.danger : isLow ? COLORS.warning : COLORS.accent;
  const label = isHigh ? 'Above Target' : isLow ? 'Below Target' : 'In Range';
  return <span style={{ color, fontWeight: 700, fontSize: 13 }}>{label}</span>;
}

function MiniChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const h = 48;
  const w = 180;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        fill="none"
        stroke={COLORS.primary}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / (max - min || 1)) * h;
        return i === data.length - 1 ? <circle key={i} cx={x} cy={y} r="4" fill={COLORS.primary} /> : null;
      })}
    </svg>
  );
}

function AlertBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#2563EB',
  };
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: map[type] || map.info,
        display: 'inline-block',
        marginRight: 8,
        flexShrink: 0,
      }}
    />
  );
}

function Sidebar({
  role,
  active,
  setActive,
}: {
  role: string;
  active: string;
  setActive: (id: string) => void;
}) {
  const ownerNav = [
    { id: 'dashboard', icon: '⬛', label: 'Dashboard' },
    { id: 'glucose', icon: '🩸', label: 'Glucose' },
    { id: 'insulin', icon: '💉', label: 'Insulin' },
    { id: 'meals', icon: '🍛', label: 'Meals' },
    { id: 'kitchen', icon: '🏠', label: "Mom's Kitchen" },
    { id: 'alerts', icon: '🔔', label: 'Alerts' },
    { id: 'calculator', icon: '🧮', label: 'Dose Calculator' },
    { id: 'family', icon: '👨‍👩‍👦', label: 'Family' },
  ];

  const viewerNav = [
    { id: 'dashboard', icon: '⬛', label: 'Overview' },
    { id: 'glucose', icon: '🩸', label: 'Glucose Logs' },
    { id: 'meals', icon: '🍛', label: 'Meal Logs' },
    { id: 'alerts', icon: '🔔', label: 'Alerts' },
    { id: 'kitchen', icon: '🏠', label: "Mom's Kitchen" },
  ];

  const nav = role === 'owner' ? ownerNav : viewerNav;

  return (
    <aside
      style={{
        width: 220,
        background: COLORS.sidebar,
        borderRight: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 10,
      }}
    >
      <div style={{ padding: '0 20px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: COLORS.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            💊
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text, fontFamily: 'Georgia, serif' }}>
              GlucoFamily
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
              {role === 'owner' ? 'My Dashboard' : 'Family View'}
            </div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              background: active === item.id ? COLORS.primaryLight : 'transparent',
              color: active === item.id ? COLORS.primary : COLORS.muted,
              fontWeight: active === item.id ? 700 : 500,
              fontSize: 14,
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: `1px solid ${COLORS.border}` }}>
        <div
          style={{
            background: role === 'owner' ? COLORS.primaryLight : COLORS.accentLight,
            borderRadius: 10,
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 2 }}>Logged in as</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.text }}>
            {role === 'owner' ? 'Rohan (Owner)' : 'Mom (Viewer)'}
          </div>
          <div
            style={{
              fontSize: 11,
              marginTop: 4,
              color: role === 'owner' ? COLORS.primary : COLORS.accent,
              fontWeight: 600,
            }}
          >
            {role === 'owner' ? 'Full Access' : 'View Only'}
          </div>
        </div>
      </div>
    </aside>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  colorLight,
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  colorLight: string;
}) {
  return (
    <div
      style={{
        background: COLORS.card,
        borderRadius: 16,
        padding: '20px 22px',
        border: `1px solid ${COLORS.border}`,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontSize: 12,
              color: COLORS.muted,
              fontWeight: 600,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, fontFamily: 'Georgia, serif' }}>
            {value}
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{sub}</div>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: colorLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function OwnerDashboard({ data }: { data: typeof MOCK_OWNER }) {
  const glucoseColor =
    data.lastGlucose > data.glucoseTarget.max
      ? COLORS.danger
      : data.lastGlucose < data.glucoseTarget.min
      ? COLORS.warning
      : COLORS.accent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: COLORS.text, fontFamily: 'Georgia, serif' }}>
            Hello, {data.name}! 👋
          </h1>
          <p style={{ margin: '4px 0 0', color: COLORS.muted, fontSize: 14 }}>
            Here&apos;s your health summary for today
          </p>
        </div>
        <button
          style={{
            background: COLORS.primary,
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '10px 20px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          + Log Now
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <StatCard
          label="Last Glucose"
          value={`${data.lastGlucose} mg/dL`}
          sub={`${data.lastGlucoseTime} · ${data.lastGlucose > data.glucoseTarget.max ? 'Above target' : 'In range'}`}
          icon="🩸"
          colorLight={data.lastGlucose > data.glucoseTarget.max ? COLORS.dangerLight : COLORS.accentLight}
        />
        <StatCard
          label="Current IOB"
          value={`${data.currentIOB}u`}
          sub="Insulin on board"
          icon="💉"
          colorLight={COLORS.primaryLight}
        />
        <StatCard
          label="Today's Carbs"
          value={`${data.todayCarbs}g`}
          sub={`${data.todayCalories} kcal total`}
          icon="🍛"
          colorLight={COLORS.warningLight}
        />
        <StatCard
          label="Today's Protein"
          value={`${data.todayProtein}g`}
          sub="Macros logged"
          icon="💪"
          colorLight={COLORS.accentLight}
        />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1.5, background: COLORS.card, borderRadius: 16, padding: 22, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 16 }}>Glucose Trend</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
            <MiniChart data={data.glucoseTrend} />
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: glucoseColor, fontFamily: 'Georgia, serif' }}>{data.lastGlucose}</div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>mg/dL</div>
              <GlucoseStatus value={data.lastGlucose} min={data.glucoseTarget.min} max={data.glucoseTarget.max} />
              <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>
                Target: {data.glucoseTarget.min}–{data.glucoseTarget.max}
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, background: COLORS.card, borderRadius: 16, padding: 22, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 16 }}>Today&apos;s Macros</div>
          {[
            { label: 'Carbs', value: data.todayCarbs, max: 130, color: COLORS.warning },
            { label: 'Protein', value: data.todayProtein, max: 80, color: COLORS.accent },
            { label: 'Calories', value: data.todayCalories, max: 2000, color: COLORS.primary },
          ].map((m) => (
            <div key={m.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: COLORS.muted, fontWeight: 600 }}>{m.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>
                  {m.value}
                  <span style={{ color: COLORS.muted, fontWeight: 400 }}>
                    /{m.max}
                    {m.label === 'Calories' ? ' kcal' : 'g'}
                  </span>
                </span>
              </div>
              <div style={{ height: 8, background: COLORS.border, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%`, height: '100%', background: m.color }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, background: COLORS.card, borderRadius: 16, padding: 22, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 16 }}>Alerts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background:
                    a.type === 'danger'
                      ? COLORS.dangerLight
                      : a.type === 'warning'
                      ? COLORS.warningLight
                      : COLORS.primaryLight,
                }}
              >
                <AlertBadge type={a.type} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{a.message}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewerDashboard({ data }: { data: typeof MOCK_VIEWER }) {
  const glucoseColor =
    data.lastGlucose > data.glucoseTarget.max
      ? COLORS.danger
      : data.lastGlucose < data.glucoseTarget.min
      ? COLORS.warning
      : COLORS.accent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: COLORS.text, fontFamily: 'Georgia, serif' }}>
          Hello, {data.name}! 👀
        </h1>
        <p style={{ margin: '4px 0 0', color: COLORS.muted, fontSize: 14 }}>
          Monitoring <strong>{data.watching}</strong>&apos;s health in real-time
        </p>
      </div>

      <div
        style={{
          background: data.lastGlucose > data.glucoseTarget.max ? COLORS.dangerLight : COLORS.accentLight,
          border: `1.5px solid ${data.lastGlucose > data.glucoseTarget.max ? COLORS.danger : COLORS.accent}`,
          borderRadius: 16,
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: glucoseColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: '#fff',
              fontWeight: 800,
            }}
          >
            R
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>{data.watching}</div>
            <GlucoseStatus value={data.lastGlucose} min={data.glucoseTarget.min} max={data.glucoseTarget.max} />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: glucoseColor, fontFamily: 'Georgia, serif' }}>
            {data.lastGlucose} <span style={{ fontSize: 14, fontWeight: 500 }}>mg/dL</span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>{data.lastGlucoseTime}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <StatCard label="Glucose" value={`${data.lastGlucose} mg/dL`} sub={data.lastGlucoseTime} icon="🩸" colorLight={COLORS.dangerLight} />
        <StatCard label="IOB" value={`${data.currentIOB}u`} sub="Insulin on board" icon="💉" colorLight={COLORS.primaryLight} />
        <StatCard
          label="Target Range"
          value={`${data.glucoseTarget.min}–${data.glucoseTarget.max}`}
          sub="mg/dL"
          icon="🎯"
          colorLight={COLORS.accentLight}
        />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1.5, background: COLORS.card, borderRadius: 16, padding: 22, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 16 }}>
            {data.watching}&apos;s Glucose Trend
          </div>
          <MiniChart data={data.glucoseTrend} />
        </div>

        <div style={{ flex: 1, background: COLORS.card, borderRadius: 16, padding: 22, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 16 }}>Active Alerts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: a.type === 'danger' ? COLORS.dangerLight : COLORS.warningLight,
                }}
              >
                <AlertBadge type={a.type} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{a.message}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [role, setRole] = useState<'owner' | 'viewer'>('owner');
  const [activeNav, setActiveNav] = useState('dashboard');

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: COLORS.bg, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <Sidebar role={role} active={activeNav} setActive={setActiveNav} />

      <main style={{ marginLeft: 220, padding: '28px 32px', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, gap: 8 }}>
          <span style={{ fontSize: 12, color: COLORS.muted, alignSelf: 'center' }}>Demo role:</span>
          {(['owner', 'viewer'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: `1.5px solid ${role === r ? COLORS.primary : COLORS.border}`,
                background: role === r ? COLORS.primary : '#fff',
                color: role === r ? '#fff' : COLORS.muted,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {role === 'owner' ? <OwnerDashboard data={MOCK_OWNER} /> : <ViewerDashboard data={MOCK_VIEWER} />}
      </main>
    </div>
  );
}
