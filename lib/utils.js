/* eslint no-extend-native: ["error", { "exceptions": ["Number", "String", "Array"] }] */

'use strict';

/**
 * Number.prototype.format(n, x)
 *
 * @param {integer} n length of decimal
 * @param {integer} x length of sections
 * @return {string} Formatted number
 */
Number.prototype.format = function format(n, x) {
  const re = `\\d(?=(\\d{${x || 3}})+${(n > 0 ? '\\.' : '$')})`;
  return this.toFixed(Math.max(0, ~~n)).replace(new RegExp(re, 'g'), '$&,');
};

String.prototype.rpad = function rpad(padString, length) {
  let str = this;
  while (str.length < length) {
    str = str + padString;
  }
  return str;
};

const Utils = {};

Utils.shuffle = (arr) => {
  const a = arr;

  for (
    let j, x, i = a.length;
    i;
    j = Math.floor(Math.random() * i), x = a[--i], a[i] = a[j], a[j] = x);

  return a;
};

module.exports = Utils;
