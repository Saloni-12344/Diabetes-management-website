const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'viewer';
  diabetesType: string;
  targetGlucoseMin: number;
  targetGlucoseMax: number;
};

export type GlucoseLog = {
  _id: string;
  value: number;
  unit: 'mg/dL' | 'mmol/L';
  loggedAt: string;
  notes?: string;
};

export type InsulinLog = {
  _id: string;
  dose: number;
  insulinType: 'fast' | 'slow';
  loggedAt: string;
  notes?: string;
};

export type MealLog = {
  _id: string;
  mealName: string;
  grams: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  isCooked: boolean;
  source: 'manual' | 'ai' | 'library';
  foodLibraryId?: string;
  loggedAt: string;
};

export type FoodLibraryItem = {
  _id: string;
  dishName: string;
  gramsPerServing: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  isCooked: boolean;
};

type AuthResponse = { token: string; user: AuthUser };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Request failed');
  return data as T;
}

// Auth
export function register(payload: {
  name: string;
  email: string;
  password: string;
  role: 'owner' | 'viewer';
}) {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function login(payload: { email: string; password: string }) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMe(token: string) {
  return request<{ user: AuthUser }>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Glucose
export function createGlucoseLog(
  token: string,
  payload: { value: number; unit?: 'mg/dL' | 'mmol/L'; loggedAt?: string; notes?: string },
) {
  return request<{ log: GlucoseLog }>('/api/glucose', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function listGlucoseLogs(token: string, filter?: 'today' | '7d' | '30d') {
  const qs = filter ? `?filter=${filter}` : '';
  return request<{ logs: GlucoseLog[] }>(`/api/glucose${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function deleteGlucoseLog(token: string, id: string) {
  return request<{ message: string }>(`/api/glucose/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Insulin
export function createInsulinLog(
  token: string,
  payload: {
    dose: number;
    insulinType: 'fast' | 'slow';
    loggedAt?: string;
    notes?: string;
    idempotencyKey?: string;
  },
) {
  return request<{ log: InsulinLog; duplicate: boolean }>('/api/insulin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function listInsulinLogs(token: string, filter?: 'today' | '7d' | '30d') {
  const qs = filter ? `?filter=${filter}` : '';
  return request<{ logs: InsulinLog[] }>(`/api/insulin${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function deleteInsulinLog(token: string, id: string) {
  return request<{ message: string }>(`/api/insulin/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Meals
export function createMealLog(
  token: string,
  payload: {
    mealName: string;
    grams: number;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    isCooked?: boolean;
    notes?: string;
    source?: 'manual' | 'ai' | 'library';
    foodLibraryId?: string;
  },
) {
  return request<{ log: MealLog; alerts: Array<{ type: string; message: string }> }>('/api/meals', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function listMealLogs(token: string, filter?: 'today' | '7d' | '30d') {
  const qs = filter ? `?filter=${filter}` : '';
  return request<{ logs: MealLog[] }>(`/api/meals${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function deleteMealLog(token: string, id: string) {
  return request<{ message: string }>(`/api/meals/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Food Library
export function createFoodLibraryItem(
  token: string,
  payload: {
    dishName: string;
    gramsPerServing: number;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    isCooked?: boolean;
    photoUrl?: string;
  },
) {
  return request<{ item: FoodLibraryItem }>('/api/food-library', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function listFoodLibrary(token: string) {
  return request<{ items: FoodLibraryItem[] }>('/api/food-library', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function deleteFoodLibraryItem(token: string, id: string) {
  return request<{ message: string }>(`/api/food-library/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
