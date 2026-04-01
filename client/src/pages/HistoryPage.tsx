import { useEffect, useState } from 'react';
import { authFetch } from '../lib/authFetch';

const COLORS = {
  bg: '#F7F8FA', card: '#FFFFFF', primary: '#2563EB', primaryLight: '#EFF6FF',
  accent: '#10B981', accentLight: '#ECFDF5', danger: '#EF4444', dangerLight: '#FEF2F2',
  warning: '#F59E0B', warningLight: '#FFFBEB', text: '#0F172A', muted: '#64748B',
  border: '#E2E8F0',
};

type HistoryEvent = {
  id: string;
  kind: 'glucose' | 'insulin' | 'meal';
  loggedAt: string;
  summary: string;
  detail: string;
  icon: string;
  badge: 'normal' | 'warning' | 'danger';
};

type Filter = 'today' | '7d' | '30d';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function badgeColor(badge: string, kind: string) {
  if (badge === 'danger') return COLORS.danger;
  if (badge === 'warning') return COLORS.warning;
  if (kind === 'glucose') return COLORS.accent;
  if (kind === 'insulin') return COLORS.primary;
  return COLORS.warning;
}

function badgeBg(badge: string, kind: string) {
  if (badge === 'danger') return COLORS.dangerLight;
  if (badge === 'warning') return COLORS.warningLight;
  if (kind === 'glucose') return COLORS.accentLight;
  if (kind === 'insulin') return COLORS.primaryLight;
  return COLORS.warningLight;
}

export function HistoryPage() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('7d');
  const [kindFilter, setKindFilter] = useState<'all' | 'glucose' | 'insulin' | 'meal'>('all');

  useEffect(() => {
    setLoading(true);
    authFetch<{ events: HistoryEvent[] }>(`/api/history?filter=${filter}`)
      .then((d) => setEvents(d.events))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const visible = kindFilter === 'all' ? events : events.filter((e) => e.kind === kindFilter);

  // Group by date
  const grouped: Map<string, HistoryEvent[]> = new Map();
  for (const evt of visible) {
    const key = formatDate(evt.loggedAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(evt);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: COLORS.text, fontFamily: 'Georgia, serif' }}>
          History
        </h1>
        <p style={{ margin: '4px 0 0', color: COLORS.muted, fontSize: 14 }}>
          All glucose, insulin, and meal entries in one timeline
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Date filter */}
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['today', '7d', '30d'] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: filter === f ? '#fff' : 'transparent', color: filter === f ? COLORS.text : COLORS.muted, boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
              {f === 'today' ? 'Today' : f === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>

        {/* Kind filter */}
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 8, padding: 3, gap: 2 }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'glucose', label: '🩸 Glucose' },
            { id: 'insulin', label: '💉 Insulin' },
            { id: 'meal', label: '🍛 Meals' },
          ].map((item) => (
            <button key={item.id} onClick={() => setKindFilter(item.id as typeof kindFilter)}
              style={{ padding: '6px 12px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', background: kindFilter === item.id ? '#fff' : 'transparent', color: kindFilter === item.id ? COLORS.text : COLORS.muted, boxShadow: kindFilter === item.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
              {item.label}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 13, color: COLORS.muted, marginLeft: 4 }}>
          {visible.length} entr{visible.length === 1 ? 'y' : 'ies'}
        </span>
      </div>

      {/* Timeline */}
      {loading ? (
        <div style={{ color: COLORS.muted, fontSize: 14, padding: '20px 0' }}>Loading history…</div>
      ) : visible.length === 0 ? (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, color: COLORS.text, fontSize: 16 }}>No entries yet</div>
          <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>Start logging glucose, insulin, or meals to see your history here.</div>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([dateLabel, dayEvents]) => (
          <div key={dateLabel}>
            {/* Date header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{dateLabel}</span>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
              <span style={{ fontSize: 12, color: COLORS.muted }}>{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Events for this day */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayEvents.map((evt, idx) => {
                const color = badgeColor(evt.badge, evt.kind);
                const bg = badgeBg(evt.badge, evt.kind);
                const isLast = idx === dayEvents.length - 1;
                return (
                  <div key={evt.id} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                    {/* Timeline stem */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                        {evt.icon}
                      </div>
                      {!isLast && <div style={{ width: 2, flex: 1, background: COLORS.border, margin: '4px 0' }} />}
                    </div>

                    {/* Card */}
                    <div style={{ flex: 1, background: COLORS.card, border: `1px solid ${evt.badge !== 'normal' ? color + '33' : COLORS.border}`, borderRadius: 12, padding: '12px 16px', marginBottom: isLast ? 16 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{evt.summary}</div>
                          {evt.detail && (
                            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 3 }}>{evt.detail}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 12, color: COLORS.muted }}>{formatTime(evt.loggedAt)}</div>
                          {evt.badge !== 'normal' && (
                            <span style={{ fontSize: 10, fontWeight: 700, color, background: bg, border: `1px solid ${color}33`, borderRadius: 4, padding: '1px 6px', marginTop: 4, display: 'inline-block', textTransform: 'uppercase' }}>
                              {evt.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
