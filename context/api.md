# Справочник API «Гео Разум»

Базовый URL: `http://127.0.0.1:4000`. Формат: JSON. Авторизация:
заголовок `Authorization: Bearer <token>` (кроме публичных эндпоинтов).
Ошибки: `{ "error": "текст" }` с HTTP-кодом 4xx. 404 для неизвестных путей.

## Авторизация и профиль

### POST /api/auth/register — публичный

Тело: `firstName` (буквы, ≥2), `lastName`, `email`, `phone` (11 цифр),
`password` (≥8), `confirmPassword`, **`consentPd: true`**, **`consentTerms: true`**.
Ответ `201`: `{ token, user }`. Дубликат email → 409. Письмо-подтверждение —
мок (аккаунт сразу `confirmed: true`).

### POST /api/auth/login — публичный

Тело: `email`, `password`. Ответ: `{ token, user }`. Ошибки: 401 (неверные
данные), 403 (заблокирован).

### POST /api/auth/logout — auth

Удаляет текущий токен. Ответ: `{ ok: true }`.

### GET /api/auth/me — auth

Ответ: `{ user }`.

### PATCH /api/auth/profile — auth

Любые из: `firstName`, `lastName`, `phone` (11 цифр), `email` (409 при занятом).
Ответ: `{ user }`.

### PATCH /api/auth/password — auth

Тело: `currentPassword`, `newPassword` (≥8). Завершает остальные сессии.
Ответ: `{ ok: true, token }` (новый токен).

### POST /api/auth/recovery — публичный

Тело: `email`. Мок: письмо в `db.emails`, уведомление. Всегда `{ ok: true,
message }` (не раскрывает, есть ли email).

### POST /api/auth/delete-request — auth

Тело: `password`. Ставит `deleteRequestedAt`, уведомляет админов. Ответ:
`{ ok: true, message }`.

## Каталог (публичное)

### GET /api/health

`{ ok: true, service: "georazum", time }`.

### GET /api/levels

`{ levels: [...] }` — 3 уровня `s/m/l` с полями `id, name, tagline, price,
duration, audience, includes[], results[]` (+ `investorFields[]` для l).

### GET /api/offer

`{ offer: { version, updatedAt, title, text[] } }`.

### GET /api/documents

`{ documents: [{ id, title, updatedAt }] }` — id: `offer | privacy | refunds`.

### GET /api/documents/:id

`{ document: { id, title, updatedAt, text[] } }`. Оферта берёт текст из
`db.offer.text`. 404 если нет.

### GET /api/examples/report

Демо-отчёт уровня L (для страницы «Примеры»): `{ report }`.

## Участки

### GET /api/parcels/:cadastral — auth

Формат `XX:XX:XXXXXXX:XXX`. 400 — неверный формат; 404 — не найден.
Ответ: `{ parcel: { cadastral, address, area, areaSqm, cadastralValue, category, vri,
restrictions[] } }`.

### POST /api/parcels/mutual — auth (только в мок-режиме)

Проверка взаимного расположения участков (п. 2.2 User Journey). Реализован
только в клиентских моках (`client/src/shared/api/mock/handlers.ts`), на
реальном сервере отсутствует.

Тело: `{ cadastrals: string[] }` (2+).
Ответ: `{ parcels, totalArea: "N м²", count, allAdjacent: boolean, pairs:
[{ a, b, adjacent, distance }] }`. `distance` — пустая строка для смежных,
иначе «N м» / «N.N км». Для несмежных клиент запрашивает подтверждение.

## Заказы

### POST /api/orders — auth

Тело: `cadastral` (один участок) **или** `cadastrals: string[]` (несколько,
п. 2.1 User Journey; моки поддерживают оба формата, реальный сервер — только
`cadastral`), `level` (`s|m|l`), `offerAccepted: true`, `offerVersion`
(= `db.offer.version`), `customer?` (данные заказчика: `{type: "person" |
"ip" | "company", email, ...}`, моки), `params?` (объект; для M/L — анкета,
для L — инвест-поля).
Ошибки: 400 формат/не найден/оферта не принята/уровень недоступен; 409 —
устаревшая версия оферты; 404 — участок не найден (генерация не запускается).
Ответ `201`: `{ order: orderFull }` со статусом «Ожидает оплаты»; у заказа
`parcel` = первый участок, `parcels[]` (моки) — все.

### GET /api/orders — auth

`{ orders: [orderSummary] }` — только свои.

### GET /api/orders/:id — auth

