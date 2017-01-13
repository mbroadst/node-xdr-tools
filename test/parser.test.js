'use strict';
const parse = require('../lib/xdr_parser'),
      expect = require('chai').expect;

const check = input => {
  let result = parse(input);
  if (result.lexErrors.length) console.dir(result.lexErrors, { depth: null });
  expect(result.lexErrors).to.be.empty;
  if (result.parseErrors.length) console.dir(result.parseErrors, { depth: null });
  expect(result.parseErrors).to.be.empty;
};

suite('XdrParser', () => {
  test('const declaration', () => check('const REMOTE_STRING_MAX = 4194304;'));
  test('typedef fixed size', () => check('typedef string remote_nonnull_string<REMOTE_STRING_MAX>;'));
  test('typedef pointer', () => check('typedef remote_nonnull_string *remote_string;'));

  test('struct', () => {
    check(`
      struct remote_nonnull_domain {
          remote_nonnull_string name;
          remote_uuid uuid;
          int id;
      };
    `);
  });

  test('union', () => {
    check(`
    union remote_typed_param_value switch (int type) {
      case VIR_TYPED_PARAM_INT:
          int i;
      case VIR_TYPED_PARAM_UINT:
          unsigned int ui;
      case VIR_TYPED_PARAM_LLONG:
          hyper l;
      case VIR_TYPED_PARAM_ULLONG:
          unsigned hyper ul;
      case VIR_TYPED_PARAM_DOUBLE:
          double d;
      case VIR_TYPED_PARAM_BOOLEAN:
          int b;
      case VIR_TYPED_PARAM_STRING:
          remote_nonnull_string s;
    };
    `);
  });

  test('enum', () => {
    check(`
    enum remote_auth_type {
        REMOTE_AUTH_NONE = 0,
        REMOTE_AUTH_SASL = 1,
        REMOTE_AUTH_POLKIT = 2
    };
    `);
  });

  test('comments (single line)', () => check('/* this is a test single line comment */'));
  test('comments (multiline)', () => {
    check(`
    /* Notes:
     *
     * (1) The protocol is internal and may change at any time, without
     * notice.  Do not use it.  Instead link to libvirt and use the remote
     * driver.
     *
     * (2) See bottom of this file for a description of the home-brew RPC.
     *
     * (3) Authentication/encryption is done outside this protocol.
     *
     * (4) For namespace reasons, all exported names begin 'remote_' or
     * 'REMOTE_'.  This makes names quite long.
     */
    `);
  });

  test('comment (plus definiton)', () => {
    check(`
      /* A long string, which may NOT be NULL. */
      typedef string remote_nonnull_string<REMOTE_STRING_MAX>;
    `);
  });
});
