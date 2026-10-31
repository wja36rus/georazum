import type { InputHTMLAttributes, ReactNode } from "react";

export type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Подпись справа от чекбокса. */
  label?: ReactNode;
};

export function Checkbox({ label, ...rest }: CheckboxProps) {
  return (
    <label className="checkbox">
      <input type="checkbox" {...rest} />
      {label && <span>{label}</span>}
    </label>
  );
}
