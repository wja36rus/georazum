# Локальные правила для агентов — «Гео Разум»

Проект-локальные правила (локальная память для ИИ-агентов). Глобальные правила
пользователя применяются всегда; этот файл дополняет их особенностями проекта.

## Что за проект

SaaS-сервис «Гео Разум» — аналитическое заключение по земельному участку по
кадастровому номеру. Покупаются уровни анализа **S / M / L** (цена 4 900 /
14 900 / 49 900 ₽, срок до 24 ч / 3 сут / 7 сут). Заказ → акцепт оферты → оплата
картой → асинхронная генерация отчёта (10 статусов, п. 8.3 ТЗ) → PDF.

- **Backend**: Node.js + Express, готов и покрыт smoke-тестом (`server/test.js`).
- **Frontend**: React 19 + TypeScript (strict) + **Rspack** (не Vite!), FSD,
  SCSS, SVG-компоненты, Vitest — готов, см. `context/architecture.md`.
- База данных — in-memory `server/src/db.js`: рестарт сервера = сброс данных.

## Команды

| Команда                          | Что делает                                         |
| -------------------------------- | -------------------------------------------------- |
| `cd server && npm test`          | Smoke-тест всего API (32 проверки, Node 18+)       |
| `cd server && npm start`         | API на http://127.0.0.1:4000                       |
| `cd client && npm install`       | Установка зависимостей клиента                     |
| `cd client && npm run dev`       | Rspack dev-server :5173, HMR, прокси `/api` → 4000 |
| `cd client && npm run build`     | Продакшен-сборка в `client/dist`                   |
| `cd client && npm run typecheck` | `tsc --noEmit` (strict, `noUnusedLocals`)          |
| `cd client && npm test`          | Vitest run (37 тестов, jsdom)                      |

## Дизайн (обязательно)

Основные цвета сайта — **голубой и зелёный** (явное требование пользователя):

```css
--blue: #1f9ad6;
--blue-dark: #1677b3;
--green: #2e9e5b;
--green-dark: #237a46;
--grad: linear-gradient(90deg, #1f9ad6, #2e9e5b);
--bg: #f2f5f8;
--card: #fff;
--border: #e2e8f0;
--text: #1c2632;
--muted: #66727f;
--sidebar: #232f3e;
--sidebar-2: #1b2531;
--danger: #e05252;
--warn: #d98b1f;
```

Референс: корпоративный дашборд — тёмный сайдбар (~280px), сетка белых карточек,
правая колонка «Недавние события». Детали: `context/design.md`.

## Клиент: структура и правила (FSD)

```
client/src/
├── app/        сборка: index.tsx, App.tsx (роуты), router/guards.tsx, providers/auth.tsx, styles/
├── pages/      17 страниц по одной папке: pages/<name>/ui/<Name>Page.tsx
├── widgets/    header, footer, layouts/PublicLayout, sidebar/SidebarLayout, status-badge,
│               level-card, order-card, recent-events, admin/, faq, report-view
├── features/   auth/, order-wizard/ (5 шагов), pay/, order-actions/, feedback/, profile/, admin/forms/
├── entities/   10 доменных сущностей (level, user, parcel, offer, document, order, payment,
│               notification, report, admin)
└── shared/     api/ (client.ts), config/, icons/ (SVG-компоненты), lib/ (format, validators),
                ui/ (Button, Input, …), testing/ (setup.ts)
```

Правила:

- Импорт алиаса `@` → `client/src` (например `@/entities/order/model`).
- Направление зависимостей FSD: страницы → виджеты/фичи/entities → shared.
  Виджеты могут импортировать фичи (напр. OrderCard → LEVEL_META).
- Страницы лежат в `pages/<name>/ui/<Name>Page.tsx` (не `components/`!).
  Папки `components/` в src не должно существовать.
- SCSS колокейтед: `import "./x.scss"` в компоненте; глобальные стили —
  `app/styles/` (`_tokens.scss` палитра, `_base.scss`, `_ui.scss`, `index.scss`).
