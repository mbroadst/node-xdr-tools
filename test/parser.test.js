'use strict';
const parse = require('../lib/xdr_parser');

debugger;
let result = parse('const REMOTE_STRING_MAX = 4194304;');
console.dir(result);
