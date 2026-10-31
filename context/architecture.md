# Архитектура

```
┌─────────────────────────┐  /api (прокси Rspack)  ┌──────────────────────┐
│  React 19 + TS + Rspack │ ───────────────────────▶ │  Node.js + Express   │
│  client/src (FSD)       │                          │  server/src          │
└─────────────────────────┘                          └──────────┬───────────┘
                                                                 │
                                                 ┌───────────────┼────────────────┐
                                                 ▼               ▼                ▼
                                          ┌────────────┐  ┌────────────┐   ┌──────────────┐
                                          │  db.js     │  │generation.js│  │  report.js   │
                                          │ in-memory  │  │ статусы (мок)│  │ buildReport  │
                                          └────────────┘  └────────────┘   └──────────────┘
```

## Сервер (`server/`)

Point of entry: `src/index.js` (`app.listen(PORT=4000)`). Без сборки, чистый
Node (18+, требуется global `fetch` для тестов; проверено на Node 24).

| Файл                | Роль                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/app.js`        | Все HTTP-роуты, валидация, авторизация, ответы (`orderSummary`/`orderFull`/`publicUser`)                      |
| `src/db.js`         | In-memory БД + сид-данные, уровни S/M/L, участки, оферта, документы; `hash`/`verify` (scrypt), `CADASTRAL_RE` |
| `src/generation.js` | Движок статусов: `startGeneration` (цепочка setTimeout ~4,2 с), `retryGeneration`, уведомления, мок-письма    |
| `src/report.js`     | `buildReport(order)` — структура отчёта по уровню S/M/L                                                       |
| `test.js`           | Smoke-тест всего API (32 проверки)                                                                            |

### Потоки данных

1. **Регистрация** → пользователь в `db.users`, токен в `db.tokens` (Map), письмо
   в `db.emails`, уведомление пользователю и админам.
2. **Заказ** → валидация: формат кадастрового номера → участок есть в
   `db.parcels` → уровень существует и доступен → `offerAccepted === true` и
   `offerVersion === db.offer.version` (иначе 409). Заказ создаётся со статусом
   «Ожидает оплаты», фиксируется `offer: {version, acceptedAt}`.
3. **Оплата** → `cardValid()` (16 цифр, ММ/ГГ не в прошлом, CVV 3, владелец);
   карта `0000000000000000` → 402. Успех: платёж в `db.payments`, `paidAt`,
   статусы «Оплачен» → «Передан в обработку» (синхронно, через `startGeneration`).
4. **Генерация** → setTimeout-статусы; на финише `buildReport` → `db.reports`,
   `reportId` у заказа, «Готово», уведомления + письмо. Таймеры в `timers`
   (Map orderId → [timeoutId]); незавершённые теряются при рестарте (допустимо).
5. **Отчёт** → `GET /api/orders/:id/report` собирает лениво, если
   `db.reports[reportId]` отсутствует (сид R-1).

### Токены и безопасность (демо-уровень)

- Токен — случайная hex-строка, живёт в `Map`. Прод: JWT.
- Пароли: scrypt + соль (`hash`/`verify`), сравнение через `timingSafeEqual`.
- Блокировка пользователя (админ) удаляет его токены; заблокированный получает 403.
- Смена пароля завершает остальные сессии.
- `requireAuth` → `req.user`; `requireAdmin` → только `role: "admin"`.

### Ключевые структуры

- `order`: `{id, userId, parcel, level, price, status, statusHistory[], params{},
offer{version, acceptedAt}, createdAt, paidAt, reportId, transactionId,
generationAttempts}` (плюс служебный `_jobId`, в ответы не попадает).
- `user`: `{id, firstName, lastName, name, email, phone, password, role, blocked,
confirmed, createdAt, deleteRequestedAt?}`.
- `payment`: `{id, orderId, userId, amount, method, status, createdAt, transactionId}`.
- `notification`: `{id, userId, type, text, createdAt, read}`.
- `generation job`: `{id, orderId, level, attempts, status, startedAt, finishedAt, error}`.

## Клиент (`client/`)

**Реализован.** React 19 + TypeScript (strict) + Rspack, сборка — `@rspack/cli`
со встроенным `swc-loader` (транспиляция TS/TSX, `react` jsx runtime
«automatic»). Организация по FSD, стили — SCSS (колокейтед, BEM, дизайн-токены
CSS-переменными), иконки — SVG как React-компоненты, тесты — Vitest + jsdom.

### Конфигурация

| Файл               | Роль                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rspack.config.ts` | Entry `src/app/index.tsx`, alias `@ → src`, SWC-loader для `tsx?`, sass, HtmlRspackPlugin, CopyRspackPlugin, devServer :5173 с `historyApiFallback` и прокси `/api → 127.0.0.1:4000`. Code-splitting: `optimization.runtimeChunk: "single"` + `splitChunks` (чанки `react`, `router`, `vendor`), `performance.maxEntrypointSize: 400КБ`. DefinePlugin: `process.env.API_URL` и `process.env.BASE_PATH` (из env/.env) |
| `tsconfig.json`    | Strict, `noUnusedLocals`, `paths {"@/*": ["src/*"]}`, JSX `react-jsx`                                                                                                                                                                                                                                                                                                                                                |
| `vitest.config.ts` | jsdom, setup `shared/testing/setup.ts`, alias `@`                                                                                                                                                                                                                                                                                                                                                                    |
| `index.html`       | Шаблон HtmlRspackPlugin, заголовок «Гео Разум»                                                                                                                                                                                                                                                                                                                                                                       |

