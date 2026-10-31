import { RecoveryForm } from "@/features/auth/ui/RecoveryForm";

/** Страница восстановления пароля. */
export function RecoveryPage() {
  return (
    <div className="page">
      <div className="container">
        <div className="auth-card card">
          <h1 className="page-title">Восстановление пароля</h1>
          <RecoveryForm />
        </div>
      </div>
    </div>
  );
}
