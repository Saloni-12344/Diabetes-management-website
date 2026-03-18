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

const cardStyle: CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 16,
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
  const [error, setError] = useState('');

  async function loadLogs(): Promise<void> {
    try {
      setError('');
      const res = await authFetch<{ logs: InsulinLog[] }>(`/api/insulin?filter=${filter}`);
      setLogs(res.logs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load logs');
    }
  }

  useEffect(() => {
    void loadLogs();
  }, [filter]);

  async function submitLog(e: FormEvent): Promise<void> {
    e.preventDefault();
    try {
      await authFetch('/api/insulin', {
        method: 'POST',
        body: JSON.stringify({
          dose: Number(dose),
          insulinType,
          notes,
          idempotencyKey: `${Date.now()}-${Math.random()}`,
        }),
      });
      setDose('');
      setNotes('');
      await loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function deleteLog(id: string): Promise<void> {
    await authFetch(`/api/insulin/${id}`, { method: 'DELETE' });
    setLogs((prev) => prev.filter((x) => x._id !== id));
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Insulin</h2>
        <form onSubmit={submitLog} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="number"
            min={0}
            step={0.5}
            placeholder="Dose"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            required
          />
          <select value={insulinType} onChange={(e) => setInsulinType(e.target.value as 'fast' | 'slow')}>
            <option value="fast">Fast</option>
            <option value="slow">Slow</option>
          </select>
          <input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button type="submit">Add</button>
        </form>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['today', '7d', '30d'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ fontWeight: filter === f ? 700 : 500 }}>
              {f}
            </button>
          ))}
        </div>

        {error && <p style={{ color: '#ef4444' }}>{error}</p>}
        {logs.map((log) => (
          <div key={log._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <div>
              <strong>
                {log.dose}u {log.insulinType}
              </strong>{' '}
              <span>{new Date(log.loggedAt).toLocaleString()}</span>
              {log.notes ? <div>{log.notes}</div> : null}
            </div>
            <button onClick={() => void deleteLog(log._id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
