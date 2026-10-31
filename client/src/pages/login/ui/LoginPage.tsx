import { SignInForm } from "@/features/auth/ui/SignInForm";

/** Страница входа. */
export function LoginPage() {
  return (
    <div className="page">
      <div className="container">
        <div className="auth-card card">
          <h1 className="page-title">Вход в личный кабинет</h1>
          <p className="page-sub" style={{ fontSize: 14 }}>
            Демо-аккаунт: <b>ivan@mail.ru</b> / <b>demo1234</b> (админ: <b>admin@georazum.ru</b> / <b>admin123</b>)
          </p>
          <SignInForm />
        </div>
      </div>
    </div>
  );
}
