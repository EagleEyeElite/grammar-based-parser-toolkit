// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import {
    Lexer,
    CstParser,
    type CstNode,
    type DSLMethodOpts,
    type DSLMethodOptsWithErr,
    type GrammarAction,
    type ICstVisitor,
    type IOrAlt,
    type IToken,
    type ParserMethod,
    type TokenType,
} from 'chevrotain';

/** A grammar rule as returned by {@link GrammarBuilder.RULE}. */
export type Rule = ParserMethod<[], CstNode>;

/**
 * The part of Chevrotain's parser DSL that components use to define rules.
 *
 * Chevrotain declares these methods `protected`, expecting rules to be defined
 * inside a parser subclass. Components define their rules from outside so they
 * can be combined, so the parser hands itself out through this interface.
 */
export interface GrammarBuilder {
    RULE(name: string, implementation: () => void): Rule;
    SUBRULE(rule: Rule): CstNode;
    SUBRULE2(rule: Rule): CstNode;
    CONSUME(tokenType: TokenType): IToken;
    CONSUME2(tokenType: TokenType): IToken;
    CONSUME3(tokenType: TokenType): IToken;
    OPTION<T>(action: GrammarAction<T> | DSLMethodOpts<T>): T | undefined;
    OPTION2<T>(action: GrammarAction<T> | DSLMethodOpts<T>): T | undefined;
    OR<T>(alternatives: IOrAlt<T>[]): T;
    OR1<T>(alternatives: IOrAlt<T>[]): T;
    OR2<T>(alternatives: IOrAlt<T>[]): T;
    MANY<T>(action: GrammarAction<T> | DSLMethodOpts<T>): void;
    AT_LEAST_ONE1<T>(action: GrammarAction<T> | DSLMethodOptsWithErr<T>): void;
    LA(howMuch: number): IToken;
}

/** The `this` of visitor methods. */
export type Visitor = ICstVisitor<unknown, unknown>;

/** Turns the children of one CST node into a result value. */
export type VisitorMethod = (this: Visitor, ctx: never) => unknown;

/**
 * A self-contained piece of grammar. Components can be combined by calling each
 * other's `defineRules` and merging their tokens and visitor methods.
 */
export interface GrammarComponent<Rules extends string = string> {
    /** Token types of the component, in lexing priority order. */
    tokens: TokenType[];
    /** Registers the component's rules and returns them by name. */
    defineRules($: GrammarBuilder): Record<Rules, Rule>;
    /** One method per rule, named like the rule. */
    visitorMethods: Record<string, VisitorMethod>;
    /** The rule parsing starts with. */
    entryRule: NoInfer<Rules>;
}

/**
 * Bundles lexer, parser and visitor for one grammar component.
 *
 * @typeParam Result - What the entry rule's visitor method returns
 */
export class ComponentParser<Result> {
    private readonly lexer: Lexer;
    private readonly parser: CstParser;
    private readonly entryRule: Rule;
    private readonly visitor: Visitor;

    /**
     * @param component - Grammar component to parse with
     * @param baseTokens - Tokens shared by all components, appended after the component's tokens
     */
    constructor(component: GrammarComponent, baseTokens: TokenType[]) {
        const allTokens = [...component.tokens, ...baseTokens];
        this.lexer = new Lexer(allTokens);

        let rules: Record<string, Rule> = {};
        class Parser extends CstParser {
            constructor() {
                super(allTokens);
                rules = component.defineRules(this as unknown as GrammarBuilder);
                this.performSelfAnalysis();
            }
        }
        this.parser = new Parser();

        const entryRule = rules[component.entryRule];
        if (!entryRule) {
            throw new Error(`Unknown entry rule: ${component.entryRule}`);
        }
        this.entryRule = entryRule;

        this.visitor = createVisitor(this.parser, component.visitorMethods);
    }

    /**
     * Lexes, parses and visits the input.
     *
     * @param input - Text to parse
     * @returns Result produced by the entry rule's visitor method
     * @throws Error on lexing or parsing errors
     */
    parse(input: string): Result {
        const lexResult = this.lexer.tokenize(input);
        const lexError = lexResult.errors[0];
        if (lexError) {
            throw new Error(`Lexing error: ${lexError.message}`);
        }

        this.parser.input = lexResult.tokens;
        const cst = this.entryRule.call(this.parser);

        const parseError = this.parser.errors[0];
        if (parseError) {
            throw new Error(`Parsing error: ${parseError.message}`);
        }

        return this.visitor.visit(cst) as Result;
    }
}

function createVisitor(parser: CstParser, visitorMethods: Record<string, VisitorMethod>): Visitor {
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
