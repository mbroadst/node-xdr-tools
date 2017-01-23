'use strict';
function ind(level) { return new Array((2 * level) + 1).join(' '); }
function omit(obj, keys) {
  let target = {};
  for (let i in obj) {
    if (keys.indexOf(i) >= 0) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
    target[i] = obj[i];
  }

  return target;
}

const XDR_TYPE_LUT = {
  'void': 'void',
  'bool': 'bool',
  'int': 'int',
  'hyper': 'hyper',
  'unsigned int': 'uint',
  'unsigned hyper': 'uhyper',
  'float': 'float',
  'double': 'double',
  'quadruple': 'quadruple',
  'string': 'string',
  'opaque': 'opaque'
};

function formatType(def) {
  if (def.optional) {
    return `xdr.option(${formatType(omit(def, 'optional'))})`;
  }

  if (!!def.size) {
    if (def.size.type === 'variable') {
      return (def.type === 'opaque') ?
         `xdr.varOpaque(${formatValue(def.size.value)})` :
         `xdr.varArray(${formatType(omit(def, 'size'))}, ${formatValue(def.size.value)})`;
    } else if (def.size.type === 'fixed') {
      return (def.type === 'opaque') ?
        `xdr.opaque(${formatValue(def.size.value)})` :
        `xdr.array(${formatType(omit(def, 'size'))}, ${formatValue(def.size.value)})`;
    }

    console.log('unknown size specification: ', def);
    return undefined;
  }

  return (Object.keys(XDR_TYPE_LUT).find(t => t === def.type)) ?
    `xdr.${XDR_TYPE_LUT[def.type]}()` :
    `xdr.lookup('${def.type}')`;
}

let KNOWN_CONSTANTS = [];
function formatValue(value) {
  if (isNaN(value)) {
    if (KNOWN_CONSTANTS.find(c => c === value)) return `xdr.lookup('${value}')`;
    return `$defs.${value}`;
  }

  return value;
}

function generateConstants(constants, level) {
  let generated = constants.reduce((result, constant) => {
    KNOWN_CONSTANTS.push(constant.name);
    result.push(ind(level) + `xdr.const('${constant.name}', ${formatValue(constant.value)});\n`);
    return result;
  }, []);

  return generated.join('');
}

function generateStructs(structs, level) {
  let generated = structs.reduce((result, struct) => {
    let out = '';
    out += ind(level) + `xdr.struct('${struct.name}', [\n`;
    out += struct.members.map(m => ind(level) + `  [ '${m.name}', ${formatType(m)} ]`).join(',\n');
    out += '\n' + ind(level) + ']);\n';
    result.push(out);
    return result;
  }, []);

  return generated.join('\n');
}

function generateTypedefs(typedefs, level) {
  let generated = typedefs.reduce((result, typedef) => {
    let t = typedef.name; // TODO: correct parser for typedef definitions
    result.push(ind(level) + `xdr.typedef('${t.name}', ${formatType(t)});\n`);
    return result;
  }, []);

  return generated.join('');
}

function generateEnums(enums, level) {
  let generated = enums.reduce((result, def) => {
    let out = '';
    out += ind(level) + `xdr.enum('${def.name}', {\n`;
    out += def.members.map(e => ind(level) + `  ${e.name}: ${e.value}`).join(',\n');
    out += '\n' + ind(level) + '});\n';
    result.push(out);
    return result;
  }, []);

  return generated.join('\n');
}

function generateUnions(unions, level) {
  let generated = unions.reduce((result, def) => {
    let out = '';
    out += ind(level) + `xdr.union('${def.name}', {\n`;
    out += ind(level) + `  switchOn: ${formatType(def.params)},\n`;
    out += ind(level) + '  switches: [\n';
    let cases = def.members.reduce((r, m) => {
      r.push(m.cases.map(c => ind(level) + `    [ ${formatValue(c.value)}, ${formatType(m.declaration)} ]`));
      return r;
    }, []);
    out += cases.join(',\n');
    out += '\n' + ind(level) + '  ]\n';
    out += ind(level) + '});\n';
    result.push(out);
    return result;
  }, []);

  return generated.join('\n');
}

function generateHeader(s) {
  let out = '';
  out += "'use strict';\n";
  out += "const XDR = require('js-xdr');\n\n";
  out += 'function setup($defs) {\n';
  out += '  return XDR.config(xdr => {\n';
  return out;
}

function generateFooter(s) {
  let out = '';
  out += '  });\n';
  out += '}\n\n';
  out += 'module.exports = setup;\n';
  return out;
}

module.exports = function(spec, options) {
  options = options || {};
  let level = options.level || 2;

  let generated = '';
  generated += generateHeader();
  generated += [
    generateConstants(spec.filter(r => r.type === 'const'), level),
    generateTypedefs(spec.filter(r => r.type === 'typedef'), level),
    generateUnions(spec.filter(r => r.type === 'union'), level),
    generateStructs(spec.filter(r => r.type === 'struct'), level),
    generateEnums(spec.filter(r => r.type === 'enum'), level)
  ].join('\n');
  generated += generateFooter();
  return generated;
};
