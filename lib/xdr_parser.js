'use strict';
const chevrotain = require('chevrotain');

// ----------------- lexer -----------------
const Lexer = chevrotain.Lexer;
const createToken = chevrotain.createToken;

const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /\s+/, group: Lexer.SKIPPED });
const CommentSection = createToken({ name: 'Comment', pattern: /\/\*(.|[\r\n])*?\*\//, group: Lexer.SKIPPED });
const IncludeSection = createToken({ name: 'IncludeSection', pattern: /%.*/, group: Lexer.SKIPPED });

const LBrace = createToken({ name: 'LBrace', pattern: /{/ });
const RBrace = createToken({ name: 'RBrace', pattern: /}/ });
const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
const RBracket = createToken({ name: 'RBracket', pattern: /]/ });
const LArrow = createToken({ name: 'LArrow', pattern: /</ });
const RArrow = createToken({ name: 'RArrow', pattern: />/ });
const LParen = createToken({ name: 'LParen', pattern: /\(/ });
const RParen = createToken({ name: 'RParen', pattern: /\)/ });
const Comma = createToken({ name: 'Comma', pattern: /,/ });
const Colon = createToken({ name: 'Colon', pattern: /:/ });
const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });
const Asterisk = createToken({ name: 'Asterisk', pattern: /\*/ });
const Equals = createToken({ name: 'Equals', pattern: /=/ });

// keywords
const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z][0-9a-zA-Z_]*/ });
const Keyword = createToken({ name: 'Keyword', pattern: Lexer.NA, longer_alt: Identifier });
const Bool = createToken({ name: 'Bool', pattern: /bool/, parent: Keyword });
const Case = createToken({ name: 'Case', pattern: /case/, parent: Keyword });
const Char = createToken({ name: 'Char', pattern: /char/, parent: Keyword });
const Const = createToken({ name: 'Const', pattern: /const/, parent: Keyword });
const Default = createToken({ name: 'Default', pattern: /default/, parent: Keyword });
const Double = createToken({ name: 'Double', pattern: /double/, parent: Keyword });
const Quadruple = createToken({ name: 'Quadruple', pattern: /quadruple/, parent: Keyword });
const Enum = createToken({ name: 'Enum', pattern: /enum/, parent: Keyword });
const Float = createToken({ name: 'Float', pattern: /float/, parent: Keyword });
const Hyper = createToken({ name: 'Hyper', pattern: /hyper/, parent: Keyword });
const Opaque = createToken({ name: 'Opaque', pattern: /opaque/, parent: Keyword });
const Short = createToken({ name: 'Short', pattern: /short/, parent: Keyword });
const String_ = createToken({ name: 'String_', pattern: /string/, parent: Keyword });
const Struct = createToken({ name: 'Struct', pattern: /struct/, parent: Keyword });
const Switch = createToken({ name: 'Switch', pattern: /switch/, parent: Keyword });
const Typedef = createToken({ name: 'Typedef', pattern: /typedef/, parent: Keyword });
const Union = createToken({ name: 'Union', pattern: /union/, parent: Keyword });
const Unsigned = createToken({ name: 'Unsigned', pattern: /unsigned/, parent: Keyword });
const Int = createToken({ name: 'Int', pattern: /int/, parent: Keyword });
const Void = createToken({ name: 'Void', pattern: /void/, parent: Keyword });

// constants
const HexConstant =
  createToken({ name: 'HexConstant', pattern: /0x[a-fA-F0-9]+/ });
const OctalConstant = createToken({ name: 'OctalConstant', pattern: /0[0-7]+/ });
const DecimalConstant = createToken({ name: 'DecimalConstant', pattern: Lexer.NA });
const DecimalConstantZero =
  createToken({ name: 'DecimalConstantZero', pattern: /0/, parent: DecimalConstant, longer_alt: HexConstant });
const DecimalConstantValue =
  createToken({ name: 'DecimalConstantValue', pattern: /-?[1-9][0-9]*/, parent: DecimalConstant });

const allTokens = [
  WhiteSpace, CommentSection, IncludeSection,

  Keyword,
  Bool, Case, Char, Const, Default, Double, Quadruple, Enum,
  Float, Hyper, Opaque, Short, String_, Struct, Switch, Typedef, Union,
  Void, Unsigned, Int,

  DecimalConstant, DecimalConstantZero,
  DecimalConstantValue, HexConstant, OctalConstant,

  Identifier,

  LBrace, RBrace, LBracket, RBracket, LArrow, RArrow, LParen, RParen,
  Comma, Colon, Semicolon, Equals, Asterisk
];

const XdrLexer = new Lexer(allTokens);


// ----------------- parser -----------------
const Parser = chevrotain.Parser;

