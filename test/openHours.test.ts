// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ComponentParser } from '../src/componentParser.ts';
import { baseTokens } from '../src/rules/sharedTokens.ts';
import openHours, { type OpenHoursEntry } from '../src/rules/openHours.ts';
import type { Weekday } from '../src/rules/days.ts';

const parser = new ComponentParser(openHours, baseTokens);

const hours = (days: Weekday[], startTime: number, endTime: number): OpenHoursEntry =>
    ({ type: 'OpenHours', days, startTime, endTime });

describe('open hours', () => {
    const valid: [string, OpenHoursEntry[]][] = [
        ['Di 10:00-18:00', [hours([2], 600, 1080)]],
        ['Di. 10-18 Uhr', [hours([2], 600, 1080)]],
        ['Di-Sa: 10:00-18:00 Uhr', [hours([2, 3, 4, 5, 6], 600, 1080)]],
        ['Dienstag bis Samstag, 10 bis 18 Uhr', [hours([2, 3, 4, 5, 6], 600, 1080)]],
        ['Di+Do: 14:00-19:30 Uhr', [hours([2, 4], 840, 1170)]],
        [
            'Di-Fr: 10:00-18:00 Uhr, Sa: 09:00-13:00 Uhr',
            [hours([2, 3, 4, 5], 600, 1080), hours([6], 540, 780)],
        ],
        [
            'Mi: 7.30-12.00; Do: 13.00-17.30',
            [hours([3], 450, 720), hours([4], 780, 1050)],
        ],
        [
            'Mo-Do 7-16 Fr 7-13 Uhr',
            [hours([1, 2, 3, 4], 420, 960), hours([5], 420, 780)],
        ],
        [
            'Sa+So: 11:00-17:00 Uhr, Mo: 12:00-16:00 Uhr, Mi: 12:00-16:00 Uhr',
            [hours([6, 7], 660, 1020), hours([1], 720, 960), hours([3], 720, 960)],
        ],
    ];
    for (const [input, expected] of valid) {
        it(`parses "${input}"`, () => {
            assert.deepEqual(parser.parse(input), expected);
        });
    }

    const invalid = [
        'Di',
        'Di-Sa',
        'Di:',
        '10:00-18:00 Uhr',
        'Di: 10:00 Uhr',
        'Di: -18:00',
        'Di: 10:00-24:30',
        'Di, Sa: 10:00-18:00',
        'Di++Sa: 10:00-18:00',
        'nach Vereinbarung',
    ];
    for (const input of invalid) {
        it(`rejects "${input}"`, () => {
            assert.throws(() => parser.parse(input));
        });
    }
});
