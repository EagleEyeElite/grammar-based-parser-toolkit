// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { ComponentParser } from './componentParser.ts';
import { baseTokens } from './rules/sharedTokens.ts';
import operatingHours, { type OpeningHoursEntry } from './rules/operatingHours.ts';
import { ClosureSubject } from './rules/closures.ts';

// Toolkit: build your own grammar
export { createToken, type TokenType, type IToken, type CstNode } from 'chevrotain';
export {
    ComponentParser,
    type GrammarBuilder,
    type GrammarComponent,
    type Rule,
    type Visitor,
    type VisitorMethod,
} from './componentParser.ts';
export { baseTokens, WhiteSpace, Dash, Bis, Comma, Semicolon } from './rules/sharedTokens.ts';

// Opening-hours grammar
export { default as openingHoursGrammar } from './rules/operatingHours.ts';
export { ClosureSubject } from './rules/closures.ts';
export { DayEnum, type Weekday } from './rules/days.ts';
export type { OpeningHoursEntry } from './rules/operatingHours.ts';
export type { OpenHoursEntry } from './rules/openHours.ts';
export type { ClosureEntry } from './rules/closures.ts';
export type { AlwaysOpenEntry } from './rules/alwaysOpen.ts';

/** Outcome of parsing one input with {@link parseMany}. */
export type ParseOutcome =
    | { input: string; ok: true; result: OpeningHoursEntry[] }
    | { input: string; ok: false; error: string };

const parser = new ComponentParser<OpeningHoursEntry[]>(operatingHours, baseTokens);

/**
 * Parses one German opening-hours string.
 *
 * @example
 * parse('Mo-Fr 08:00-16:00 Uhr, außer an Feiertagen');
 * // [
 * //   { type: 'OpenHours', days: [1, 2, 3, 4, 5], startTime: 480, endTime: 960 },
 * //   { type: 'Closure', subject: 'NATIONAL_HOLIDAYS' }
 * // ]
 *
 * @param input - Opening-hours text
 * @returns Parsed entries
 * @throws Error if the input does not match the grammar
 */
export function parse(input: string): OpeningHoursEntry[] {
    if (typeof input !== 'string') {
        throw new TypeError('Input must be a string');
    }
    return parser.parse(input);
}

/**
 * Parses a list of opening-hours strings. Never throws; failures are reported per entry.
 *
 * @param inputs - Opening-hours texts
 */
export function parseMany(inputs: Iterable<string>): ParseOutcome[] {
    return Array.from(inputs, (input): ParseOutcome => {
        try {
            return { input, ok: true, result: parse(input) };
        } catch (e) {
            return { input, ok: false, error: e instanceof Error ? e.message : String(e) };
        }
    });
}

/**
 * Whether parsed opening hours can be relied on, i.e. they carry no note saying
 * they may deviate in general or during school vacations. Holiday, event and
 * occupancy notes don't count as unreliable.
 *
 * @param result - Output of {@link parse}
 */
export function isReliable(result: OpeningHoursEntry[]): boolean {
    return !result.some((item) =>
        item.type === 'Closure' &&
        (item.subject === ClosureSubject.GENERAL_DEVIATIONS ||
            item.subject === ClosureSubject.SCHOOL_VACATION),
    );
}
