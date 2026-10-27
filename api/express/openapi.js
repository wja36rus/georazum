"use strict";

/*
 * OpenAPI 3.0 спецификация «Гео Разум» API.
 * Просмотр UI: http://127.0.0.1:3001/api-docs  (Swagger UI)
 * Сырой JSON: http://127.0.0.1:3001/api-docs.json
 */

module.exports = {
  openapi: "3.0.0",
  info: {
    title: "Гео Разум API",
    version: "1.0.0",
    description:
      "Мок REST API платформы «Гео Разум»: авторизация, анализ участков, " +
      "заказы отчётов, баланс и платежи, B2B-заявки. Данные — в памяти процесса " +
      "(после рестарта сбрасываются).",
  },
  servers: [{ url: "http://127.0.0.1:3001", description: "Локальный мок-сервер" }],
  tags: [
    { name: "Авторизация", description: "Вход, выход, профиль" },
    { name: "Каталог", description: "Тарифы и модули отчётов" },
    { name: "Участки", description: "Поиск участка по кадастровому номеру" },
    { name: "Заказы", description: "Создание и история заказов отчётов" },
    { name: "Платежи", description: "Баланс, история платежей, пополнение" },
    { name: "Лиды", description: "B2B/B2G заявки на интеграцию" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer" },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string", example: "Требуется авторизация." } },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "u1" },
          name: { type: "string", example: "Иван Иванов" },
          email: { type: "string", example: "ivan@mail.ru" },
          phone: { type: "string", example: "+7 (900) 123-45-67" },
          balance: { type: "integer", example: 14510 },
          role: { type: "string", example: "Инвестор / Девелопер" },
          status: { type: "string", example: "Постоянный клиент" },
        },
      },
      Parcel: {
        type: "object",
        properties: {
          id: { type: "string", example: "36:25:6945030:776" },
          address: { type: "string", example: "Воронежская обл., Рамонский р-н, урочище «Подгоренская дача»" },
          area: { type: "string", example: "11 203 м² (1,1 га)" },
          cadastralValue: { type: "string", example: "6 412 485 ₽" },
          category: { type: "string", example: "Земли лесного фонда" },
          vri: { type: "string", example: "Осуществление рекреационной деятельности" },
          limits: { type: "array", items: { type: "string" }, example: ["Приаэродромная территория", "Зона охраняемого объекта"] },
          buildable: { type: "string", example: "9 691 м²" },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string", example: "o1044" },
          date: { type: "string", example: "27.10.2026" },
          parcel: { type: "string", example: "36:25:6945030:776" },
          address: { type: "string", example: "Воронежская обл., Рамонский р-н" },
          tariff: { type: "string", example: "Инвестор / Девелопер" },
          status: { type: "string", enum: ["В работе", "Готов", "Возврат"] },
        },
      },
      Payment: {
        type: "object",
        properties: {
          id: { type: "string", example: "p5" },
          date: { type: "string", example: "27.10.2026" },
          desc: { type: "string", example: "Пополнение баланса" },
          amount: { type: "integer", example: 2000 },
          status: { type: "string", enum: ["Оплачен", "Зачислен"] },
        },
      },
    },
  },
  paths: {
    "/api/login": {
      post: {
        tags: ["Авторизация"],
        summary: "Вход. Мок: подходит любой корректный email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email", example: "ivan@mail.ru" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Токен и профиль пользователя",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string", example: "a1b2c3d4…" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          400: { description: "Некорректный email", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/logout": {
      post: {
        tags: ["Авторизация"],
        summary: "Выход: инвалидирует токен",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "ok" },
          401: { description: "Требуется авторизация", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/me": {
      get: {
        tags: ["Авторизация"],
        summary: "Профиль текущего пользователя",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Профиль", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" } } } } } },
          401: { description: "Требуется авторизация", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/tariffs": {
      get: {
        tags: ["Каталог"],
        summary: "Список тарифов (ролей)",
        responses: {
          200: {
            description: "Тарифы",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tariffs: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", example: "investor" },
                          name: { type: "string", example: "Инвестор / Девелопер" },
                          price: { type: "integer", example: 6990 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/modules": {
      get: {
        tags: ["Каталог"],
        summary: "Список дополнительных модулей",
        responses: {
          200: {
            description: "Модули",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    modules: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", example: "eco" },
                          name: { type: "string", example: "ЭкоКонтроль" },
                          price: { type: "integer", example: 490 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/parcels/search": {
      post: {
        tags: ["Участки"],
        summary: "Поиск участка по кадастровому номеру",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["query"],
                properties: { query: { type: "string", example: "36:25:6945030:776" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Найден участок", content: { "application/json": { schema: { type: "object", properties: { parcel: { $ref: "#/components/schemas/Parcel" } } } } } },
          404: { description: "Участок не найден", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          400: { description: "Пустой запрос", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/orders": {
      post: {
        tags: ["Заказы"],
        summary: "Создать заказ отчёта",
        description:
          "`payment: \"balance\"` — оплата с баланса (требует токен, списывает средства; 402 при нехватке). " +
          "`payment: \"card\"` — имитация оплаты картой без авторизации.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "phone", "roleId", "payment"],
                properties: {
                  name: { type: "string", example: "Иван Иванов" },
                  email: { type: "string", format: "email", example: "ivan@mail.ru" },
                  phone: { type: "string", example: "+7 (900) 123-45-67" },
                  roleId: { type: "string", enum: ["dachnik", "realtor", "investor", "lawyer", "combo"], example: "investor" },
                  moduleIds: { type: "array", items: { type: "string", enum: ["eco", "build", "cadastre"] }, example: ["eco"] },
                  parcelId: { type: "string", example: "36:25:6945030:776" },
                  payment: { type: "string", enum: ["balance", "card"], example: "balance" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Заказ создан",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    order: { $ref: "#/components/schemas/Order" },
                    total: { type: "integer", example: 7480 },
                    balance: { type: "integer", description: "Остаток баланса после оплаты (balance)", example: 7030 },
                  },
                },
              },
            },
          },
          400: { description: "Ошибка валидации", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Оплата с баланса требует входа", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          402: { description: "Недостаточно средств на балансе", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      get: {
        tags: ["Заказы"],
        summary: "История заказов",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Заказы", content: { "application/json": { schema: { type: "object", properties: { orders: { type: "array", items: { $ref: "#/components/schemas/Order" } } } } } } },
          401: { description: "Требуется авторизация", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/orders/{id}/report": {
      get: {
        tags: ["Заказы"],
        summary: "Ссылка на готовый отчёт",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", example: "o1042" } }],
        responses: {
          200: { description: "Ссылка на PDF-демо", content: { "application/json": { schema: { type: "object", properties: { report: { type: "object", properties: { id: { type: "string" }, pdfUrl: { type: "string", example: "report-demo.html" } } } } } } } },
        },
      },
    },
    "/api/balance": {
      get: {
        tags: ["Платежи"],
        summary: "Текущий баланс",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Баланс", content: { "application/json": { schema: { type: "object", properties: { balance: { type: "integer", example: 14510 } } } } } },
          401: { description: "Требуется авторизация", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/payments": {
      get: {
        tags: ["Платежи"],
        summary: "История платежей",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Платежи", content: { "application/json": { schema: { type: "object", properties: { payments: { type: "array", items: { $ref: "#/components/schemas/Payment" } } } } } } },
          401: { description: "Требуется авторизация", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/payments/topup": {
      post: {
        tags: ["Платежи"],
        summary: "Пополнение баланса (имитация)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount", "card", "expiry"],
                properties: {
                  amount: { type: "integer", minimum: 100, example: 2000 },
                  card: { type: "string", example: "4111111111111111" },
                  expiry: { type: "string", example: "12/28" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Баланс пополнен", content: { "application/json": { schema: { type: "object", properties: { balance: { type: "integer", example: 16510 }, payment: { $ref: "#/components/schemas/Payment" } } } } } },
          400: { description: "Ошибка валидации", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Требуется авторизация", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/leads": {
      post: {
        tags: ["Лиды"],
        summary: "B2B/B2G заявка на интеграцию",
        description: "Контакт — email или телефон (11 цифр).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "contact", "company"],
                properties: {
                  name: { type: "string", example: "Иван Иванов" },
                  contact: { type: "string", example: "+7 (900) 000-00-00" },
                  company: { type: "string", example: "Агро-Холдинг" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Заявка принята", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, message: { type: "string" } } } } } },
          400: { description: "Ошибка валидации", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
};