`{ order: orderFull }`. orderFull = summary + `parcel, parcels? (все участки,
моки), customer? (данные заказчика, моки), params, offer,
statusHistory[], transactionId, generationAttempts, payment` (последний платёж
заказа, любого статуса).

### POST /api/orders/:id/pay — auth

Тело: `card: { number, expiry (ММ/ГГ), cvv, holder }`.

- 400 — невалидная карта / заказ уже оплачен / нет прав.
- **402** — карта `0000000000000000` (отказ банка; платёж «Ошибка», статус
  возвращается к «Ожидает оплаты»).
- 200 — успех: `{ order, payment }`. Сразу запускается генерация (статус может
  уже быть «Передан в обработку»).

### POST /api/orders/:id/retry — auth

Повторная генерация. Для пользователя — только при «Ошибка генерации» /
«Требуется вмешательство специалиста»; админ — всегда. Ответ: `{ order }`.

### POST /api/orders/:id/resend-report — auth

Повторная отправка отчёта на email (мок в `db.emails`). 400 — отчёта нет.
Ответ: `{ ok: true, to: email }`.

### GET /api/orders/:id/report — auth

`{ report: { id, orderId, cadastral, level, title, generatedAt, summary,
sections[] } }`. 404 — отчёт ещё не готов. Собирается лениво. Для
многоучастковых заказов (моки): в `cadastral` — номера через запятую,
`summary.area` — суммарная площадь.

## Платежи и уведомления

### GET /api/payments — auth

`{ payments: [...] }` — свои, новый-первый.

### GET /api/notifications — auth

`{ notifications: [...] }` — свои, новые-первыми.

### POST /api/notifications/read — auth

Тело: `id?` — конкретное уведомление или все (без id). Ответ: `{ ok: true }`.

## Обратная связь

### POST /api/feedback — публичный

Тело: `name`, `email`, `message` (≥10 симв.). Ответ: `{ ok: true, message }`.
Уведомляет админов (тип `lead`).

## Админка (все — requireAdmin)

### GET /api/admin/stats

`{ stats: { users, orders, byLevel: {s,m,l}, paidSum, completed, errors,
avgGenerationSeconds, activeGenerations, conversion } }`.

### GET /api/admin/users?q=строка

Поиск по `name`, `email`, `phone` (case-insensitive). `{ users: [...,
ordersCount, deleteRequestedAt] }`.

### PATCH /api/admin/users/:id/block

Тело: `{ blocked: bool }`. Блокировка удаляет токены. Админа блокировать нельзя
(400). Ответ: `{ user }`.

### GET /api/admin/users/:id/orders

`{ orders: [orderSummary] }`.

### GET /api/admin/orders?q=&level=&status=

Фильтры: q — по id заказа или кадастровому номеру; level `s|m|l`; status — любой
из 10. Ответ: `{ orders: [...orderSummary, userId, userName, userEmail,
statusHistory, params], statuses: [...] }`.

### PATCH /api/admin/orders/:id/status

Тело: `{ status }` (из 10). При «Готово» — отчёт строится, если нет; при
ошибках — уведомление пользователю. Ответ: `{ order }`.

### GET /api/admin/generations

`{ generations: [{ id, orderId, level, attempts, status, startedAt, finishedAt,
durationSeconds }] }` — очередь генераций (новые-первыми).

### PATCH /api/admin/levels/:id

Тело (любое из): `price` (>0), `duration`, `tagline`, `available` (bool).
Ответ: `{ levels }`. Оплаченные заказы не меняются (цена в заказе).

### PUT /api/admin/offer

Тело: `version`, `text` (массив строк или текст через \n). Обновляет оферту и
дату документа. Ответ: `{ offer }`. После этого старые `offerVersion` дают 409
при создании заказов.

## Мини-шпаргалка для клиента

- Регистрация: `consentPd`, `consentTerms` (не путать с офертой заказа).
- Bearer-токен: `localStorage` (`gr_token`), пользователь — `gr_user`.
- Порядок оплаты: создать заказ → экран оплаты (карта) → после успеха поллинг
  `GET /api/orders/:id` каждые ~2 с до статуса «Готово».
- Проверка доступности участка: `GET /api/parcels/:cadastral` до оформления.
- Многоучастковый заказ: на шаге 1 визарда добавить несколько номеров,
  `POST /api/parcels/mutual` покажет смежность/расстояние; оформить заказ с
  `cadastrals[]`.
- Печать отчёта: страница `report` с кнопкой `window.print()`. Скачивание в
  админке/ЛК — та же страница.
- Демо-отчёт: `GET /api/examples/report` (публичный, уровень L).
