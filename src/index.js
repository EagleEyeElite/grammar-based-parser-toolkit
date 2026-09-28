// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { ComponentParser } from './componentParser.js';
import { baseTokens } from './rules/sharedTokens.js';
import operatingHours from './rules/operatingHours.js';
import { ClosureSubject } from './rules/closures.js';
import { DayEnum } from './rules/days.js';

export { ClosureSubject, DayEnum };

const parser = new ComponentParser(operatingHours, baseTokens);

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
 * @param {string} input - Opening-hours text
 * @returns {Array<Object>} Parsed entries (`OpenHours`, `Closure` or `AlwaysOpen`)
 * @throws {Error} If the input does not match the grammar
 */
export function parse(input) {
    if (typeof input !== 'string') {
        throw new TypeError('Input must be a string');
    }
    return parser.parse(input);
}

/**
 * Parses a list of opening-hours strings. Never throws; failures are reported per entry.
 *
 * @param {Iterable<string>} inputs - Opening-hours texts
 * @returns {Array<{input: string, ok: true, result: Array<Object>} | {input: string, ok: false, error: string}>}
 */
export function parseMany(inputs) {
    return Array.from(inputs, (input) => {
        try {
            return { input, ok: true, result: parse(input) };
        } catch (e) {
            return { input, ok: false, error: e.message };
        }
    });
}

/**
 * Whether parsed opening hours can be relied on, i.e. they carry no note saying
 * they may deviate in general or during school vacations. Holiday, event and
 * occupancy notes don't count as unreliable.
 *
 * @param {Array<Object>} result - Output of {@link parse}
 * @returns {boolean}
 */
export function isReliable(result) {
    return !result.some((item) =>
        item.type === 'Closure' &&
        (item.subject === ClosureSubject.GENERAL_DEVIATIONS ||
            item.subject === ClosureSubject.SCHOOL_VACATION),
    );
}
