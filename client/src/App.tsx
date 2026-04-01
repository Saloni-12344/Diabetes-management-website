import { useEffect, useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { setLogoutHandler } from './lib/authFetch';

const TOKEN_KEY = 'diabetes_app_token';
const USER_KEY = 'diabetes_app_user';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'viewer';
  diabetesType: string;
  targetGlucoseMin: number;
  targetGlucoseMax: number;
};

function loadStoredAuth(): { token: string; user: AuthUser } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    if (token && userRaw) {
      return { token, user: JSON.parse(userRaw) as AuthUser };
    }
  } catch {
    // corrupted storage — clear it
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  return null;
}

export function App() {
  const [auth, setAuth] = useState<{ token: string; user: AuthUser } | null>(loadStoredAuth);

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuth(null);
  }

  // Register logout handler so authFetch can trigger it on any 401 anywhere in the app
  useEffect(() => {
    setLogoutHandler(handleLogout);
  }, []);

  function handleLogin(token: string, user: AuthUser) {
    setAuth({ token, user });
  }

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard user={auth.user} onLogout={handleLogout} />;
}