class XdrParser extends Parser {
  constructor(input) {
    super(input, allTokens, { recoveryEnabled: true });

    const $ = this;

    // RULES
    $.RULE('typespec_declaration', () => {
      let type = $.SUBRULE($.type_specifier);
      let optional = false;
      $.OPTION(() => { $.CONSUME(Asterisk); optional = true; });
      let name = $.CONSUME(Identifier).image;

      let size = $.OPTION2(() => $.OR2([
        { ALT: () => {
          $.CONSUME(LBracket);
          let value = $.SUBRULE($.value);
          $.CONSUME(RBracket);
          return { type: 'fixed', value: value };
        }},
        { ALT: () => {
          $.CONSUME(LArrow);
          let value = $.OPTION3(() => $.SUBRULE2($.value));
          $.CONSUME(RArrow);
          return { type: 'variable', value: value };
        }}
      ]));

      let result = (!!size) ?
        { type: type, name: name, size: size } :
        { type: type, name: name };
      if (!!optional) result.optional = optional;
      return result;
    });

    $.RULE('opaque_declaration', () => {
      let declaration = $.OR([
        // "opaque" identifier "[" value "]"
        { ALT: () => {
          let type = $.CONSUME1(Opaque).image;
          let name = $.CONSUME1(Identifier).image;
          $.CONSUME(LBracket);
          let size = { type: 'fixed', value: $.SUBRULE($.value) };
          $.CONSUME(RBracket);
          return { type: type, name: name, size: size };
        }},

        // "opaque" identifier "<" [ value ] ">"
        { ALT: () => {
          let type = $.CONSUME2(Opaque).image;
          let name = $.CONSUME2(Identifier).image;
          $.CONSUME(LArrow);
          let size = { type: 'variable', value: $.OPTION(() => $.SUBRULE2($.value)) };
          $.CONSUME(RArrow);
          return { type: type, name: name, size: size };
        }}
      ]);

      return declaration;
    });

    $.RULE('declaration', () => {
      let declaration = $.OR([
        { ALT: () => $.SUBRULE($.typespec_declaration) },
        { ALT: () => $.SUBRULE($.opaque_declaration) },

        // "string" identifier "<" [ value ] ">"
        { ALT: () => {
          let type = $.CONSUME(String_).image;
          let name = $.CONSUME(Identifier).image;
          $.CONSUME(LArrow);
          let size = { type: 'variable', value: $.OPTION(() => $.SUBRULE($.value)) };
          $.CONSUME(RArrow);
          return { type: type, name: name, size: size };
        }},

        // "void"
        { ALT: () => {
          let type = $.CONSUME(Void).image;
          return { type: type };
        }}
      ]);

      return declaration;
    });

    // constant | identifier
    $.RULE('value', () => {
      let value = $.OR([
        { ALT: () => $.SUBRULE($.constant) },
        { ALT: () => $.CONSUME(Identifier) }
      ]);

      return typeof value.image !== 'undefined' ? value.image : value;
    });

    // decimal-constant | hexadecimal-constant | octal-constant
    $.RULE('constant', () => {
      let value = $.OR([
        { ALT: () => $.CONSUME(HexConstant) },
        { ALT: () => $.CONSUME(OctalConstant) },
        { ALT: () => $.CONSUME(DecimalConstant) }
      ]);

      return value.image;
    });

    $.RULE('type_specifier', () => {
      let type = $.OR([
        // [ "unsigned" ] "int"
        { ALT: () => {
          let typeName = [];
          typeName.push($.OPTION1(() => $.CONSUME1(Unsigned).image));
          typeName.push($.CONSUME(Int).image);
          return typeName.join(' ').trim();
        }},
        // [ "unsigned" ] "hyper"
        { ALT: () => {
          let typeName = [];
          typeName.push($.OPTION2(() => $.CONSUME2(Unsigned).image));
          typeName.push($.CONSUME(Hyper).image);
          return typeName.join(' ').trim();
        }},

        // extra types defined in libvirt remote definition
        // [ "unsigned" ] "char"
        { ALT: () => {
          let typeName = [];
          typeName.push($.OPTION3(() => $.CONSUME3(Unsigned).image));
          typeName.push($.CONSUME(Char).image);
          return typeName.join(' ').trim();
        }},
        // [ "unsigned" ] "short"
        { ALT: () => {
          let typeName = [];
          typeName.push($.OPTION4(() => $.CONSUME4(Unsigned).image));
          typeName.push($.CONSUME(Short).image);
          return typeName.join(' ').trim();
        }},

        // "float"
        { ALT: () => $.CONSUME(Float).image },
        // "double"
        { ALT: () => $.CONSUME(Double).image },
        // "quadruple"
        { ALT: () => $.CONSUME(Quadruple).image },
        // "bool"
        { ALT: () => $.CONSUME(Bool).image },
        // // enum-type-spec
        { ALT: () => $.SUBRULE($.enum_type_spec) },
        // struct-type-spec
        { ALT: () => $.SUBRULE($.struct_type_spec) },
        // // union-type-spec
        { ALT: () => $.SUBRULE($.union_type_spec) },
        // identifier
        { ALT: () => $.CONSUME(Identifier).image }
      ]);

      return type;
    });

    $.RULE('enum_type_spec', () => {
      let type = $.CONSUME(Enum).image;
      let members = $.SUBRULE($.enum_body);
      return { type: type, members: members };
    });

    $.RULE('enum_body', () => {
      let members = [];
      $.CONSUME(LBrace);
      $.MANY_SEP(Comma, () => {
        let name = $.CONSUME(Identifier).image;
        $.CONSUME(Equals);
        let value = $.SUBRULE($.value);
        members.push({ name: name, value: value });
      });
      $.CONSUME(RBrace);
      return members;
    });

    $.RULE('struct_type_spec', () => {
      let type = $.CONSUME(Struct).image;
      let members = $.SUBRULE($.struct_body);
      return { type: type, members: members };
    });

    $.RULE('struct_body', () => {
      let members = [];
      $.CONSUME(LBrace);
      $.MANY(() => {
        let member = $.SUBRULE($.declaration);
        $.CONSUME(Semicolon);
        members.push(member);
      });
      $.CONSUME(RBrace);
      return members;
    });

    $.RULE('union_type_spec', () => {
      let type = $.CONSUME(Union);
      let members = $.SUBRULE($.union_body);
      return { type: type, members: members };
    });

    $.RULE('union_body', () => {
      let type = 'union';
      $.CONSUME(Switch);
      $.CONSUME(LParen);
      let name = $.SUBRULE1($.declaration);
      $.CONSUME(RParen);
      $.CONSUME(LBrace);
      let members = [];
      $.MANY(() => members.push($.SUBRULE($.case_spec)));
      $.OPTION(() => { $.CONSUME(Default); $.CONSUME(Colon); $.SUBRULE2($.declaration); });
      $.CONSUME(RBrace);

      return { type: type, name: name, members: members };
    });

    $.RULE('case_spec', () => {
      let cases = [];
      $.MANY(() => {
        let type = $.CONSUME(Case).image;
        let value = $.SUBRULE($.value);
        $.CONSUME(Colon);
        cases.push({ type: type, value: value });
      });
      let decl = $.SUBRULE($.declaration);
      $.CONSUME(Semicolon);
      return { type: 'case', cases: cases, declaration: decl };
    });

    $.RULE('constant_def', () => {
      let type = $.CONSUME(Const).image;
      let name = $.CONSUME(Identifier).image;
      $.CONSUME(Equals);
      let value = $.OR([
        { ALT: () => $.SUBRULE($.constant) },
        { ALT: () => $.CONSUME2(Identifier).image }
      ]);
      $.CONSUME(Semicolon);

      return { type: type, name: name, value: value };
    });

    $.RULE('type_def', () => {
      let name, type, members;

      $.OR([
        // "typedef" declaration ";"
        { ALT: () => {
          type = $.CONSUME(Typedef).image;
          name = $.SUBRULE($.declaration);
          $.CONSUME1(Semicolon);
        }},
        // "enum" identifier enum-body ";"
        { ALT: () => {
          type = $.CONSUME(Enum).image;
          name = $.CONSUME1(Identifier).image;
          members = $.SUBRULE($.enum_body);
          $.CONSUME2(Semicolon);
        }},
        // "struct" identifier struct-body ";"
        { ALT: () => {
          type = $.CONSUME(Struct).image;
          name = $.CONSUME2(Identifier).image;
          members = $.SUBRULE($.struct_body);
          $.CONSUME3(Semicolon);
        }},
        // "union" identifier union-body ";"
        { ALT: () => {
          type = $.CONSUME(Union).image;
          name = $.CONSUME3(Identifier).image;
          members = $.SUBRULE($.union_body);
          $.CONSUME4(Semicolon);
        }}
      ]);

      return (!!members && members.length) ?
        { type: type, name: name, members: members } :
        { type: type, name: name };
    });

    // type-def | constant-def
    $.RULE('definition', () => {
      let result = $.OR([
        { ALT: () => $.SUBRULE($.type_def) },
        { ALT: () => $.SUBRULE2($.constant_def) }
      ]);

      return result;
    });

    $.RULE('specification', () => {
      let result = [];
      $.MANY(() => {
        let definition = $.SUBRULE($.definition);
        result.push(definition);
      });

      return result;
    });

    Parser.performSelfAnalysis(this);
  }
}

// ----------------- wrapping it all together -----------------

// reuse the same parser instance.
const parser = new XdrParser([]);

module.exports = function(input) {
  const lexResult = XdrLexer.tokenize(input);
  parser.input = lexResult.tokens;
  const value = parser.specification();

  return {
    value: value,
    lexErrors: lexResult.errors,
    parseErrors: parser.errors
  };
};
