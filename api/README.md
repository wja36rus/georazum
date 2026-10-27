# Гео Разум — REST API (мок, Express)

Мок-бэкенд под все нужды сайта: авторизация, участки, заказы отчётов, баланс,
платежи, лиды. Данные — в памяти процесса (после рестарта сбрасываются).

## Запуск

```
cd api/express
npm install
npm start          # http://127.0.0.1:3001
npm test           # прогон тестов по всем эндпоинтам
```

## Документация (Swagger)

- UI: http://127.0.0.1:3001/api-docs — интерактивная документация OpenAPI 3.0
- Спек: /api-docs.json — сырой JSON (источник: `openapi.js`)

Порт меняется переменной окружения `PORT`. Для использования с фронтенда
достаточно CORS-заголовков `Access-Control-Allow-Origin: *` (уже включены).

Сайт (`app.js`) обращается к API по адресу `http://127.0.0.1:3001`. Если сервер
не запущен, сайт не ломается: формы и заказы работают на локальных моках
(офлайн-фолбэк).

## Эндпоинты

| Метод | Путь                     | Тело / токен                                                                    | Ответ                                  |
| ----- | ------------------------ | ------------------------------------------------------------------------------- | -------------------------------------- |
| POST  | `/api/login`             | `{email}`                                                                       | `{token, user}`                        |
| POST  | `/api/logout`            | auth                                                                            | `{ok}`                                 |
| GET   | `/api/me`                | auth                                                                            | `{user}`                               |
| GET   | `/api/tariffs`           | —                                                                               | `{tariffs[]}`                          |
| GET   | `/api/modules`           | —                                                                               | `{modules[]}`                          |
| POST  | `/api/parcels/search`    | `{query}`                                                                       | `{parcel}` / 404                       |
| POST  | `/api/orders`            | `{parcelId, roleId, moduleIds, name, email, phone, payment: "balance"\|"card"}` | `{order, total, balance?}` / 400 / 402 |
| GET   | `/api/orders`            | auth                                                                            | `{orders[]}`                           |
| GET   | `/api/orders/:id/report` | —                                                                               | `{report:{pdfUrl}}`                    |
| GET   | `/api/payments`          | auth                                                                            | `{payments[]}`                         |
| POST  | `/api/payments/topup`    | auth, `{amount, card, expiry}`                                                  | `{balance, payment}`                   |
| GET   | `/api/balance`           | auth                                                                            | `{balance}`                            |
| POST  | `/api/leads`             | `{name, contact, company}`                                                      | `{ok, message}`                        |

auth = заголовок `Authorization: Bearer <token>` из ответа `/api/login`.
Все ответы — JSON. Ошибки — `4xx` c `{error: "..."}`.

Мок-пользователь: Иван Иванов, ivan@mail.ru, баланс 14 510 ₽.
Мок-участок: 36:25:6945030:776 (Воронежская обл., Рамонский р-н).
