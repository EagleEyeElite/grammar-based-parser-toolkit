// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ComponentParser } from '../src/componentParser.ts';
import { baseTokens } from '../src/rules/sharedTokens.ts';
import closures, { ClosureSubject } from '../src/rules/closures.ts';

const parser = new ComponentParser(closures, baseTokens);

const {
    NATIONAL_HOLIDAYS, SCHOOL_VACATION, GENERAL_DEVIATIONS, EVENT_BASED, OCCUPANCY_BASED,
} = ClosureSubject;

describe('closures', () => {
    const valid: [string, ClosureSubject][] = [
        ['außer Feiertage', NATIONAL_HOLIDAYS],
        ['außer an Feiertagen', NATIONAL_HOLIDAYS],
        ['außer an gesetzlichen Feiertagen', NATIONAL_HOLIDAYS],
        ['ausgenommen Feiertage', NATIONAL_HOLIDAYS],
        ['ausgenommen gesetzliche Feiertage', NATIONAL_HOLIDAYS],
        ['ausgenommen an gesetzlichen Feiertagen', NATIONAL_HOLIDAYS],
        ['Feiertage ausgenommen', NATIONAL_HOLIDAYS],
        ['Sonn- und Feiertage geschlossen', NATIONAL_HOLIDAYS],
        ['An Feiertagen können die Öffnungszeiten abweichen', NATIONAL_HOLIDAYS],
        ['Öffnungszeiten können an Feiertagen abweichen', NATIONAL_HOLIDAYS],
        ['Öffnungszeiten können in den Ferien und an Feiertagen abweichen', NATIONAL_HOLIDAYS],
        ['ausgenommen Ferien', SCHOOL_VACATION],
        ['ausgenommen Schulferien', SCHOOL_VACATION],
        ['ausgenommen während der Schulferien', SCHOOL_VACATION],
        ['außer in den Schulferien', SCHOOL_VACATION],
        ['Öffnungszeiten können in den Ferien abweichen', SCHOOL_VACATION],
        ['Änderungen vorbehalten', GENERAL_DEVIATIONS],
        ['Abweichungen vorbehalten', GENERAL_DEVIATIONS],
        ['Einschränkungen vorbehalten', GENERAL_DEVIATIONS],
        ['Abweichungen möglich', GENERAL_DEVIATIONS],
        ['bei Veranstaltungen', EVENT_BASED],
        ['auch bei Veranstaltungen', EVENT_BASED],
        ['zusätzlich bei Veranstaltungen', EVENT_BASED],
        ['je nach Belegung', OCCUPANCY_BASED],
        ['am Wochenende je nach Belegung', OCCUPANCY_BASED],
        // Formatting variations
        ['(außer an Feiertagen)', NATIONAL_HOLIDAYS],
        ['außer an Feiertagen.', NATIONAL_HOLIDAYS],
        ['(Änderungen vorbehalten).', GENERAL_DEVIATIONS],
        ['AUSGENOMMEN SCHULFERIEN', SCHOOL_VACATION],
        ['abweichungen   möglich', GENERAL_DEVIATIONS],
    ];
    for (const [input, subject] of valid) {
        it(`parses "${input}" as ${subject}`, () => {
            assert.deepEqual(parser.parse(input), { type: 'Closure', subject });
        });
    }

    const invalid = [
        'geschlossen',
        'Feiertage',
        'außer an',
        'ausgenommen',
        'Änderungen',
        'nach Absprache',
        '',
    ];
    for (const input of invalid) {
        it(`rejects "${input}"`, () => {
            assert.throws(() => parser.parse(input));
        });
    }
});
