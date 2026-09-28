// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { Lexer, CstParser } from 'chevrotain';

/**
 * Bundles lexer, parser and visitor for one grammar component.
 *
 * A component is an object of the shape
 * `{ tokens, defineRules, visitorMethods, entryRule }`:
 * - `tokens`: token types of the component, in lexing priority order
 * - `defineRules($)`: registers the grammar rules on a Chevrotain parser
 * - `visitorMethods`: turn CST nodes into plain result objects
 * - `entryRule`: name of the rule parsing starts with
 */
export class ComponentParser {
    /**
     * @param {Object} component - Grammar component (see class description)
     * @param {Array} baseTokens - Tokens shared by all components, appended after the component's tokens
     */
    constructor(component, baseTokens) {
        const allTokens = [...component.tokens, ...baseTokens];
        this.lexer = new Lexer(allTokens);
        this.parser = createParser(allTokens, component.defineRules);
        this.visitor = createVisitor(this.parser, component.visitorMethods);
        this.entryRule = component.entryRule;
    }

    /**
     * Lexes, parses and visits the input.
     *
     * @param {string} input - Text to parse
     * @returns {*} Result produced by the entry rule's visitor method
     * @throws {Error} On lexing or parsing errors
     */
    parse(input) {
        const lexResult = this.lexer.tokenize(input);
        if (lexResult.errors.length > 0) {
            throw new Error(`Lexing error: ${lexResult.errors[0].message}`);
        }

        this.parser.input = lexResult.tokens;
        const cst = this.parser[this.entryRule]();

        if (this.parser.errors.length > 0) {
            throw new Error(`Parsing error: ${this.parser.errors[0].message}`);
        }

        return this.visitor.visit(cst);
    }
}

function createParser(allTokens, defineRules) {
    class Parser extends CstParser {
        constructor() {
            super(allTokens);
            defineRules(this);
            this.performSelfAnalysis();
        }
    }

    return new Parser();
}

function createVisitor(parser, visitorMethods) {
    const BaseVisitor = parser.getBaseCstVisitorConstructor();

    class Visitor extends BaseVisitor {
        constructor() {
            super();
            Object.assign(this, visitorMethods);
            this.validateVisitor();
        }
    }

    return new Visitor();
}
