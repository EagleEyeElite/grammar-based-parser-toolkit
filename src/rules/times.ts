// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { createToken, type IToken } from 'chevrotain';
import type { GrammarBuilder, GrammarComponent } from '../componentParser.ts';
import { Dash, Bis } from './sharedTokens.ts';

export const Time = createToken({
    name: 'Time',
    pattern: /\d{1,2}(?:[:.]\d{2})?/,
});

export const Uhr = createToken({ name: 'Uhr', pattern: /Uhr/i });

/** A time span, both ends in minutes since midnight. */
export interface TimeRange {
    startTime: number;
    endTime: number;
}

/**
 * Grammar for time ranges such as "08:00-16:00", "8.30 - 12 Uhr" or "8 Uhr bis 20 Uhr".
 */
function defineRules($: GrammarBuilder) {
    const timeRange = $.RULE('timeRange', () => {
        $.CONSUME(Time);
        $.OPTION(() => $.CONSUME(Uhr));

        $.OR([
            { ALT: () => $.CONSUME(Dash) },
            { ALT: () => $.CONSUME(Bis) },
        ]);

        $.CONSUME2(Time);
        $.OPTION2(() => $.CONSUME2(Uhr));
    });

    return { timeRange };
}

/**
 * Converts "8", "08:30" or "8.30" to minutes since midnight.
 *
 * @param time - Time as written in the input
 * @returns Minutes since midnight
 * @throws Error if the time is malformed or out of range
 */
export function convertTimeToMinutes(time: string): number {
    const cleanTime = time.replace(/Uhr/i, '').trim();

    if (!cleanTime.includes(':') && !cleanTime.includes('.')) {
        const hours = parseInt(cleanTime, 10);
        if (isNaN(hours) || hours < 0 || hours > 23) {
            throw new Error(`Invalid time values: ${time}`);
        }
        return hours * 60;
    }

    const parts = cleanTime.split(/[:.]/);
    if (parts.length !== 2) {
        throw new Error(`Invalid time format: ${time}`);
    }

    const hours = parseInt(parts[0]!, 10);
    const minutes = parseInt(parts[1]!, 10);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error(`Invalid time values: ${time}`);
    }

    return hours * 60 + minutes;
}

interface TimeRangeCtx {
    Time: [IToken, IToken];
}

function timeRange(ctx: TimeRangeCtx): TimeRange {
    return {
        startTime: convertTimeToMinutes(ctx.Time[0].image),
        endTime: convertTimeToMinutes(ctx.Time[1].image),
    };
}

const component: GrammarComponent<'timeRange'> = {
    tokens: [Time, Uhr],
    defineRules,
    visitorMethods: { timeRange },
    entryRule: 'timeRange',
};

export default component;
