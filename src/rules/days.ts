// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { createToken, type IToken } from 'chevrotain';
import type { GrammarBuilder, GrammarComponent } from '../componentParser.ts';
import { Dash, Bis } from './sharedTokens.ts';

export const Day = createToken({
    name: 'Day',
    pattern: /Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Mo\.?|Di\.?|Mi\.?|Do\.?|Fr\.?|Sa\.?|So\.?/i,
});

export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Und = createToken({ name: 'Und', pattern: /und/i });

/** ISO weekday numbers. */
export const DayEnum = Object.freeze({
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7,
});

/** ISO weekday number, 1 = Monday … 7 = Sunday. */
export type Weekday = (typeof DayEnum)[keyof typeof DayEnum];

const dayMap: Record<string, Weekday> = {
    mo: DayEnum.MONDAY, montag: DayEnum.MONDAY,
    di: DayEnum.TUESDAY, dienstag: DayEnum.TUESDAY,
    mi: DayEnum.WEDNESDAY, mittwoch: DayEnum.WEDNESDAY,
    do: DayEnum.THURSDAY, donnerstag: DayEnum.THURSDAY,
    fr: DayEnum.FRIDAY, freitag: DayEnum.FRIDAY,
    sa: DayEnum.SATURDAY, samstag: DayEnum.SATURDAY,
    so: DayEnum.SUNDAY, sonntag: DayEnum.SUNDAY,
};

/**
 * Grammar for day expressions:
 * - single day: "Mo", "Mo.", "Montag"
 * - range: "Mo-Fr", "Mo - Fr", "Montag bis Freitag", wrapping ranges like "Fr-Mo"
 * - list: "Mo+Mi+Fr", "Montag und Mittwoch"
 */
function defineRules($: GrammarBuilder) {
    const dayExpression = $.RULE('dayExpression', () => {
        $.CONSUME(Day);

        $.OR([
            {
                // Range
                GATE: () => $.LA(1).tokenType === Dash || $.LA(1).tokenType === Bis,
                ALT: () => {
                    $.OR1([
                        { ALT: () => $.CONSUME(Dash) },
                        { ALT: () => $.CONSUME(Bis) },
                    ]);
                    $.CONSUME2(Day);
                },
            },
            {
                // List
                GATE: () => $.LA(1).tokenType === Plus || $.LA(1).tokenType === Und,
                ALT: () => {
                    $.AT_LEAST_ONE1(() => {
                        $.OR2([
                            { ALT: () => $.CONSUME(Plus) },
                            { ALT: () => $.CONSUME(Und) },
                        ]);
                        $.CONSUME3(Day);
                    });
                },
            },
            {
                // Single day, already consumed
                ALT: () => {},
            },
        ]);
    });

    return { dayExpression };
}

function getDayValue(token: IToken): Weekday {
    const dayValue = dayMap[token.image.toLowerCase().replace(/\./g, '')];
    if (!dayValue) {
        throw new Error(`Unrecognized day: ${token.image}`);
    }
    return dayValue;
}

interface DayExpressionCtx {
    Day: [IToken, ...IToken[]];
    Dash?: IToken[];
    Bis?: IToken[];
    Plus?: IToken[];
    Und?: IToken[];
}

/**
 * @returns Weekday numbers in the order they are covered
 */
function dayExpression(ctx: DayExpressionCtx): Weekday[] {
    const firstDay = getDayValue(ctx.Day[0]);

    if (ctx.Dash || ctx.Bis) {
        const endDay = getDayValue(ctx.Day[1]!);
        const days: Weekday[] = [];

        if (firstDay > endDay) {
            // Wraps over the end of the week, e.g. Fr-Mo
            for (let i = firstDay; i <= 7; i++) days.push(i as Weekday);
            for (let i = 1; i <= endDay; i++) days.push(i as Weekday);
        } else {
            for (let i = firstDay; i <= endDay; i++) days.push(i as Weekday);
        }

        return days;
    }

    if (ctx.Plus || ctx.Und) {
        return ctx.Day.map(getDayValue);
    }

    return [firstDay];
}

const component: GrammarComponent<'dayExpression'> = {
    tokens: [Day, Plus, Und],
    defineRules,
    visitorMethods: { dayExpression },
    entryRule: 'dayExpression',
};

export default component;
