// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { createToken, type CstNode } from 'chevrotain';
import type { GrammarBuilder, GrammarComponent, Visitor } from '../componentParser.ts';
import { Comma, Semicolon } from './sharedTokens.ts';
import days, { Day, type Weekday } from './days.ts';
import times, { type TimeRange } from './times.ts';

export const Colon = createToken({ name: 'Colon', pattern: /:/ });

/** Open on `days` from `startTime` to `endTime` (minutes since midnight). */
export interface OpenHoursEntry extends TimeRange {
    type: 'OpenHours';
    days: Weekday[];
}

/**
 * Grammar for one or more "days + time range" statements:
 * - "Mo-Fr: 08:00-12:00 Uhr"
 * - "Mo-Fr: 08:00-12:00 Uhr, Sa: 10:00-14:00 Uhr"
 * - "Mo-Fr 8.00 - 12.00 Sa 10.00 - 14.00 Uhr" (no separator)
 */
function defineRules($: GrammarBuilder) {
    const { dayExpression } = days.defineRules($);
    const { timeRange } = times.defineRules($);

    const openHoursStatement = $.RULE('openHoursStatement', () => {
        $.SUBRULE(dayExpression);

        $.OPTION(() => {
            $.OR([
                { ALT: () => $.CONSUME(Colon) },
                { ALT: () => $.CONSUME(Comma) },
            ]);
        });

        $.SUBRULE(timeRange);
    });

    const openHoursList = $.RULE('openHoursList', () => {
        $.SUBRULE(openHoursStatement);

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
                $.SUBRULE2(openHoursStatement);
            },
        });
    });

    return { dayExpression, timeRange, openHoursStatement, openHoursList };
}

interface OpenHoursStatementCtx {
    dayExpression: [CstNode];
    timeRange: [CstNode];
}

function openHoursStatement(this: Visitor, ctx: OpenHoursStatementCtx): OpenHoursEntry {
    const { startTime, endTime } = this.visit(ctx.timeRange) as TimeRange;
    return {
        type: 'OpenHours',
        days: this.visit(ctx.dayExpression) as Weekday[],
        startTime,
        endTime,
    };
}

interface OpenHoursListCtx {
    openHoursStatement: CstNode[];
}

function openHoursList(this: Visitor, ctx: OpenHoursListCtx): OpenHoursEntry[] {
    return ctx.openHoursStatement.map((statement) => this.visit(statement) as OpenHoursEntry);
}

const component: GrammarComponent<'dayExpression' | 'timeRange' | 'openHoursStatement' | 'openHoursList'> = {
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

export default component;
