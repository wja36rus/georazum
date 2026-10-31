import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../providers/auth";
import { Loading } from "@/shared/ui/Spinner";

/** Защита: страница доступна только авторизованным. */
export function Protected({ children }: { children: ReactNode }) {
  const { isAuthed, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Защита: только для администраторов. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAuthed, ready, user } = useAuth();
  if (!ready) return <Loading />;
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/cabinet" replace />;
  return <>{children}</>;
}
