'use strict';
var chevrotain = require("chevrotain");

// ----------------- lexer -----------------
var Lexer = chevrotain.Lexer;
var createToken = chevrotain.createToken;

var WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /\s+/, group: Lexer.SKIPPED });
var CommentSection = createToken({ name: 'Comment', pattern: /\*(.|[\r\n])*?\*/, group: Lexer.SKIPPED });

var LBrace = createToken({ name: 'LBrace', pattern: /{/ });
var RBrace = createToken({ name: 'RBrace', pattern: /}/ });
var LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
var RBracket = createToken({ name: 'RBracket', pattern: /]/ });
var LArrow = createToken({ name: 'LArrow', pattern: /</ });
var RArrow = createToken({ name: 'RArrow', pattern: />/ });
var LParen = createToken({ name: 'LParen', pattern: /\(/ });
var RParen = createToken({ name: 'RParen', pattern: /\)/ });
var Comma = createToken({ name: 'Comma', pattern: /,/ });
var Colon = createToken({ name: 'Colon', pattern: /:/ });
var Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });
var Asterisk = createToken({ name: 'Asterisk', pattern: /\*/ });
var Equals = createToken({ name: 'Equals', pattern: /=/ });

// keywords
var Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z][0-9a-zA-Z_]*/ });
var Keyword = createToken({ name: 'Keyword', pattern: Lexer.NA })
var Bool = createToken({ name: 'Bool', pattern: /bool/, parent: Keyword });
var Case = createToken({ name: 'Case', pattern: /case/, parent: Keyword });
var Const = createToken({ name: 'Const', pattern: /const/, parent: Keyword });
var Default = createToken({ name: 'Default', pattern: /default/, parent: Keyword });
var Double = createToken({ name: 'Double', pattern: /double/, parent: Keyword });
var Quadruple = createToken({ name: 'Quadruple', pattern: /quadruple/, parent: Keyword });
var Enum = createToken({ name: 'Enum', pattern: /enum/, parent: Keyword });
var Float = createToken({ name: 'Float', pattern: /float/, parent: Keyword });
var Hyper = createToken({ name: 'Hyper', pattern: /hyper/, parent: Keyword });
var Opaque = createToken({ name: 'Opaque', pattern: /opaque/, parent: Keyword });
var String_ = createToken({ name: 'String_', pattern: /string/, parent: Keyword });
var Struct = createToken({ name: 'Struct', pattern: /struct/, parent: Keyword });
var Switch = createToken({ name: 'Switch', pattern: /switch/, parent: Keyword });
var Typedef = createToken({ name: 'Typedef', pattern: /typedef/, parent: Keyword });
var Union = createToken({ name: 'Union', pattern: /union/, parent: Keyword });
var Unsigned = createToken({ name: 'Unsigned', pattern: /unsigned/, parent: Keyword });
var Int = createToken({ name: 'Int', pattern: /int/, parent: Keyword });
var Void = createToken({ name: 'Void', pattern: /void/, parent: Keyword });

// constants
var DecimalConstant = createToken({ name: 'DecimalConstant', pattern: Lexer.NA });
var DecimalConstantZero =
  createToken({ name: 'DecimalConstantZero', pattern: /0/, parent: DecimalConstant });
var DecimalConstantValue =
  createToken({ name: 'DecimalConstantValue', pattern: /"-"?[1-9][0-9]*/, parent: DecimalConstant });
var HexConstant =
  createToken({ name: 'HexConstant', pattern: /"0x"[a-fA-F0-9]+/ });
var OctalConstant = createToken({ name: 'OctalConstant', pattern: /"0"[0-7]+/ });

const allTokens = [
  WhiteSpace, CommentSection, LBrace, RBrace, LBracket, RBracket, LArrow,
  RArrow, LParen, RParen, Comma, Colon, Semicolon, Equals,
  Asterisk, Identifier, Keyword, Bool, Case, Const, Default, Double, Quadruple, Enum,
  Float, Hyper, Opaque, String_, Struct, Switch, Typedef, Union, Unsigned, Int, Void,
  DecimalConstant, DecimalConstantZero, DecimalConstantValue, HexConstant, OctalConstant
];

