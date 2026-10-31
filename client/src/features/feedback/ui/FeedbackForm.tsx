import { useState, type FormEvent } from "react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { Field } from "@/shared/ui/Field";
import { Alert } from "@/shared/ui/Alert";
import { apiPost } from "@/shared/api/client";
import { ApiError } from "@/shared/api/client";
import { isEmail } from "@/shared/lib/validators";

type FeedbackResponse = { ok: boolean; message: string };

/** Форма обратной связи (п. 3.2, 10.7 ТЗ). */
export function FeedbackForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Укажите имя.");
    if (!isEmail(email)) return setError("Укажите корректный email.");
    if (message.trim().length < 10) return setError("Сообщение должно быть не короче 10 символов.");

    setBusy(true);
    try {
      const res = await apiPost<FeedbackResponse>("/api/feedback", { name: name.trim(), email: email.trim(), message: message.trim() });
      setDone(Boolean(res.ok));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить сообщение.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <Alert tone="success">Сообщение отправлено. Мы ответим на указанный email.</Alert>;
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Имя">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Сообщение">
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Опишите ваш вопрос…" />
      </Field>
      <div className="form-actions">
        <Button type="submit" disabled={busy}>{busy ? "Отправляем…" : "Отправить"}</Button>
      </div>
    </form>
  );
}
