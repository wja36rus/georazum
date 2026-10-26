'use strict';
/* Запуск: node check.js — минимальная проверка расчетов и валидаторов заказа. */
const assert = require('assert');
const { TARIFFS, MODULES, totalPrice, isEmail, isPhone, isExpiryValid, formatPhone, formatCard, formatExpiry } = require('./app.js');

// Базовая цена без модулей
assert.strictEqual(totalPrice('dachnik', []), TARIFFS.dachnik.price);
// Модули суммируются поверх базового тарифа
assert.strictEqual(totalPrice('dachnik', ['eco']), TARIFFS.dachnik.price + MODULES.eco.price);
assert.strictEqual(totalPrice('investor', ['eco', 'build', 'cadastre']),
  TARIFFS.investor.price + MODULES.eco.price + MODULES.build.price + MODULES.cadastre.price);
// Мусорные id не ломают расчет и не дают скидку
assert.strictEqual(totalPrice('nope', ['nope']), 0);

assert.ok(isEmail('ivan@mail.ru') && !isEmail('ivan@mail') && !isEmail('ivan mail.ru'));
assert.ok(isPhone('+7 (900) 000-00-00') && !isPhone('+7 (900) 000-00'));

const now = new Date('2026-10-26T00:00:00Z');
assert.ok(isExpiryValid('12/28', now) && isExpiryValid('10/26', now));
assert.ok(!isExpiryValid('09/26', now) && !isExpiryValid('13/28', now) && !isExpiryValid('1/28', now));

assert.strictEqual(formatPhone('89001234567'), '+7 (900) 123-45-67');
assert.strictEqual(formatCard('4111111111111111'), '4111 1111 1111 1111');
assert.strictEqual(formatExpiry('1228'), '12/28');

console.log('check.js: ok');
