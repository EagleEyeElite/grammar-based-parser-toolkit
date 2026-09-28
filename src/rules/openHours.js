// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { createToken } from 'chevrotain';
import { Comma, Semicolon } from './sharedTokens.js';
import days, { Day } from './days.js';
import times from './times.js';

export const Colon = createToken({ name: 'Colon', pattern: /:/ });

/**
 * Grammar for one or more "days + time range" statements:
 * - "Mo-Fr: 08:00-12:00 Uhr"
 * - "Mo-Fr: 08:00-12:00 Uhr, Sa: 10:00-14:00 Uhr"
 * - "Mo-Fr 8.00 - 12.00 Sa 10.00 - 14.00 Uhr" (no separator)
 *
 * @param {Object} $ - Chevrotain parser instance
 */
function defineRules($) {
    days.defineRules($);
    times.defineRules($);

    $.RULE('openHoursStatement', () => {
        $.SUBRULE($.dayExpression);

        $.OPTION(() => {
            $.OR([
                { ALT: () => $.CONSUME(Colon) },
                { ALT: () => $.CONSUME(Comma) },
            ]);
        });

        $.SUBRULE($.timeRange);
    });

    $.RULE('openHoursList', () => {
        $.SUBRULE($.openHoursStatement);

        $.MANY({
            // Only continue if a new day expression follows, directly or after a separator.
            // Anything else after a separator (e.g. a closure note) is left to the caller.
            GATE: () => {
                const next = $.LA(1).tokenType;
                if (next === Day) {
                    return true;
                }
                return (next === Comma || next === Semicolon) && $.LA(2).tokenType === Day;
            },
            DEF: () => {
                $.OPTION(() => {
                    $.OR([
                        { ALT: () => $.CONSUME(Comma) },
                        { ALT: () => $.CONSUME(Semicolon) },
                    ]);
                });
                $.SUBRULE2($.openHoursStatement);
            },
        });
    });
}

/**
 * @returns {{type: 'OpenHours', days: number[], startTime: number, endTime: number}}
 */
function openHoursStatement(ctx) {
    const { startTime, endTime } = this.visit(ctx.timeRange);
    return {
        type: 'OpenHours',
        days: this.visit(ctx.dayExpression),
        startTime,
        endTime,
    };
}

function openHoursList(ctx) {
    return ctx.openHoursStatement.map((statement) => this.visit(statement));
}

export default {
    tokens: [...days.tokens, ...times.tokens, Colon],
    defineRules,
    visitorMethods: {
        ...days.visitorMethods,
        ...times.visitorMethods,
        openHoursStatement,
        openHoursList,
    },
    entryRule: 'openHoursList',
};
