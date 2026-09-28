// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    parse, parseMany, isReliable, ClosureSubject,
    type OpeningHoursEntry, type OpenHoursEntry, type ClosureEntry, type Weekday,
} from '../src/index.ts';

const hours = (days: Weekday[], startTime: number, endTime: number): OpenHoursEntry =>
    ({ type: 'OpenHours', days, startTime, endTime });
const closure = (subject: ClosureSubject): ClosureEntry => ({ type: 'Closure', subject });

describe('parse', () => {
    const valid: [string, OpeningHoursEntry[]][] = [
        ['Di-Sa 10:00-18:00 Uhr', [hours([2, 3, 4, 5, 6], 600, 1080)]],
        [
            'Mo-Fr 09:00-17:00 Uhr, außer an Feiertagen',
            [hours([1, 2, 3, 4, 5], 540, 1020), closure(ClosureSubject.NATIONAL_HOLIDAYS)],
        ],
        [
            'Mo-Do: 7-16 Uhr; Fr: 7-12 Uhr; Änderungen vorbehalten',
            [hours([1, 2, 3, 4], 420, 960), hours([5], 420, 720), closure(ClosureSubject.GENERAL_DEVIATIONS)],
        ],
        [
            'Mo-Sa 8-20 Uhr, Sonn- und Feiertage geschlossen',
            [hours([1, 2, 3, 4, 5, 6], 480, 1200), closure(ClosureSubject.NATIONAL_HOLIDAYS)],
        ],
        ['24/7', [{ type: 'AlwaysOpen' }]],
        ['Täglich 24 Stunden / 7 Tage', [{ type: 'AlwaysOpen' }]],
    ];
    for (const [input, expected] of valid) {
        it(`parses "${input}"`, () => {
            assert.deepEqual(parse(input), expected);
        });
    }

    const invalid = [
        '',
        'nach Vereinbarung',
        'außer an Feiertagen',
        'Mo-Fr 9-17 Uhr,',
        'Mo-Fr 9-17 Uhr, sonst geschlossen',
        '24/7, außer an Feiertagen',
        'Sa+So 10-16 Uhr (je nach Belegung)', // closure note needs a separator
    ];
    for (const input of invalid) {
        it(`rejects "${input}"`, () => {
            assert.throws(() => parse(input));
        });
    }

    it('rejects non-string input', () => {
        assert.throws(() => parse(42 as unknown as string), TypeError);
        assert.throws(() => parse(null as unknown as string), TypeError);
    });
});

describe('parseMany', () => {
    it('reports success and failure per input without throwing', () => {
        const results = parseMany(['Mi 8-12 Uhr', 'irgendwann', 24 as unknown as string]);

        const [first, second, third] = results;
        assert.equal(results.length, 3);
        assert.deepEqual(first, { input: 'Mi 8-12 Uhr', ok: true, result: [hours([3], 480, 720)] });
        assert.ok(second && !second.ok);
        assert.match(second.error, /Lexing error/);
        assert.equal(third?.ok, false);
    });

    it('accepts any iterable', () => {
        const results = parseMany(new Set(['24h', 'Fr 9-14']));
        assert.deepEqual(results.map((r) => r.ok), [true, true]);
    });

    it('returns an empty array for no input', () => {
        assert.deepEqual(parseMany([]), []);
    });
});

describe('isReliable', () => {
    const cases: [string, boolean][] = [
        ['Mo-Fr 8-18 Uhr', true],
        ['24/7', true],
        ['Mo-Fr 8-18 Uhr, außer an Feiertagen', true],
        ['Mo-Fr 8-18 Uhr, bei Veranstaltungen', true],
        ['Mo-Fr 8-18 Uhr, ausgenommen Schulferien', false],
        ['Mo-Fr 8-18 Uhr; Abweichungen möglich', false],
    ];
    for (const [input, expected] of cases) {
        it(`is ${expected} for "${input}"`, () => {
            assert.equal(isReliable(parse(input)), expected);
        });
    }
});
