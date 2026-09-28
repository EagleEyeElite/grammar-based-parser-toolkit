// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { Comma, Semicolon } from './sharedTokens.js';
import openHours from './openHours.js';
import closures from './closures.js';
import alwaysOpen from './alwaysOpen.js';

/**
 * Top-level grammar. An input is either
 * - an always-open expression: "24/7", "täglich 24h", or
 * - one or more open-hours statements, optionally followed by a closure note:
 *   "Mo-Fr: 09:00-17:00 Uhr, Sa: 10:00-14:00 Uhr; außer an Feiertagen"
 *
 * @param {Object} $ - Chevrotain parser instance
 */
function defineRules($) {
    openHours.defineRules($);
    closures.defineRules($);
    alwaysOpen.defineRules($);

    $.RULE('operatingHoursExpression', () => {
        $.OR([
            { ALT: () => $.SUBRULE($.alwaysOpenExpression) },
            {
                ALT: () => {
                    $.SUBRULE($.openHoursList);
                    $.OPTION(() => {
                        $.OR1([
                            { ALT: () => $.CONSUME(Comma) },
                            { ALT: () => $.CONSUME(Semicolon) },
                        ]);
                        $.SUBRULE($.closureExpression);
                    });
                },
            },
        ]);
    });
}

/**
 * @returns {Array<Object>} OpenHours entries followed by an optional Closure entry,
 *   or a single AlwaysOpen entry
 */
function operatingHoursExpression(ctx) {
    if (ctx.alwaysOpenExpression) {
        return [this.visit(ctx.alwaysOpenExpression)];
    }

    const result = this.visit(ctx.openHoursList);
    if (ctx.closureExpression) {
        result.push(this.visit(ctx.closureExpression));
    }
    return result;
}

export default {
    // Order matters: the lexer picks the first token type that matches
    tokens: [...alwaysOpen.tokens, ...openHours.tokens, ...closures.tokens],
    defineRules,
    visitorMethods: {
        ...openHours.visitorMethods,
        ...closures.visitorMethods,
        ...alwaysOpen.visitorMethods,
        operatingHoursExpression,
    },
    entryRule: 'operatingHoursExpression',
};
