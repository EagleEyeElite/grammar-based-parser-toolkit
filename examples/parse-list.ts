// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

// Parses a list of made-up opening-hours strings and prints the results.
// Run with: npm run example

import { parseMany, isReliable, type OpeningHoursEntry } from '../src/index.ts';

const inputs = [
    // Days: single, range, list, wrapping range
    'Di 14-18 Uhr',
    'Mittwoch 9:00-12:30',
    'Di-Sa 10:00-19:00 Uhr',
    'Montag bis Donnerstag 7.30 bis 16.15 Uhr',
    'Di+Do+Sa: 8-13 Uhr',
    'Mittwoch und Freitag, 15 bis 20 Uhr',
    'Fr-So 11:00-23:00 Uhr',

    // Several statements, with or without separators
    'Mo-Fr: 06:00-20:00 Uhr, Sa: 07:00-14:00 Uhr',
    'Mo-Do 8-17 Uhr; Fr 8-14 Uhr',
    'Mo-Fr 7.00-19.00 Sa 8.00-12.00 Uhr',
    'Mo+Mi+Fr: 9-12 Uhr, Di+Do: 14-18 Uhr, Sa: 10-12 Uhr',

    // Closure notes
    'Mo-Fr 08:00-16:30 Uhr, außer an gesetzlichen Feiertagen',
    'Di-So 10-17 Uhr; Feiertage ausgenommen',
    'Mo-Fr: 7:30-15:30 Uhr, ausgenommen Schulferien',
    'Mo-Sa 9-20 Uhr, Änderungen vorbehalten',
    'Sa+So 12-18 Uhr, auch bei Veranstaltungen',
    'Mo-Fr 17-22 Uhr, am Wochenende je nach Belegung',
    'Mo-Fr 9-18 Uhr, (Öffnungszeiten können in den Ferien abweichen)',

    // Always open
    '24/7',
    'täglich 24 Stunden',
    '24h / 7 Tage',

    // Not covered by the grammar
    'nach Vereinbarung',
    'rund um die Uhr',
    'Mo-Fr 8-12 Uhr und 14-18 Uhr',
    'werktags 9-17 Uhr',
    'Mo-Fr 9-17 Uhr, sonst geschlossen',
];

const dayNames = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function formatTime(minutes: number): string {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${h}:${m}`;
}

function formatEntry(entry: OpeningHoursEntry): string {
    switch (entry.type) {
        case 'OpenHours':
            return `${entry.days.map((d) => dayNames[d]).join(',')} ${formatTime(entry.startTime)}-${formatTime(entry.endTime)}`;
        case 'Closure':
            return `note: ${entry.subject}`;
        case 'AlwaysOpen':
            return 'always open';
    }
}

const results = parseMany(inputs);

for (const outcome of results) {
    console.log(outcome.input);
    if (outcome.ok) {
        for (const entry of outcome.result) {
            console.log(`  -> ${formatEntry(entry)}`);
        }
        console.log(`  reliable: ${isReliable(outcome.result)}`);
    } else {
        console.log(`  x ${outcome.error}`);
    }
    console.log();
}

const parsed = results.filter((r) => r.ok).length;
console.log(`${parsed}/${results.length} parsed`);
