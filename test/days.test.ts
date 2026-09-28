// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ComponentParser } from '../src/componentParser.ts';
import { baseTokens } from '../src/rules/sharedTokens.ts';
import days from '../src/rules/days.ts';

const parser = new ComponentParser(days, baseTokens);

describe('days', () => {
    const valid: [string, number[]][] = [
        ['Di', [2]],
        ['Do.', [4]],
        ['Samstag', [6]],
        ['DONNERSTAG', [4]],
        ['Di-Do', [2, 3, 4]],
        ['Di. - Sa.', [2, 3, 4, 5, 6]],
        ['Mittwoch bis Sonntag', [3, 4, 5, 6, 7]],
        ['Sa-Di', [6, 7, 1, 2]],
        ['So bis Mi', [7, 1, 2, 3]],
        ['Di+Do', [2, 4]],
        ['Di.+Do.+Sa.', [2, 4, 6]],
        ['Dienstag und Freitag', [2, 5]],
        ['Mi und Sa und So', [3, 6, 7]],
        ['Do+Fr und Sa', [4, 5, 6]],
    ];
    for (const [input, expected] of valid) {
        it(`parses "${input}"`, () => {
            assert.deepEqual(parser.parse(input), expected);
        });
    }

    const invalid = [
        'Tuesday',
        'Die',
        'Di+',
        '+Do',
        'Di-',
        '-Sa',
        'Di++Do',
        'Di+Do-Sa',
        'Sa und',
        'und Sa',
        'Sa und und So',
        '',
    ];
    for (const input of invalid) {
        it(`rejects "${input}"`, () => {
            assert.throws(() => parser.parse(input));
        });
    }
});
