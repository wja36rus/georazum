import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/Button";
import { Alert } from "@/shared/ui/Alert";
import { IconDownload, IconRefresh, IconMail } from "@/shared/icons";
import { retryOrder, resendReport, type OrderFull } from "@/entities/order/api";
import { ApiError } from "@/shared/api/client";
import { BASE_PATH } from "@/shared/config";

/** Кнопка повторного запуска генерации (при ошибке). */
export function RetryButton({
  order,
  onRetried,
}: {
  order: OrderFull;
  onRetried?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onRetry() {
    setMessage(null);
    setBusy(true);
    try {
      await retryOrder(order.id);
      onRetried?.();
      navigate("/order/" + order.id);
    } catch (err) {
      setMessage(
        err instanceof ApiError
          ? err.message
          : "Не удалось запустить повторно.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {message && <Alert tone="error">{message}</Alert>}
      <Button
        variant="outline-danger"
        icon={<IconRefresh size={16} />}
        onClick={onRetry}
        disabled={busy}
      >
        {busy ? "Запускаем…" : "Запустить повторно"}
      </Button>
    </>
  );
}

/** Повторная отправка готового отчёта на email. */
export function ResendButton({ order }: { order: OrderFull }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onResend() {
    setBusy(true);
    try {
      const res = await resendReport(order.id);
      setDone(true);
      setTimeout(() => setDone(false), 6000);
      void res;
    } catch {
      setDone(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      icon={<IconMail size={14} />}
      onClick={onResend}
      disabled={busy}
    >
      {done ? "Отправлен ✓" : busy ? "Отправляем…" : "Отправить на email"}
    </Button>
  );
}

/** Скачивание отчёта (открывает страницу для печати в PDF). */
export function DownloadReportLink({
  orderId,
  children = "Скачать PDF",
}: {
  orderId: string;
  children?: React.ReactNode;
}) {
  return (
    <Button
      variant="green"
      size="sm"
      icon={<IconDownload size={14} />}
      onClick={() =>
        window.open(BASE_PATH + "/order/" + orderId + "/report", "_blank")
      }
    >
      {children}
    </Button>
  );
}