- Иконки: **SVG как React-компоненты** в `shared/icons/*.tsx` (не картинками).
- Тесты рядом с кодом: `*.test.ts(x)`, Vitest + jsdom.
- `noUnusedLocals` строгий: при правках сразу гонять `npm run typecheck`.
- Сборка читает `client/.env` (dotenv в `rspack.config.ts`): `API_URL` и
  `BASE_PATH`. `.env` в git не коммитится — образец в `.env.example`.
  В CI переменные задаются в workflow (`vars.API_URL`).
- `fmtPrice` через `toLocaleString("ru-RU")` даёт NBSP-разделитель (U+00A0) —
  не «чинить» под обычный пробел, тесты это нормализуют.
- `phoneHref` возвращает `tel:+` + только цифры.
- `AdminUser` импортируется из `@/entities/user/api`, НЕ из `entities/admin/api`.
- Отчёт открывается по `/order/:id/report` без шапки/футера — печать
  `window.print()` + `@media print`, элементы шапки/кнопок — класс `.no-print`.
- Роутер — react-router-dom v7 (`<Routes>`, гварды в `app/router/guards.tsx`).
- Страницы в `App.tsx` регистрируются **лениво** через `lazyPage`
  (`app/router/lazy.tsx`) — не импортировать страницы статически.

## Протокол API (кратко)

- Базовый URL: `http://127.0.0.1:4000`; токен в заголовке `Authorization: Bearer <token>`.
- Полный справочник: `context/api.md`.
- Регистрация требует `consentPd` и `consentTerms` (именно эти ключи!).
- Демо-аккаунты: `ivan@mail.ru / demo1234` (пользователь), `admin@georazum.ru / admin123` (админ).
- Тестовая карта-отказ: `0000000000000000` → HTTP 402. Любая другая валидная карта — успех.
- Кадастровый формат: `XX:XX:XXXXXXX:XXX`. Доступные участки: три штуки из `db.js`.

## Соглашения и опасные места

- **Не ломать `orderFull` / `orderSummary`** в `app.js`: ответы собираются явными
  полями, `_jobId` из `generation.js` не должен утекать наружу.
- **Сид-заказ `GR-1001` имеет `reportId: "R-1"`**, которого нет в `db.reports` —
  отчёт собирается лениво при `GET /api/orders/:id/report` (buildReport).
- `startGeneration` синхронно переводит заказ в «Передан в обработку» уже при
  ответе `/pay` — на клиенте не закладываться на статус «Оплачен» как конечный.
- `orderFull` включает `payment` = последний платёж заказа (любого статуса).
- Мок-письма пишутся в `db.emails`; уведомления — в `db.notifications`.
- Порт **3001** может быть занят старым процессом — используем **4000**.
- Смена пароля завершает все остальные сессии пользователя.
- Windows: `process.exit` с живыми fetch-соединениями роняет процесс assertion в
  libuv — в тестах использовать `exitCode` + `server.closeAllConnections()`.
- `write_file` не создаёт родительские папки — создавать директории заранее.
- Для больших файлов держать объём умеренным (при очень больших вставках
  `write_file` может упасть с «tool input was not fully received»).

## Моки (осознанный предел прототипа)

Оплата, email, кадастровый реестр, генерация отчёта и аналитика — заглушки.
Прод-замена: PostgreSQL + Redis, JWT, BullMQ, реальный платёжный провайдер,
кадастровые источники, SMTP. Менять моки на реальные интеграции — только по
явной просьбе пользователя.

## Git

- Сообщения коммитов: по глобальным правилам пользователя (кратко, imperative
  mood, подпись ≤ 50 симв., тело при необходимости с переносом на 72).
- Не коммитить без явной просьбы. Ветки не создавать без просьбы.
- `node_modules/`, `dist/`, `.env` не коммитить.

## Проверка перед сдачей

1. `cd server && npm test` — все проверки зелёные (32/32).
2. Если трогал клиент: `cd client && npm run typecheck` (0 ошибок),
   `npm test` (37/37) и `npm run build` без ошибок.
3. Диагностики: без новых ошибок/предупреждений в изменённых файлах.

Порты: API — 4000, dev-сервер — 5173. Если заняты — переиспользовать уже
запущенные процессы, новые дадут EADDRINUSE.
