import type { ReactNode } from "react";

export type FieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
};

/** Поле формы: подпись, контрол, подсказка и ошибка. */
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      {label && <label className="field__label">{label}</label>}
      {children}
      {hint && !error && <div className="field__hint">{hint}</div>}
      {error && <div className="field__error">{error}</div>}
    </div>
  );
}
