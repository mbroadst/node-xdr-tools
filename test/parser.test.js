'use strict';
const parse = require('../lib/xdr_parser'),
      expect = require('chai').expect;

const check = input => {
  let result = parse(input);
  expect(result.lexErrors).to.be.empty;
  expect(result.parseErrors).to.be.empty;
};

suite('XdrParser', () => {
  test('const declaration', () => check('const REMOTE_STRING_MAX = 4194304;'));
  test('typedef fixed size', () => check('typedef string remote_nonnull_string<REMOTE_STRING_MAX>;'));
  test('typedef pointer', () => check('typedef remote_nonnull_string *remote_string;'));
});

