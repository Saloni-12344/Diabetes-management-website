import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useState } from 'react';

const TOKEN_KEY = 'diabetes_app_token';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

type MealLog = {
  _id: string;
  mealName: string;
  grams: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  isCooked: boolean;
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
  width: '100%',
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

export function MealsPage() {
  const [filter, setFilter] = useState<Filter>('today');
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [formMsg, setFormMsg] = useState('');
  const [formMsgType, setFormMsgType] = useState<'success' | 'error'>('success');

  const [mealName, setMealName] = useState('');
  const [grams, setGrams] = useState('');
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [isCooked, setIsCooked] = useState(true);
  const [notes, setNotes] = useState('');

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await authFetch<{ logs: MealLog[] }>(`/api/meals?filter=${filter}`);
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
    setAlertMsg('');
    setFormMsg('');
    try {
      const res = await authFetch<{ alerts: Array<{ message: string }> }>('/api/meals', {
        method: 'POST',
        body: JSON.stringify({
          mealName,
          grams: Number(grams),
          calories: Number(calories),
          carbs: Number(carbs),
          protein: Number(protein),
          fat: Number(fat),
          isCooked,
          notes,
        }),
      });
      if (res.alerts?.length > 0) setAlertMsg(res.alerts[0].message);
      setMealName('');
      setGrams('');
      setCalories('');
      setCarbs('');
      setProtein('');
      setFat('');
      setNotes('');
      setFormMsg('Meal logged successfully');
      setFormMsgType('success');
      void loadLogs();
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : 'Failed');
      setFormMsgType('error');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await authFetch(`/api/meals/${id}`, { method: 'DELETE' });
      setLogs((prev) => prev.filter((x) => x._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, fontFamily: 'Georgia, serif' }}>🍛 Meal Logs</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 14 }}>Log food with calories and macros</p>
      </div>

      {alertMsg && (
        <div style={{ background: C.warnLight, border: `1px solid ${C.warn}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: C.warn, fontWeight: 600 }}>
          ⚠️ {alertMsg}
        </div>
      )}

      <div style={{ background: C.card, borderRadius: 16, padding: 22, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 16 }}>+ Log Meal</div>
        <form onSubmit={onAdd}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Meal Name</label>
              <input value={mealName} onChange={(e) => setMealName(e.target.value)} required placeholder="e.g. Dal Chawal" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Grams</label>
              <input type="number" value={grams} onChange={(e) => setGrams(e.target.value)} required min={0.1} step={0.1} placeholder="e.g. 250" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Calories</label>
              <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} required min={0} placeholder="e.g. 340" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Carbs (g)</label>
              <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} required min={0} placeholder="e.g. 60" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Protein (g)</label>
              <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} required min={0} placeholder="e.g. 12" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Fat (g)</label>
              <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} required min={0} placeholder="e.g. 8" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: C.muted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={isCooked} onChange={(e) => setIsCooked(e.target.checked)} />
              Cooked food
            </label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inputStyle, flex: 1 }} />
          </div>
          <button type="submit" disabled={submitting} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {submitting ? 'Saving...' : 'Log Meal'}
          </button>
        </form>
        {formMsg && <p style={{ marginTop: 10, fontSize: 13, color: formMsgType === 'success' ? C.success : C.danger }}>{formMsg}</p>}
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
        {!loading && logs.length === 0 && <p style={{ color: C.muted, fontSize: 14 }}>No meals logged.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {logs.map((l) => (
            <div key={l._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: C.bg, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: C.warnLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍛</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{l.mealName}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{l.grams}g · {l.calories} kcal · C: {l.carbs}g · P: {l.protein}g · F: {l.fat}g</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{l.isCooked ? 'Cooked' : 'Raw'} · {new Date(l.loggedAt).toLocaleString()}</div>
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
