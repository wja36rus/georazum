import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { STORAGE_KEYS, BASE_PATH } from "@/shared/config";
import { setUnauthorizedHandler } from "@/shared/api/client";
import type { User } from "@/entities/user/api";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  /** Авторизован ли пользователь. */
  isAuthed: boolean;
  /** Ожидание восстановления сессии из localStorage. */
  ready: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  /** Обновить пользователя (профиль и т.п.). */
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.token),
  );
  const [user, setUserState] = useState<User | null>(() => readStoredUser());
  const [ready, setReady] = useState(false);

  /* На любой 401 — разлогиниваем и отправляем на страницу входа. */
  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
      /* Полная перезагрузка с учётом базового пути (подпапка на GitHub Pages). */
      window.location.assign(BASE_PATH + "/login");
    });
    return () => setUnauthorizedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback((t: string, u: User) => {
    localStorage.setItem(STORAGE_KEYS.token, t);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u));
    setToken(t);
    setUserState(u);
    setReady(true);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    setToken(null);
    setUserState(null);
    setReady(true);
  }, []);

  const setUser = useCallback((u: User) => {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u));
    setUserState(u);
  }, []);

  /* Сессия из localStorage считается готовой сразу (токен проверит API). */
  useEffect(() => {
    setReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthed: Boolean(token && user),
      ready,
      signIn,
      signOut,
      setUser,
    }),
    [user, token, ready, signIn, signOut, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuth должен использоваться внутри AuthProvider");
  return ctx;
}
