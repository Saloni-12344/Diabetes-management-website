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

export function MomsKitchen() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [dishName, setDishName] = useState('');
  const [gramsPerServing, setGramsPerServing] = useState('');
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [error, setError] = useState('');

  async function loadItems(): Promise<void> {
    try {
      const res = await authFetch<{ items: FoodItem[] }>('/api/food-library');
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items');
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function addItem(e: FormEvent): Promise<void> {
    e.preventDefault();
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
          isCooked: true,
        }),
      });
      setDishName('');
      setGramsPerServing('');
      setCalories('');
      setCarbs('');
      setProtein('');
      setFat('');
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    }
  }

  async function quickLog(item: FoodItem): Promise<void> {
    await authFetch('/api/meals', {
      method: 'POST',
      body: JSON.stringify({
        mealName: item.dishName,
        grams: item.gramsPerServing,
        calories: item.calories,
        carbs: item.carbs,
        protein: item.protein,
        fat: item.fat,
        source: 'library',
        foodLibraryId: item._id,
      }),
    });
  }

  async function removeItem(id: string): Promise<void> {
    await authFetch(`/api/food-library/${id}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((x) => x._id !== id));
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Mom&apos;s Kitchen</h2>
        <form onSubmit={addItem} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <input placeholder="Dish" value={dishName} onChange={(e) => setDishName(e.target.value)} required />
          <input type="number" min={0.1} step={0.1} placeholder="Grams" value={gramsPerServing} onChange={(e) => setGramsPerServing(e.target.value)} required />
          <input type="number" min={0} placeholder="Calories" value={calories} onChange={(e) => setCalories(e.target.value)} required />
          <input type="number" min={0} placeholder="Carbs" value={carbs} onChange={(e) => setCarbs(e.target.value)} required />
          <input type="number" min={0} placeholder="Protein" value={protein} onChange={(e) => setProtein(e.target.value)} required />
          <input type="number" min={0} placeholder="Fat" value={fat} onChange={(e) => setFat(e.target.value)} required />
          <button type="submit" style={{ gridColumn: '1 / span 3' }}>
            Save Dish
          </button>
        </form>
      </div>

      <div style={cardStyle}>
        {error && <p style={{ color: '#ef4444' }}>{error}</p>}
        {items.map((item) => (
          <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <div>
              <strong>{item.dishName}</strong>
              <div>
                {item.gramsPerServing}g | {item.calories} kcal | C {item.carbs} / P {item.protein} / F {item.fat}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => void quickLog(item)}>Quick Log</button>
              <button onClick={() => void removeItem(item._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
