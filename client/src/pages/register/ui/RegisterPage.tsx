import { SignUpForm } from "@/features/auth/ui/SignUpForm";

/** Страница регистрации. */
export function RegisterPage() {
  return (
    <div className="page">
      <div className="container">
        <div className="auth-card card">
          <h1 className="page-title">Регистрация</h1>
          <p className="page-sub" style={{ fontSize: 14 }}>
            Создайте аккаунт, чтобы заказывать аналитические отчёты по участкам.
          </p>
          <SignUpForm />
        </div>
      </div>
    </div>
  );
}
