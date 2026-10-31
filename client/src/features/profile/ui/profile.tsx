import { useState, type FormEvent } from "react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Field } from "@/shared/ui/Field";
import { Alert } from "@/shared/ui/Alert";
import {
  updateProfile,
  changePassword,
  deleteRequest,
} from "@/entities/user/api";
import { useAuth } from "@/app/providers/auth";
import { isEmail, isPhone, NAME_RE } from "@/shared/lib/validators";
import { ApiError } from "@/shared/api/client";

/** Редактирование имени/фамилии/телефона/email (п. 10.6 ТЗ). */
export function ProfileForm() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!NAME_RE.test(form.firstName.trim()))
      return setError("Некорректное имя.");
    if (!NAME_RE.test(form.lastName.trim()))
      return setError("Некорректная фамилия.");
    if (!isPhone(form.phone))
      return setError("Телефон должен содержать 11 цифр.");
    if (!isEmail(form.email)) return setError("Некорректный email.");

    setBusy(true);
    try {
      const res = await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
      });
      setUser(res.user);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось сохранить профиль.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {done && <Alert tone="success">Профиль обновлён.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid-2" style={{ gap: 12 }}>
        <Field label="Имя">
          <Input
            value={form.firstName}
            onChange={(e) =>
              setForm((f) => ({ ...f, firstName: e.target.value }))
            }
          />
        </Field>
        <Field label="Фамилия">
          <Input
            value={form.lastName}
            onChange={(e) =>
              setForm((f) => ({ ...f, lastName: e.target.value }))
            }
          />
        </Field>
      </div>
      <Field label="Телефон">
        <Input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
      </Field>
      <Field
        label="Email"
        hint="После смены email в демо-режиме подтверждение не требуется"
      >
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </Field>
      <div className="form-actions">
        <Button type="submit" disabled={busy}>
          {busy ? "Сохраняем…" : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}

/** Смена пароля (п. 4.2 ТЗ: завершает остальные сессии). */
export function PasswordForm() {
  const { user, signIn } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (newPassword.length < 8)
      return setError("Новый пароль должен быть не короче 8 символов.");
    if (newPassword !== confirm) return setError("Пароли не совпадают.");
    setBusy(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (user) signIn(res.token, user);
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось сменить пароль.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {done && (
        <Alert tone="success">
          Пароль изменён. Остальные устройства разлогинены.
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Текущий пароль">
        <Input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </Field>
      <div className="grid-2" style={{ gap: 12 }}>
        <Field label="Новый пароль">
          <Input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
        <Field label="Повторите пароль">
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={busy}>
          {busy ? "Меняем…" : "Сменить пароль"}
        </Button>
      </div>
    </form>
  );
}

/** Запрос на удаление аккаунта (п. 4.4, 10.6 ТЗ). */
export function DeleteRequestForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setBusy(true);
    try {
      await deleteRequest(password);
      setDone(true);
      setPassword("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось отправить запрос.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {done && (
        <Alert tone="warn">
          Запрос на удаление аккаунта принят. С вами свяжутся для подтверждения.
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <p className="muted" style={{ fontSize: 14 }}>
        Удаление аккаунта — необратимое действие. Для подтверждения введите
        пароль.
      </p>
      <Field label="Пароль">
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <div className="form-actions">
        <Button type="submit" variant="danger" disabled={busy}>
          {busy ? "Отправляем…" : "Запросить удаление аккаунта"}
        </Button>
      </div>
    </form>
  );
}
