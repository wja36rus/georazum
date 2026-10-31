import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Field } from "@/shared/ui/Field";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Alert } from "@/shared/ui/Alert";
import { register } from "@/entities/user/api";
import { useAuth } from "@/app/providers/auth";
import { isEmail, isPhone, isStrongPassword, NAME_RE } from "@/shared/lib/validators";

export function SignUpForm() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    consentPd: false,
    consentTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!NAME_RE.test(form.firstName.trim())) return setError("Укажите имя (только буквы, от 2 символов).");
    if (!NAME_RE.test(form.lastName.trim())) return setError("Укажите фамилию (только буквы, от 2 символов).");
    if (!isEmail(form.email)) return setError("Укажите корректный email.");
    if (!isPhone(form.phone)) return setError("Телефон должен содержать 11 цифр.");
    if (!isStrongPassword(form.password)) return setError("Пароль должен быть не короче 8 символов.");
    if (form.password !== form.confirmPassword) return setError("Пароли не совпадают.");
    if (!form.consentPd || !form.consentTerms)
      return setError("Необходимо согласие на обработку персональных данных и с условиями.");

    setBusy(true);
    try {
      const res = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        consentPd: true,
        consentTerms: true,
      });
      signIn(res.token, res.user);
      navigate("/cabinet", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось зарегистрироваться.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid-2" style={{ gap: 12 }}>
        <Field label="Имя">
          <Input value={form.firstName} autoComplete="given-name" onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Фамилия">
          <Input value={form.lastName} autoComplete="family-name" onChange={(e) => set("lastName", e.target.value)} />
        </Field>
      </div>
      <Field label="Email">
        <Input type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field label="Телефон" hint="Формат: +7 (900) 123-45-67">
        <Input
          type="tel"
          autoComplete="tel"
          placeholder="+7 (___) ___-__-__"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
      </Field>
      <div className="grid-2" style={{ gap: 12 }}>
        <Field label="Пароль" hint="Не короче 8 символов">
          <Input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
        </Field>
        <Field label="Подтверждение пароля">
          <Input
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => set("confirmPassword", e.target.value)}
          />
        </Field>
      </div>
      <Field>
        <Checkbox
          checked={form.consentPd}
          onChange={(e) => set("consentPd", e.target.checked)}
          label={
            <>
              Согласен на обработку персональных данных (
              <Link to="/documents?doc=privacy" target="_blank">
                политика
              </Link>
              )
            </>
          }
        />
      </Field>
      <Field>
        <Checkbox
          checked={form.consentTerms}
          onChange={(e) => set("consentTerms", e.target.checked)}
          label={
            <>
              Принимаю условия сервиса (
              <Link to="/documents?doc=offer" target="_blank">
                оферта
              </Link>
              )
            </>
          }
        />
      </Field>
      <div className="form-actions">
        <Button type="submit" variant="accent" block disabled={busy}>
          {busy ? "Создаём аккаунт…" : "Создать аккаунт"}
        </Button>
      </div>
      <p className="muted" style={{ fontSize: 14, marginTop: 16, marginBottom: 0 }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </form>
  );
}
