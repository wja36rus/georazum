import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Field } from "@/shared/ui/Field";
import { Alert } from "@/shared/ui/Alert";
import { recovery } from "@/entities/user/api";
import { isEmail } from "@/shared/lib/validators";

export function RecoveryForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isEmail(email)) return setError("Укажите корректный email.");
    setBusy(true);
    try {
      const res = await recovery(email.trim().toLowerCase());
      setDone(Boolean(res.ok));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить запрос.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Alert tone="success" title="Письмо отправлено.">
        Если email зарегистрирован в сервисе, ссылка для восстановления пароля
        уже у вас на почте. В демо-режиме письмо просто сохраняется на сервере.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Email" hint="Укажите email, указанный при регистрации">
        <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <div className="form-actions">
        <Button type="submit" variant="accent" block disabled={busy}>
          {busy ? "Отправляем…" : "Восстановить пароль"}
        </Button>
      </div>
      <p className="muted" style={{ fontSize: 14, marginTop: 16, marginBottom: 0 }}>
        <Link to="/login">Вернуться ко входу</Link>
      </p>
    </form>
  );
}
