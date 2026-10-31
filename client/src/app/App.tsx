import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { PublicLayout } from "@/widgets/layouts/ui/PublicLayout";
import { Protected, AdminOnly } from "./router/guards";
import { lazyPage } from "./router/lazy";
import { Loading } from "@/shared/ui/Spinner";

/* Страницы грузятся лениво (code-splitting по маршрутам). */
const HomePage = lazyPage(() => import("@/pages/home/ui/HomePage"), "HomePage");
const AboutPage = lazyPage(
  () => import("@/pages/about/ui/AboutPage"),
  "AboutPage",
);
const LevelsPage = lazyPage(
  () => import("@/pages/levels/ui/LevelsPage"),
  "LevelsPage",
);
const TariffsPage = lazyPage(
  () => import("@/pages/tariffs/ui/TariffsPage"),
  "TariffsPage",
);
const ExamplesPage = lazyPage(
  () => import("@/pages/examples/ui/ExamplesPage"),
  "ExamplesPage",
);
const DocumentsPage = lazyPage(
  () => import("@/pages/documents/ui/DocumentsPage"),
  "DocumentsPage",
);
const ContactsPage = lazyPage(
  () => import("@/pages/contacts/ui/ContactsPage"),
  "ContactsPage",
);

const LoginPage = lazyPage(
  () => import("@/pages/login/ui/LoginPage"),
  "LoginPage",
);
const RegisterPage = lazyPage(
  () => import("@/pages/register/ui/RegisterPage"),
  "RegisterPage",
);
const RecoveryPage = lazyPage(
  () => import("@/pages/recovery/ui/RecoveryPage"),
  "RecoveryPage",
);

const OrderPage = lazyPage(
  () => import("@/pages/order/ui/OrderPage"),
  "OrderPage",
);
const OrderStatusPage = lazyPage(
  () => import("@/pages/order-status/ui/OrderStatusPage"),
  "OrderStatusPage",
);
const PayPage = lazyPage(() => import("@/pages/pay/ui/PayPage"), "PayPage");
const ReportPage = lazyPage(
  () => import("@/pages/report/ui/ReportPage"),
  "ReportPage",
);

const CabinetPage = lazyPage(
  () => import("@/pages/cabinet/ui/CabinetPage"),
  "CabinetPage",
);
const AdminPage = lazyPage(
  () => import("@/pages/admin/ui/AdminPage"),
  "AdminPage",
);
const NotFoundPage = lazyPage(
  () => import("@/pages/not-found/ui/NotFoundPage"),
  "NotFoundPage",
);

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Публичный каркас: шапка + контент + подвал */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/levels" element={<LevelsPage />} />
          <Route path="/tariffs" element={<TariffsPage />} />
          <Route path="/examples" element={<ExamplesPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/contacts" element={<ContactsPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/recovery" element={<RecoveryPage />} />

          <Route
            path="/order"
            element={
              <Protected>
                <OrderPage />
              </Protected>
            }
          />
          <Route
            path="/order/:id"
            element={
              <Protected>
                <OrderStatusPage />
              </Protected>
            }
          />
          <Route
            path="/order/:id/pay"
            element={
              <Protected>
                <PayPage />
              </Protected>
            }
          />
        </Route>

        {/* Кабинет и админка — со своим каркасом (SidebarLayout) */}
        <Route
          path="/cabinet"
          element={
            <Protected>
              <CabinetPage />
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminOnly>
              <AdminPage />
            </AdminOnly>
          }
        />

        {/* Отчёт: без шапки и подвала, для печати */}
        <Route
          path="/order/:id/report"
          element={
            <Protected>
              <ReportPage />
            </Protected>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
