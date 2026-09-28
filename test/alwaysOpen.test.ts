// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ComponentParser } from '../src/componentParser.ts';
import { baseTokens } from '../src/rules/sharedTokens.ts';
import alwaysOpen from '../src/rules/alwaysOpen.ts';

const parser = new ComponentParser(alwaysOpen, baseTokens);

describe('always open', () => {
    const valid = [
        '24/7',
        '24 / 7',
        '24h',
        '24 H',
        '24 Stunden',
        '24 stunden / 7 tage',
        '24h/7 Tage',
        'Täglich 24h',
        'täglich: 24 Stunden',
        'TÄGLICH 24/7',
    ];
    for (const input of valid) {
        it(`parses "${input}"`, () => {
            assert.deepEqual(parser.parse(input), { type: 'AlwaysOpen' });
        });
    }

    const invalid = [
        '12h',
        '0-24 Uhr',
        'rund um die Uhr',
        'durchgehend geöffnet',
        'Sa 24h',
        '',
    ];
    for (const input of invalid) {
        it(`rejects "${input}"`, () => {
            assert.throws(() => parser.parse(input));
        });
    }
});
