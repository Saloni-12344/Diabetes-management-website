import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useState } from 'react';

const TOKEN_KEY = 'diabetes_app_token';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

type InsulinLog = {
  _id: string;
  dose: number;
  insulinType: 'fast' | 'slow';
  loggedAt: string;
  notes?: string;
};

type Filter = 'today' | '7d' | '30d';

const C = {
  card: '#fff',
  bg: '#f7f8fa',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  primary: '#2563eb',
  primaryLight: '#eff6ff',
  success: '#10b981',
  warn: '#f59e0b',
  warnLight: '#fffbeb',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
};

const inputStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontSize: 14,
  outline: 'none',
};

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Request failed');
  return data as T;
}

export function InsulinPage() {
  const [filter, setFilter] = useState<Filter>('today');
  const [logs, setLogs] = useState<InsulinLog[]>([]);
  const [dose, setDose] = useState('');
  const [insulinType, setInsulinType] = useState<'fast' | 'slow'>('fast');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'warn' | 'error'>('success');

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await authFetch<{ logs: InsulinLog[] }>(`/api/insulin?filter=${filter}`);
      setLogs(res.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, [filter]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      const idempotencyKey = `${Date.now()}-${Math.random()}`;
      const res = await authFetch<{ log: InsulinLog; duplicate: boolean }>('/api/insulin', {
        method: 'POST',
        body: JSON.stringify({ dose: Number(dose), insulinType, notes, idempotencyKey }),
      });
      if (res.duplicate) {
        setMsg('Duplicate detected — not logged again');
        setMsgType('warn');
      } else {
        setMsg('Insulin logged successfully');
        setMsgType('success');
      }
      setDose('');
      setNotes('');
      void loadLogs();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
      setMsgType('error');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await authFetch(`/api/insulin/${id}`, { method: 'DELETE' });
      setLogs((prev) => prev.filter((x) => x._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const msgColor = msgType === 'success' ? C.success : msgType === 'warn' ? C.warn : C.danger;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, fontFamily: 'Georgia, serif' }}>💉 Insulin Logs</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 14 }}>Track insulin doses with duplicate protection</p>
      </div>

      <div style={{ background: C.card, borderRadius: 16, padding: 22, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 16 }}>+ New Dose</div>
        <form onSubmit={onAdd} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Dose (units)</label>
            <input type="number" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 4" required min={0} step={0.5} style={{ ...inputStyle, width: 120 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Type</label>
            <select value={insulinType} onChange={(e) => setInsulinType(e.target.value as 'fast' | 'slow')} style={{ ...inputStyle, width: 140 }}>
              <option value="fast">Fast-acting</option>
              <option value="slow">Slow-acting</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. before lunch" style={{ ...inputStyle, width: 200 }} />
          </div>
          <button type="submit" disabled={submitting} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {submitting ? 'Saving...' : 'Log'}
          </button>
        </form>
        {msg && <p style={{ marginTop: 10, fontSize: 13, color: msgColor }}>{msg}</p>}
      </div>

      <div style={{ background: C.card, borderRadius: 16, padding: 22, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>History</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['today', '7d', '30d'] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${filter === f ? C.primary : C.border}`, background: filter === f ? C.primary : 'transparent', color: filter === f ? '#fff' : C.muted, fontSize: 12, fontWeight: 600 }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading && <p style={{ color: C.muted, fontSize: 14 }}>Loading...</p>}
        {!loading && logs.length === 0 && <p style={{ color: C.muted, fontSize: 14 }}>No logs found.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {logs.map((l) => (
            <div key={l._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: C.bg, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: l.insulinType === 'fast' ? C.primaryLight : C.warnLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💉</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: C.text, fontFamily: 'Georgia, serif' }}>
                    {l.dose}u <span style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>{l.insulinType === 'fast' ? 'Fast-acting' : 'Slow-acting'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{new Date(l.loggedAt).toLocaleString()}</div>
                  {l.notes && <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>{l.notes}</div>}
                </div>
              </div>
              <button onClick={() => void onDelete(l._id)} style={{ background: C.dangerLight, color: C.danger, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