### Маршрутизация и деплой на GitHub Pages

- `<BrowserRouter>` создаётся в `src/app/index.tsx` с `basename = BASE_PATH || undefined`
  (`BASE_PATH` — из `shared/config`, прокидывается DefinePlugin из `process.env.BASE_PATH`).
- В dev `BASE_PATH=/` → `basename` пустой — адреса как раньше. На Pages CI задаёт
  `BASE_PATH=/georazum/` → маршруты живут под `/georazum/`, Link/navigate/`<Navigate>`
  работают автоматически.
- Жёсткие переходы вне роутера (полная перезагрузка на 401 в `app/providers/auth.tsx`,
  `window.open` отчёта в `features/order-actions/ui/actions.tsx`) префиксуют `BASE_PATH`
  вручную (в `Header.tsx`/`LevelCard.tsx` используют `useNavigate`).
- SPA-фолбэк: CI-воркфлоу копирует `dist/index.html` → `dist/404.html`; GitHub Pages
  отдаёт его (статус 404, но HTML приложения) для неизвестных путей.
- Локальный .env c `BASE_PATH=/` и `API_URL=` (пусто) — gitignored;
  шаблон — `client/.env.example`.

### Мок-режим (сайт на статике без бэкенда)

GitHub Pages не может запустить Express, поэтому для демо данные подставляются
прямо в браузере. Логика флага `USE_MOCKS` (в `rspack.config.ts`, DefinePlugin
инжектит `process.env.USE_MOCKS`):

- `USE_MOCKS=true` — всегда моки; `USE_MOCKS=false` — всегда реальный API;
- не задано: **продакшен-сборка без `API_URL` включает моки автоматически**,
  dev (прокси `/api` → 4000) и сборка с `API_URL` ходят на реальный API.

Реализация — `client/src/shared/api/mock/` (зеркало сервера):

