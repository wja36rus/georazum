import { OrderWizard } from "@/features/order-wizard/ui/Wizard";

/** Страница заказа: пошаговый визард. */
export function OrderPage() {
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Новый анализ участка</h1>
        <p className="page-sub">
          Заполните данные — и получите аналитическое заключение по вашему участку.
          Оплата потребуется только после выбора уровня.
        </p>
        <OrderWizard />
      </div>
    </div>
  );
}
