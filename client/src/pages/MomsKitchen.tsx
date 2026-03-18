import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useState } from 'react';

const TOKEN_KEY = 'diabetes_app_token';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

type FoodItem = {
  _id: string;
  dishName: string;
  gramsPerServing: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  isCooked: boolean;
};

const C = {
  card: '#fff',
  bg: '#f7f8fa',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  primary: '#2563eb',
  accent: '#10b981',
  accentLight: '#ecfdf5',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  warn: '#f59e0b',
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

export function MomsKitchen() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [search, setSearch] = useState('');
  const [quickLogged, setQuickLogged] = useState<string | null>(null);

  const [dishName, setDishName] = useState('');
  const [gramsPerServing, setGramsPerServing] = useState('');
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [isCooked, setIsCooked] = useState(true);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await authFetch<{ items: FoodItem[] }>('/api/food-library');
      setItems(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg('');
    try {
      await authFetch('/api/food-library', {
        method: 'POST',
        body: JSON.stringify({
          dishName,
          gramsPerServing: Number(gramsPerServing),
          calories: Number(calories),
          carbs: Number(carbs),
          protein: Number(protein),
          fat: Number(fat),
          isCooked,
        }),
      });
      setDishName('');
      setGramsPerServing('');
      setCalories('');
      setCarbs('');
      setProtein('');
      setFat('');
      setFormMsg("Dish saved to Mom's Kitchen!");
      setShowForm(false);
      void loadItems();
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function onQuickLog(item: FoodItem) {
    try {
      await authFetch('/api/meals', {
        method: 'POST',
        body: JSON.stringify({
          mealName: item.dishName,
          foodLibraryId: item._id,
          grams: item.gramsPerServing,
          calories: item.calories,
          carbs: item.carbs,
          protein: item.protein,
          fat: item.fat,
          isCooked: item.isCooked,
          source: 'library',
        }),
      });
      setQuickLogged(item._id);
      setTimeout(() => setQuickLogged(null), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Quick log failed');
    }
  }

  async function onDelete(id: string) {
    try {
      await authFetch(`/api/food-library/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const filtered = items.filter((i) => i.dishName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, fontFamily: 'Georgia, serif' }}>🏠 Mom&apos;s Kitchen</h1>
          <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 14 }}>Saved home meals — tap any dish to log instantly</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {showForm ? 'Cancel' : '+ Add Dish'}
        </button>
      </div>

      {formMsg && <div style={{ background: C.accentLight, border: `1px solid ${C.accent}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: C.accent, fontWeight: 600 }}>✅ {formMsg}</div>}

      {showForm && (
        <div style={{ background: C.card, borderRadius: 16, padding: 22, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 16 }}>Add New Dish</div>
          <form onSubmit={onAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Dish Name</label>
                <input value={dishName} onChange={(e) => setDishName(e.target.value)} required placeholder="e.g. Dal Tadka" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Grams per Serving</label>
                <input type="number" value={gramsPerServing} onChange={(e) => setGramsPerServing(e.target.value)} required min={0.1} step={0.1} placeholder="e.g. 250" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Calories</label>
                <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} required min={0} placeholder="e.g. 320" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Carbs (g)</label>
                <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} required min={0} placeholder="e.g. 55" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Protein (g)</label>
                <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} required min={0} placeholder="e.g. 14" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Fat (g)</label>
                <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} required min={0} placeholder="e.g. 10" style={inputStyle} />
              </div>
            </div>
            <label style={{ fontSize: 13, color: C.muted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <input type="checkbox" checked={isCooked} onChange={(e) => setIsCooked(e.target.checked)} />
              Cooked food
            </label>
            <button type="submit" disabled={submitting} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {submitting ? 'Saving...' : 'Save to Kitchen'}
            </button>
          </form>
        </div>
      )}

      <div style={{ background: C.card, borderRadius: 16, padding: 22, border: `1px solid ${C.border}` }}>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search dishes..." style={{ ...inputStyle, marginBottom: 16 }} />

        {loading && <p style={{ color: C.muted, fontSize: 14 }}>Loading...</p>}
        {!loading && filtered.length === 0 && <p style={{ color: C.muted, fontSize: 14 }}>No dishes found. Add your first dish above!</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {filtered.map((item) => (
            <div key={item._id} style={{ padding: 16, borderRadius: 14, background: C.bg, border: `1.5px solid ${quickLogged === item._id ? C.accent : C.border}`, transition: 'border 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{item.dishName}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{item.gramsPerServing}g · {item.isCooked ? 'Cooked' : 'Raw'}</div>
                </div>
                <button onClick={() => void onDelete(item._id)} style={{ background: C.dangerLight, color: C.danger, border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Carbs', value: item.carbs, color: C.warn },
                  { label: 'Protein', value: item.protein, color: C.accent },
                  { label: 'Fat', value: item.fat, color: C.primary },
                ].map((m) => (
                  <div key={m.label} style={{ flex: 1, background: C.card, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: m.color }}>{m.value}g</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{m.label}</div>
                  </div>
                ))}
                <div style={{ flex: 1, background: C.card, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{item.calories}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>kcal</div>
                </div>
              </div>

              <button onClick={() => void onQuickLog(item)} style={{ width: '100%', background: quickLogged === item._id ? C.accent : C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '9px', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'background 0.2s' }}>
                {quickLogged === item._id ? '✅ Logged!' : '⚡ Quick Log'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