const XdrLexer = new Lexer(allTokens);


// ----------------- parser -----------------
var Parser = chevrotain.Parser;

class XdrParser extends Parser {
  constructor(input) {
    super(input, allTokens, { maxLookahead: 10, recoveryEnabled: true });

    var $ = this;

    // RULES
    $.typespec_declaration = $.RULE('typespec_declaration', () => {
      $.OR([
        // type-specifier identifier
        { ALT: () => { $.SUBRULE($.type_specifier); $.CONSUME(Identifier); } },

        // type-specifier identifier "[" value "]"
        { ALT: () => {
            $.SUBRULE2($.type_specifier);
            $.CONSUME2(Identifier);
            $.CONSUME(LBracket); $.SUBRULE($.value); $.CONSUME(RBracket);
          }
        },

        // type-specifier identifier "<" [ value ] ">"
        { ALT: () => {
            $.SUBRULE3($.type_specifier);
            $.CONSUME3(Identifier);
            $.CONSUME(LArrow); $.OPTION(() => $.SUBRULE2($.value)); $.CONSUME(RArrow);
          }
        },

        // type-specifier "*" identifier
        { ALT: () => {
            $.SUBRULE4($.type_specifier);
            $.CONSUME(Asterisk);
            $.CONSUME4(Identifier);
          }
        }
      ]);
    });

    $.opaque_declaration = $.RULE('opaque_declaration', () => {
      $.OR([
        // "opaque" identifier "[" value "]"
        { ALT: () => {
            $.CONSUME1(Opaque);
            $.CONSUME1(Identifier);
            $.CONSUME(LBracket); $.SUBRULE($.value); $.CONSUME(RBracket);
          }
        },

        // "opaque" identifier "<" [ value ] ">"
        { ALT: () => {
            $.CONSUME2(Opaque);
            $.CONSUME2(Identifier);
            $.CONSUME(LArrow); $.OPTION(() => $.SUBRULE2($.value)); $.CONSUME(RArrow);
          }
        }
      ]);
    });

    $.declaration = $.RULE('declaration', () => {
      $.OR([
        { ALT: () => $.SUBRULE($.typespec_declaration) },
        { ALT: () => $.SUBRULE($.opaque_declaration) },

        // "string" identifier "<" [ value ] ">"
        { ALT: () => {
            $.CONSUME(String_);
            $.CONSUME(Identifier);
            $.CONSUME(LArrow); $.OPTION(() => $.SUBRULE($.value)); $.CONSUME(RArrow);
          }
        },

        // "void"
        { ALT: () => { $.CONSUME(Void); } }
      ]);
    });


    /* constant | identifier */
    $.value = $.RULE('value', () => {
      $.OR([
        { ALT: () => { $.CONSUME(Identifier); } },
        { ALT: () => { $.SUBRULE($.constant); } }
      ]);
    });

    /* decimal-constant | hexadecimal-constant | octal-constant */
    $.constant = $.RULE('constant', () => {
      $.OR([
        { ALT: () => { $.CONSUME(DecimalConstant); } },
        { ALT: () => { $.CONSUME(HexConstant); } },
        { ALT: () => { $.CONSUME(OctalConstant); } }
      ]);
    });

    $.type_specifier = $.RULE('type_specifier', () => {
      $.OR([
        /* [ "unsigned" ] "int" */
        { ALT: () => { $.OPTION1(() => $.CONSUME1(Unsigned)); $.CONSUME(Int); } },
        /* [ "unsigned" ] "hyper" */
        { ALT: () => { $.OPTION2(() => $.CONSUME2(Unsigned)); $.CONSUME(Hyper); } },
        /* "float" */
        { ALT: () => { $.CONSUME(Float); } },
        /* "double" */
        { ALT: () => { $.CONSUME(Double); } },
        /* "quadruple" */
        { ALT: () => { $.CONSUME(Quadruple); } },
        /* "bool" */
        { ALT: () => { $.CONSUME(Bool); } },
        /* enum-type-spec */
        { ALT: () => { $.SUBRULE($.enum_type_spec); } },
        /* struct-type-spec */
        { ALT: () => { $.SUBRULE($.struct_type_spec); } },
        /* union-type-spec */
        { ALT: () => { $.SUBRULE($.union_type_spec); } },
        /* identifier */
        { ALT: () => { $.CONSUME(Identifier); } }
      ]);
    });

    $.enum_type_spec = $.RULE('enum_type_spec', () => {
      $.CONSUME(Enum);
      $.SUBRULE($.enum_body);
    });

    $.enum_body = $.RULE('enum_body', () => {
      $.CONSUME(LBrace);
      $.MANY_SEP(Comma, () => { $.CONSUME(Identifier); $.CONSUME(Equals); $.SUBRULE($.value); });
      $.CONSUME(RBrace);
    });

    $.struct_type_spec = $.RULE('struct_type_spec', () => {
      $.CONSUME(Struct);
      $.SUBRULE($.struct_body);
    });

    $.struct_body = $.RULE('struct_body', () => {
      $.CONSUME(LBrace);
      $.MANY_SEP(Semicolon, () => { $.SUBRULE($.declaration); });
      $.CONSUME(RBrace);
    });

    $.union_type_spec = $.RULE('union_type_spec', () => {
      $.CONSUME(Union);
      $.SUBRULE($.union_body);
    });

    $.union_body = $.RULE('union_body', () => {
      $.CONSUME(Switch);
      $.CONSUME(LParen);
      $.SUBRULE1($.declaration);
      $.CONSUME(RParen);
      $.CONSUME(LBrace);
      $.MANY(() => { $.SUBRULE($.case_spec); });
      $.OPTION(() => { $.CONSUME(Default); $.CONSUME(Colon); $.SUBRULE2($.declaration); });
      $.CONSUME(RBrace);
    });

    $.case_spec = $.RULE('case_spec', () => {
      $.MANY(() => { $.CONSUME(Case); $.SUBRULE($.value); $.CONSUME(Colon); });
      $.SUBRULE($.declaration);
      $.CONSUME(Semicolon);
    });

    $.constant_def = $.RULE('constant_def', () => {
      $.CONSUME(Const);
      $.CONSUME(Identifier);
      $.CONSUME(Equals);
      $.SUBRULE($.constant);
      $.CONSUME(Semicolon);
    });

    $.type_def = $.RULE('type_def', () => {
      $.OR([
        /* "typedef" declaration ";" */
        { ALT: () => { $.CONSUME(Typedef); $.SUBRULE($.declaration); $.CONSUME1(Semicolon); } },
        /* "enum" identifier enum-body ";" */
        { ALT: () => { $.CONSUME(Enum); $.CONSUME1(Identifier); $.SUBRULE($.enum_body); $.CONSUME2(Semicolon); } },
        /* "struct" identifier struct-body ";" */
        { ALT: () => { $.CONSUME(Struct); $.CONSUME2(Identifier); $.SUBRULE($.struct_body); $.CONSUME3(Semicolon); } },
        /* "union" identifier union-body ";" */
        { ALT: () => { $.CONSUME(Union); $.CONSUME3(Identifier); $.SUBRULE($.union_body); $.CONSUME4(Semicolon); } }
      ]);
    });

    /* type-def | constant-def */
    $.definition = $.RULE('definition', () => {
      $.OR([
        { ALT: () => { $.SUBRULE($.type_def); } },
        { ALT: () => { $.SUBRULE($.constant_def); } }
      ])
    });

    $.specification = $.RULE('specification', () => {
      $.MANY(() => { $.SUBRULE($.definition); });
    });

    Parser.performSelfAnalysis(this);
  }
};

// ----------------- wrapping it all together -----------------

// reuse the same parser instance.
const parser = new XdrParser([]);

module.exports = function(input) {
  var lexResult = XdrLexer.tokenize(input);
  parser.input = lexResult.tokens;
  var value = parser.specification();

  return {
    value:       value, // this is a pure grammar, the value will always be <undefined>
    lexErrors:   lexResult.errors,
    parseErrors: parser.errors
  };
};