| Файл               | Роль                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data.ts`          | in-memory хранилище + сид (уровни, участки, оферта, пользователи, заказы). Зеркало `server/src/db.js`                                             |
| `report.ts`        | генератор отчёта S/M/L. Зеркало `server/src/report.js`                                                                                            |
| `handlers.ts`      | роутер запросов: все эндпоинты `/api`, валидация, статусы, оплата (карта-отказ `0000…` → 402), генерация с таймерами. Зеркало `server/src/app.js` |
| `handlers.test.ts` | 5 smoke-тестов: логин, 401, публичные данные, полный цикл заказ→оплата→генерация→отчёт                                                            |

Подключение — в `shared/api/client.ts`: `USE_MOCKS` → динамический
`import("./mock/handlers")` (отдельный чанк, грузится только в мок-режиме;
в обычной сборке ветка вырезается). Данные в памяти сессии — перезагрузка
страницы сбрасывает их (как in-memory БД сервера).

### Команды

| Команда             | Что делает                                                              |
| ------------------- | ----------------------------------------------------------------------- |
| `npm run dev`       | Rspack dev-server + HMR на http://127.0.0.1:5173 (прокси `/api` → 4000) |
| `npm run build`     | Продакшен-сборка в `client/dist`                                        |
| `npm run typecheck` | `tsc --noEmit`                                                          |
| `npm test`          | Vitest run (42 теста, jsdom)                                            |

### Структура (FSD)

```
client/src/
├── app/            Сборка приложения: index.tsx (entry), App.tsx (роуты + гварды),
│   ├── router/     guards.tsx (Protected → /login, AdminOnly → /cabinet)
│   ├── providers/  auth.tsx (AuthContext, токен в localStorage)
│   └── styles/     _tokens.scss (палитра), _base.scss, _ui.scss, index.scss
├── pages/          17 страниц <Name>Page.tsx: home, about, levels, tariffs, examples,
│                   documents, contacts, login, register, recovery, order, order-status,
│                   pay, report, cabinet, admin, not-found
├── widgets/        header, footer, layouts (PublicLayout), sidebar (SidebarLayout),
│                   status-badge, level-card, order-card, recent-events, admin,
│                   faq, report-view
├── features/       auth (SignIn/SignUp/Recovery), order-wizard (5 шагов), pay (PayForm),
│                   order-actions (Retry/Resend/DownloadReportLink), feedback,
│                   profile, admin/forms (LevelForm/OrderStatusForm/UserBlockButton/OfferForm)
├── entities/       10 доменных сущностей: level, user, parcel, offer, document,
│                   order (модель с 10 статусами), payment, notification, report, admin
└── shared/         api (client.ts: ApiError, apiGet/Post/Patch/Put, setUnauthorizedHandler),
                    config, icons (SVG-компоненты: actions/logo/nav/status),
                    lib (format: fmtPrice/phoneHref; validators), ui (Button, Input,
                    Textarea, Select, Checkbox, Field, Card, Tabs, Spinner, Alert,
                    EmptyState, StatCard, Table), testing (setup.ts)
```

### Маршруты (реализованы в `App.tsx`)

Все страницы загружаются лениво через `lazyPage` (`app/router/lazy.tsx`) —
`React.lazy` + `Suspense` с фолбэком `Loading`, по одному чанку на страницу.

- Общий каркас `PublicLayout` (шапка + футер): `/`, `/about`, `/levels`,
  `/tariffs`, `/examples`, `/documents`, `/contacts`, `/login`, `/register`,
  `/recovery`.
- Под `Protected`: `/order` (визард), `/order/:id` (статус, поллинг 2 с),
  `/order/:id/pay`.
- `/cabinet` (Protected) и `/admin` (AdminOnly) — со своим каркасом
  `SidebarLayout`, табы через `?tab=` (ЛК: overview/orders/reports/payments/
  documents/profile/support; админка: overview/orders/users/tariffs/generations/offer).
- `/order/:id/report` (Protected) — без шапки и футера, для печати
  (`window.print()` + `@media print`, `.no-print`).
- `*` → `NotFoundPage`.

### Потоки данных на клиенте

- **Auth**: `AuthProvider` (shared-уровень приложения) читает `gr_token` /
  `gr_user` из localStorage; `api`-клиент подставляет `Authorization: Bearer`;
  на 401 — `setUnauthorizedHandler` → сброс и редирект на `/login`.
- **Заказ**: визард (5 шагов: кадастровый номер → проверка участка → уровень →
  инвест-поля для L → акцепт оферты с версией) → `POST /api/orders` → редирект
  на оплату.
- **Оплата**: `PayForm` валидирует карту (16 цифр, ММ/ГГ, CVV, владелец) →
  `POST /api/orders/:id/pay`. Успех → сразу «Передан в обработку» (бэкенд
  синхронно запускает генерацию), редирект на `/order/:id`.
- **Статус**: поллинг каждые 2 с до «Готово» / ошибки; по «Готово» — ссылка на
  отчёт.
- **Отчёт**: `GET /api/orders/:id/report` → `ReportView` рендерит разделы по
  уровню; «Скачать PDF» = `window.print()`.

## Инфраструктура

- Переменная окружения: `PORT` (по умолчанию 4000).
- ТЗ в корне: `ГР ТЗ сайт.docx`.
- `.gitignore`: `node_modules/`, `dist/`, `.env`, `.docx` артефакты не трогаем.
