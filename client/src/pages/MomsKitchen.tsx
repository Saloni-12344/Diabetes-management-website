import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { authFetch } from '../lib/authFetch';

// Gemini photo analysis is active — requires GEMINI_API_KEY in server/.env
const GEMINI_ENABLED = true;

type FoodItem = {
  id: string;
  dishName: string;
  gramsPerServing: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  isCooked: boolean;
};

type GeminiResult = {
  dishName: string;
  gramsPerServing: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  isCooked: boolean;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
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
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  warn: '#f59e0b',
  warnLight: '#fffbeb',
};

const inputStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const CONFIDENCE_META: Record<string, { color: string; bg: string; label: string }> = {
  high:   { color: C.accent,   bg: C.accentLight,  label: '✅ High confidence' },
  medium: { color: C.warn,     bg: C.warnLight,    label: '⚠️ Medium confidence' },
  low:    { color: C.danger,   bg: C.dangerLight,  label: '🔴 Low confidence — please review' },
};

/** Resize an image File to max 800px wide using canvas, returns base64 string (no prefix) */
async function resizeToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function MomsKitchen() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [search, setSearch] = useState('');
  const [quickLogged, setQuickLogged] = useState<string | null>(null);

  // Gemini photo analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [geminiResult, setGeminiResult] = useState<GeminiResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
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

  useEffect(() => { void loadItems(); }, []);

  function fillForm(r: GeminiResult) {
    setDishName(r.dishName);
    setGramsPerServing(String(r.gramsPerServing));
    setCalories(String(r.calories));
    setCarbs(String(r.carbs));
    setProtein(String(r.protein));
    setFat(String(r.fat));
    setIsCooked(r.isCooked);
  }

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    setPreviewUrl(URL.createObjectURL(file));
    setAnalyzing(true);
    setAnalyzeError('');
    setGeminiResult(null);
    setShowForm(false);

    try {
      const { base64, mimeType } = await resizeToBase64(file);
      const result = await authFetch<GeminiResult>('/api/gemini/analyze-food', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      setGeminiResult(result);
      fillForm(result);
      setShowForm(true);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed. Try again.');
    } finally {
      setAnalyzing(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

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
      setDishName(''); setGramsPerServing(''); setCalories('');
      setCarbs(''); setProtein(''); setFat('');
      setFormMsg("Dish saved to Mom's Kitchen!");
      setShowForm(false);
      setGeminiResult(null);
      setPreviewUrl(null);
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
          foodLibraryId: item.id,
          grams: item.gramsPerServing,
          calories: item.calories,
          carbs: item.carbs,
          protein: item.protein,
          fat: item.fat,
          isCooked: item.isCooked,
          source: 'library',
        }),
      });
      setQuickLogged(item.id);
      setTimeout(() => setQuickLogged(null), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Quick log failed');
    }
  }

  async function onDelete(id: string) {
    try {
      await authFetch(`/api/food-library/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const filtered = items.filter((i) => i.dishName.toLowerCase().includes(search.toLowerCase()));
  const confMeta = geminiResult ? (CONFIDENCE_META[geminiResult.confidence] ?? CONFIDENCE_META.medium) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, fontFamily: 'Georgia, serif' }}>🏠 Mom&apos;s Kitchen</h1>
          <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 14 }}>Saved home meals — tap any dish to log instantly</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Hidden file input — triggered by Snap button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={onPhotoSelected}
          />
          {GEMINI_ENABLED && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
              style={{ background: analyzing ? '#e2e8f0' : C.purple, color: analyzing ? C.muted : '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: analyzing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {analyzing ? (
                <>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #94a3b8', borderTopColor: C.muted, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Analyzing...
                </>
              ) : '📷 Snap to Analyze'}
            </button>
          )}
          <button
            onClick={() => { setShowForm(!showForm); setGeminiResult(null); setPreviewUrl(null); }}
            style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ Add Dish'}
          </button>
        </div>
      </div>

      {/* CSS keyframe for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Success banner ── */}
      {formMsg && (
        <div style={{ background: C.accentLight, border: `1px solid ${C.accent}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: C.accent, fontWeight: 600 }}>
          ✅ {formMsg}
        </div>
      )}

      {/* ── Analyze error ── */}
      {GEMINI_ENABLED && analyzeError && (
        <div style={{ background: C.dangerLight, border: `1px solid ${C.danger}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: C.danger, fontWeight: 600 }}>
          ❌ {analyzeError}
        </div>
      )}

      {/* ── Analyzing spinner card ── */}
      {GEMINI_ENABLED && analyzing && (
        <div style={{ background: C.purpleLight, border: `1px solid ${C.purple}`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          {previewUrl && (
            <img src={previewUrl} alt="preview" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.purple }}>🤖 Gemini is analyzing your photo...</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Estimating dish name, calories, carbs, protein and fat</div>
          </div>
        </div>
      )}

      {/* ── Gemini result banner ── */}
      {GEMINI_ENABLED && geminiResult && !analyzing && (
        <div style={{ background: C.purpleLight, border: `1px solid ${C.purple}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {previewUrl && (
              <img src={previewUrl} alt="analyzed" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: C.purple, marginBottom: 4 }}>
                🤖 Gemini identified: {geminiResult.dishName}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                {[
                  { label: 'Carbs',    value: geminiResult.carbs,           unit: 'g', color: C.warn },
                  { label: 'Protein',  value: geminiResult.protein,         unit: 'g', color: C.accent },
                  { label: 'Fat',      value: geminiResult.fat,             unit: 'g', color: C.primary },
                  { label: 'Calories', value: geminiResult.calories,        unit: 'kcal', color: C.text },
                  { label: 'Serving',  value: geminiResult.gramsPerServing, unit: 'g', color: C.muted },
                ].map((m) => (
                  <div key={m.label} style={{ background: C.card, borderRadius: 8, padding: '6px 12px', textAlign: 'center', minWidth: 64 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{m.value}{m.unit}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{m.label}</div>
                  </div>
                ))}
              </div>
              {confMeta && (
                <div style={{ background: confMeta.bg, color: confMeta.color, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, display: 'inline-block', marginBottom: 6 }}>
                  {confMeta.label}
                </div>
              )}
              {geminiResult.notes && (
                <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>{geminiResult.notes}</div>
              )}
              <div style={{ fontSize: 12, color: C.purple, marginTop: 6 }}>👇 Review and edit the form below before saving</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit form ── */}
      {showForm && (
        <div style={{ background: C.card, borderRadius: 16, padding: 22, border: `1.5px solid ${geminiResult ? C.purple : C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: geminiResult ? C.purple : C.text, marginBottom: 16 }}>
            {geminiResult ? '✏️ Review & Save Dish' : 'Add New Dish'}
          </div>
          <form onSubmit={onAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Dish Name</label>
                <input value={dishName} onChange={(e) => setDishName(e.target.value)} required placeholder="e.g. Dal Tadka" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Grams / Serving</label>
                <input type="number" value={gramsPerServing} onChange={(e) => setGramsPerServing(e.target.value)} required min={1} step={1} placeholder="e.g. 250" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Calories (kcal)</label>
                <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} required min={0} placeholder="e.g. 320" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.warn, fontWeight: 600, display: 'block', marginBottom: 6 }}>Carbs (g)</label>
                <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} required min={0} placeholder="e.g. 55" style={{ ...inputStyle, borderColor: geminiResult ? C.warn : C.border }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.accent, fontWeight: 600, display: 'block', marginBottom: 6 }}>Protein (g)</label>
                <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} required min={0} placeholder="e.g. 14" style={{ ...inputStyle, borderColor: geminiResult ? C.accent : C.border }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.primary, fontWeight: 600, display: 'block', marginBottom: 6 }}>Fat (g)</label>
                <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} required min={0} placeholder="e.g. 10" style={{ ...inputStyle, borderColor: geminiResult ? C.primary : C.border }} />
              </div>
            </div>
            <label style={{ fontSize: 13, color: C.muted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <input type="checkbox" checked={isCooked} onChange={(e) => setIsCooked(e.target.checked)} />
              Cooked food
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" disabled={submitting} style={{ background: geminiResult ? C.purple : C.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {submitting ? 'Saving...' : '💾 Save to Kitchen'}
              </button>
              {GEMINI_ENABLED && geminiResult && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: 'transparent', color: C.purple, border: `1.5px solid ${C.purple}`, borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  📷 Re-snap
                </button>
              )}
            </div>
          </form>
          {formMsg && <p style={{ marginTop: 10, fontSize: 13, color: C.accent }}>{formMsg}</p>}
        </div>
      )}

      {/* ── Saved dishes grid ── */}
      <div style={{ background: C.card, borderRadius: 16, padding: 22, border: `1px solid ${C.border}` }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search dishes..."
          style={{ ...inputStyle, marginBottom: 16 }}
        />

        {loading && <p style={{ color: C.muted, fontSize: 14 }}>Loading...</p>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: C.muted }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📷</div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>No dishes yet</p>
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>Add your first dish using the + Add Dish button above</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{ padding: 16, borderRadius: 14, background: C.bg, border: `1.5px solid ${quickLogged === item.id ? C.accent : C.border}`, transition: 'border 0.2s' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{item.dishName}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{item.gramsPerServing}g · {item.isCooked ? 'Cooked' : 'Raw'}</div>
                </div>
                <button
                  onClick={() => void onDelete(item.id)}
                  style={{ background: C.dangerLight, color: C.danger, border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
                >✕</button>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Carbs',   value: item.carbs,    color: C.warn },
                  { label: 'Protein', value: item.protein,  color: C.accent },
                  { label: 'Fat',     value: item.fat,      color: C.primary },
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

              <button
                onClick={() => void onQuickLog(item)}
                style={{ width: '100%', background: quickLogged === item.id ? C.accent : C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '9px', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'background 0.2s' }}
              >
                {quickLogged === item.id ? '✅ Logged!' : '⚡ Quick Log'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
