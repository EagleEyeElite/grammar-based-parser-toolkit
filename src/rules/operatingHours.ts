// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import type { CstNode } from 'chevrotain';
import type { GrammarBuilder, GrammarComponent, Visitor } from '../componentParser.ts';
import { Comma, Semicolon } from './sharedTokens.ts';
import openHours, { type OpenHoursEntry } from './openHours.ts';
import closures, { type ClosureEntry } from './closures.ts';
import alwaysOpen, { type AlwaysOpenEntry } from './alwaysOpen.ts';

/** One entry of a parse result. */
export type OpeningHoursEntry = OpenHoursEntry | ClosureEntry | AlwaysOpenEntry;

/**
 * Top-level grammar. An input is either
 * - an always-open expression: "24/7", "täglich 24h", or
 * - one or more open-hours statements, optionally followed by a closure note:
 *   "Mo-Fr: 09:00-17:00 Uhr, Sa: 10:00-14:00 Uhr; außer an Feiertagen"
 */
function defineRules($: GrammarBuilder) {
    const openHoursRules = openHours.defineRules($);
    const { closureExpression } = closures.defineRules($);
    const { alwaysOpenExpression } = alwaysOpen.defineRules($);

    const operatingHoursExpression = $.RULE('operatingHoursExpression', () => {
        $.OR([
            { ALT: () => $.SUBRULE(alwaysOpenExpression) },
            {
                ALT: () => {
                    $.SUBRULE(openHoursRules.openHoursList);
                    $.OPTION(() => {
                        $.OR1([
                            { ALT: () => $.CONSUME(Comma) },
                            { ALT: () => $.CONSUME(Semicolon) },
                        ]);
                        $.SUBRULE(closureExpression);
                    });
                },
            },
        ]);
    });

    return { ...openHoursRules, closureExpression, alwaysOpenExpression, operatingHoursExpression };
}

interface OperatingHoursExpressionCtx {
    alwaysOpenExpression?: [CstNode];
    openHoursList?: [CstNode];
    closureExpression?: [CstNode];
}

/**
 * @returns OpenHours entries followed by an optional Closure entry, or a single AlwaysOpen entry
 */
function operatingHoursExpression(this: Visitor, ctx: OperatingHoursExpressionCtx): OpeningHoursEntry[] {
    if (ctx.alwaysOpenExpression) {
        return [this.visit(ctx.alwaysOpenExpression) as AlwaysOpenEntry];
    }

    const result: OpeningHoursEntry[] = this.visit(ctx.openHoursList!) as OpenHoursEntry[];
    if (ctx.closureExpression) {
        result.push(this.visit(ctx.closureExpression) as ClosureEntry);
    }
    return result;
}

const component: GrammarComponent = {
    // Order matters: the lexer picks the first token type that matches. Closure
    // phrases go before day tokens, otherwise "Sonn- und Feiertage geschlossen"
    // would be read as the day "So".
    tokens: [...alwaysOpen.tokens, ...closures.tokens, ...openHours.tokens],
    defineRules,
    visitorMethods: {
        ...openHours.visitorMethods,
        ...closures.visitorMethods,
        ...alwaysOpen.visitorMethods,
        operatingHoursExpression,
    },
    entryRule: 'operatingHoursExpression',
};

export default component;
