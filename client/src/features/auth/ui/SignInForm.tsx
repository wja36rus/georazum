import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Field } from "@/shared/ui/Field";
import { Alert } from "@/shared/ui/Alert";
import { login } from "@/entities/user/api";
import { useAuth } from "@/app/providers/auth";
import { isEmail } from "@/shared/lib/validators";

export function SignInForm() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isEmail(email)) return setError("Укажите корректный email.");
    if (!password) return setError("Укажите пароль.");
    setBusy(true);
    try {
      const res = await login(email.trim().toLowerCase(), password);
      signIn(res.token, res.user);
      navigate(res.user.role === "admin" ? "/admin" : "/cabinet", {
        replace: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Email">
        <Input
          type="email"
          autoComplete="email"
          placeholder="ivan@mail.ru"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={Boolean(error)}
        />
      </Field>
      <Field label="Пароль">
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={Boolean(error)}
        />
      </Field>
      <div className="form-actions">
        <Button type="submit" variant="accent" block disabled={busy}>
          {busy ? "Входим…" : "Войти"}
        </Button>
      </div>
      <p
        className="muted"
        style={{ fontSize: 14, marginTop: 16, marginBottom: 0 }}
      >
        <Link to="/recovery">Забыли пароль?</Link>
        <span style={{ margin: "0 8px" }}>·</span>
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </form>
  );
}
