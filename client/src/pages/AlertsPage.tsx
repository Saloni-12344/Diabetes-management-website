import { useEffect, useState } from 'react';
import { authFetch } from '../lib/authFetch';

const COLORS = {
  bg: '#F7F8FA', card: '#FFFFFF', primary: '#2563EB', primaryLight: '#EFF6FF',
  accent: '#10B981', accentLight: '#ECFDF5', danger: '#EF4444', dangerLight: '#FEF2F2',
  warning: '#F59E0B', warningLight: '#FFFBEB', text: '#0F172A', muted: '#64748B',
  border: '#E2E8F0',
};

type Alert = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  triggeredAt: string;
  relatedLogId: string | null;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function alertMeta(type: string): { icon: string; color: string; bg: string; label: string } {
  switch (type) {
    case 'critical_glucose': return { icon: '🚨', color: COLORS.danger, bg: COLORS.dangerLight, label: 'Critical' };
    case 'high_carb_low_protein': return { icon: '⚠️', color: COLORS.warning, bg: COLORS.warningLight, label: 'Warning' };
    case 'post_meal_walk': return { icon: '🚶', color: COLORS.primary, bg: COLORS.primaryLight, label: 'Reminder' };
    case 'pattern': return { icon: '📊', color: COLORS.accent, bg: COLORS.accentLight, label: 'Pattern' };
    default: return { icon: '🔔', color: COLORS.muted, bg: '#F1F5F9', label: 'Info' };
  }
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await authFetch<{ alerts: Alert[] }>(
        `/api/alerts${filter === 'unread' ? '?unread=true' : ''}`
      );
      setAlerts(data.alerts);
    } catch {
      // authFetch handles 401
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [filter]);

  async function markRead(id: string) {
    try {
      await authFetch(`/api/alerts/${id}/read`, { method: 'PATCH' });
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, isRead: true } : a));
    } catch { /* ignore */ }
  }

  async function deleteAlert(id: string) {
    try {
      await authFetch(`/api/alerts/${id}`, { method: 'DELETE' });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await authFetch('/api/alerts/mark-all-read', { method: 'POST' });
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    } catch { /* ignore */ } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: COLORS.text, fontFamily: 'Georgia, serif' }}>
            Alerts
          </h1>
          <p style={{ margin: '4px 0 0', color: COLORS.muted, fontSize: 14 }}>
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              disabled={markingAll}
              style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${COLORS.border}`, background: '#fff', color: COLORS.muted, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
          {/* Filter tabs */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 8, padding: 3, gap: 2 }}>
            {(['all', 'unread'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: filter === f ? '#fff' : 'transparent', color: filter === f ? COLORS.text : COLORS.muted, boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                {f === 'all' ? 'All' : 'Unread'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert list */}
      {loading ? (
        <div style={{ color: COLORS.muted, fontSize: 14, padding: '20px 0' }}>Loading alerts…</div>
      ) : alerts.length === 0 ? (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔕</div>
          <div style={{ fontWeight: 700, color: COLORS.text, fontSize: 16 }}>
            {filter === 'unread' ? 'No unread alerts' : 'No alerts yet'}
          </div>
          <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>
            Alerts appear here when glucose is critical or meals are flagged.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map((alert) => {
            const meta = alertMeta(alert.type);
            return (
              <div key={alert.id}
                style={{ background: alert.isRead ? COLORS.card : meta.bg, border: `1.5px solid ${alert.isRead ? COLORS.border : meta.color + '44'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, transition: 'all 0.2s' }}>
                {/* Icon */}
                <div style={{ width: 40, height: 40, borderRadius: 12, background: meta.bg, border: `1.5px solid ${meta.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {meta.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.color}33`, borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {meta.label}
                    </span>
                    {!alert.isRead && (
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: alert.isRead ? 400 : 600, color: COLORS.text, lineHeight: 1.4 }}>
                    {alert.message}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 5 }}>
                    {timeAgo(alert.triggeredAt)}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {!alert.isRead && (
                    <button onClick={() => void markRead(alert.id)}
                      style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: COLORS.muted, cursor: 'pointer' }}>
                      Read
                    </button>
                  )}
                  <button onClick={() => void deleteAlert(alert.id)}
                    style={{ background: 'none', border: `1px solid ${COLORS.dangerLight}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: COLORS.danger, cursor: 'pointer' }}>
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
