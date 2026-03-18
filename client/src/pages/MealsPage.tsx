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

export function MealsPage() {
  const [filter, setFilter] = useState<Filter>('today');
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [mealName, setMealName] = useState('');
  const [grams, setGrams] = useState('');
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [notes, setNotes] = useState('');
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');

  async function loadLogs(): Promise<void> {
    try {
      setError('');
      const res = await authFetch<{ logs: MealLog[] }>(`/api/meals?filter=${filter}`);
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
      const res = await authFetch<{ alerts: Array<{ message: string }> }>('/api/meals', {
        method: 'POST',
        body: JSON.stringify({
          mealName,
          grams: Number(grams),
          calories: Number(calories),
          carbs: Number(carbs),
          protein: Number(protein),
          fat: Number(fat),
          notes,
        }),
      });
      setWarning(res.alerts?.[0]?.message || '');
      setMealName('');
      setGrams('');
      setCalories('');
      setCarbs('');
      setProtein('');
      setFat('');
      setNotes('');
      await loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function deleteLog(id: string): Promise<void> {
    await authFetch(`/api/meals/${id}`, { method: 'DELETE' });
    setLogs((prev) => prev.filter((x) => x._id !== id));
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Meals</h2>
        <form onSubmit={submitLog} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <input placeholder="Meal name" value={mealName} onChange={(e) => setMealName(e.target.value)} required />
          <input type="number" min={0.1} step={0.1} placeholder="Grams" value={grams} onChange={(e) => setGrams(e.target.value)} required />
          <input type="number" min={0} placeholder="Calories" value={calories} onChange={(e) => setCalories(e.target.value)} required />
          <input type="number" min={0} placeholder="Carbs" value={carbs} onChange={(e) => setCarbs(e.target.value)} required />
          <input type="number" min={0} placeholder="Protein" value={protein} onChange={(e) => setProtein(e.target.value)} required />
          <input type="number" min={0} placeholder="Fat" value={fat} onChange={(e) => setFat(e.target.value)} required />
          <input style={{ gridColumn: '1 / span 2' }} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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

        {warning && <p style={{ color: '#d97706' }}>{warning}</p>}
        {error && <p style={{ color: '#ef4444' }}>{error}</p>}

        {logs.map((log) => (
          <div key={log._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <div>
              <strong>{log.mealName}</strong>
              <div>
                {log.grams}g | {log.calories} kcal | C {log.carbs} / P {log.protein} / F {log.fat}
              </div>
              <small>{new Date(log.loggedAt).toLocaleString()}</small>
            </div>
            <button onClick={() => void deleteLog(log._id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
