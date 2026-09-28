// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { createToken } from 'chevrotain';
import { Dash, Bis } from './sharedTokens.js';

export const Day = createToken({
    name: 'Day',
    pattern: /Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Mo\.?|Di\.?|Mi\.?|Do\.?|Fr\.?|Sa\.?|So\.?/i,
});

export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Und = createToken({ name: 'Und', pattern: /und/i });

/**
 * ISO weekday numbers.
 * @readonly
 * @enum {number}
 */
export const DayEnum = Object.freeze({
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7,
});

const dayMap = {
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
 *
 * @param {Object} $ - Chevrotain parser instance
 */
function defineRules($) {
    $.RULE('dayExpression', () => {
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
}

function getDayValue(token) {
    const dayValue = dayMap[token.image.toLowerCase().replace(/\./g, '')];
    if (!dayValue) {
        throw new Error(`Unrecognized day: ${token.image}`);
    }
    return dayValue;
}

/**
 * @returns {number[]} Weekday numbers in the order they are covered
 */
function dayExpression(ctx) {
    const firstDay = getDayValue(ctx.Day[0]);

    if (ctx.Dash || ctx.Bis) {
        const endDay = getDayValue(ctx.Day[1]);
        const days = [];

        if (firstDay > endDay) {
            // Wraps over the end of the week, e.g. Fr-Mo
            for (let i = firstDay; i <= 7; i++) days.push(i);
            for (let i = 1; i <= endDay; i++) days.push(i);
        } else {
            for (let i = firstDay; i <= endDay; i++) days.push(i);
        }

        return days;
    }

    if (ctx.Plus || ctx.Und) {
        return ctx.Day.map(getDayValue);
    }

    return [firstDay];
}

export default {
    tokens: [Day, Plus, Und],
    defineRules,
    visitorMethods: { dayExpression },
    entryRule: 'dayExpression',
};
