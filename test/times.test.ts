// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ComponentParser } from '../src/componentParser.ts';
import { baseTokens } from '../src/rules/sharedTokens.ts';
import times, { convertTimeToMinutes } from '../src/rules/times.ts';

const parser = new ComponentParser(times, baseTokens);

describe('times', () => {
    const valid: [string, { startTime: number; endTime: number }][] = [
        ['06:30-14:45', { startTime: 390, endTime: 885 }],
        ['6:30 - 14:45', { startTime: 390, endTime: 885 }],
        ['9 - 13', { startTime: 540, endTime: 780 }],
        ['9 bis 13 Uhr', { startTime: 540, endTime: 780 }],
        ['9 Uhr bis 13 Uhr', { startTime: 540, endTime: 780 }],
        ['11.15 Uhr - 15.45 Uhr', { startTime: 675, endTime: 945 }],
        ['13:00-21:30Uhr', { startTime: 780, endTime: 1290 }],
        ['05:00 BIS 23:15 UHR', { startTime: 300, endTime: 1395 }],
        ['0:00-23:59', { startTime: 0, endTime: 1439 }],
    ];
    for (const [input, expected] of valid) {
        it(`parses "${input}"`, () => {
            assert.deepEqual(parser.parse(input), expected);
        });
    }

    const invalid = [
        '14:45',
        '14:45 -',
        '- 14:45',
        '24:00-06:00',
        '10:60-12:00',
        '10:00 12:00',
        'mittags',
    ];
    for (const input of invalid) {
        it(`rejects "${input}"`, () => {
            assert.throws(() => parser.parse(input));
        });
    }

    it('converts single times to minutes', () => {
        assert.equal(convertTimeToMinutes('7'), 420);
        assert.equal(convertTimeToMinutes('07.05'), 425);
        assert.equal(convertTimeToMinutes('19:40 Uhr'), 1180);
        assert.throws(() => convertTimeToMinutes('25'));
        assert.throws(() => convertTimeToMinutes('12:3:4'));
    });
});
