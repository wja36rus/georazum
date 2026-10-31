"use strict";

/* Точка входа API-сервера «Гео Разум». */

const app = require("./app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log("[georazum] API запущен на http://127.0.0.1:" + PORT);
  console.log("[georazum] Демо-доступы: ivan@mail.ru / demo1234, admin@georazum.ru / admin123");
});
