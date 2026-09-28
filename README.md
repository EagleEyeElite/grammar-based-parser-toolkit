# german-opening-hours-parser

Parses German opening-hours text such as

```
Mo-Fr 08:00-16:30 Uhr, Sa: 9-13 Uhr; außer an gesetzlichen Feiertagen
```

into structured data. Built on a [Chevrotain](https://chevrotain.io) grammar.

## Usage

Requires Node.js 22 or newer.

```sh
npm install
npm test
npm run example   # parses a list of sample strings, see examples/parse-list.js
```

```js
import { parse, parseMany, isReliable } from './src/index.js';

parse('Mo-Fr 08:00-16:30 Uhr, außer an Feiertagen');
// [
//   { type: 'OpenHours', days: [1, 2, 3, 4, 5], startTime: 480, endTime: 990 },
//   { type: 'Closure', subject: 'NATIONAL_HOLIDAYS' }
// ]

parseMany(['Di 14-18 Uhr', 'nach Vereinbarung']);
// [
//   { input: 'Di 14-18 Uhr', ok: true, result: [ ... ] },
//   { input: 'nach Vereinbarung', ok: false, error: 'Lexing error: ...' }
// ]
```

- `parse(input)` returns an array of entries and throws if the input doesn't match the grammar.
- `parseMany(inputs)` parses a list and never throws; each input gets an `ok` flag with either a `result` or an `error`.
- `isReliable(result)` is `false` if the hours carry a note saying they may change in general or during school vacations.

### Result entries

| Type | Fields | Meaning |
|---|---|---|
| `OpenHours` | `days`, `startTime`, `endTime` | Open on the given days (ISO weekday numbers, 1 = Monday … 7 = Sunday) from `startTime` to `endTime` (minutes since midnight) |
| `Closure` | `subject` | A note about exceptions: `NATIONAL_HOLIDAYS`, `SCHOOL_VACATION`, `GENERAL_DEVIATIONS`, `EVENT_BASED` or `OCCUPANCY_BASED` |
| `AlwaysOpen` | – | Open around the clock |

## Supported syntax

| Part | Examples |
|---|---|
| Days | `Mo`, `Mo.`, `Montag`, `Mo-Fr`, `Mo bis Fr`, `Fr-So`, `Sa-Di` (wraps), `Di+Do`, `Mittwoch und Freitag` |
| Times | `8-12`, `08:00-12:00`, `8.30 - 12 Uhr`, `8 Uhr bis 12 Uhr`, `13:00-21:30Uhr` |
| Statements | `Mo-Fr: 8-16 Uhr`, `Mo-Fr, 8-16 Uhr`, `Mo-Do 8-17 Uhr; Fr 8-14 Uhr`, `Mo-Fr 7-19 Sa 8-12 Uhr` |
| Closure notes (after `,` or `;`) | `außer an (gesetzlichen) Feiertagen`, `Feiertage ausgenommen`, `ausgenommen Schulferien`, `Änderungen vorbehalten`, `Abweichungen möglich`, `auch bei Veranstaltungen`, `je nach Belegung`; optionally in parentheses or with a trailing period |
| Always open | `24/7`, `24h`, `24 Stunden`, `täglich 24h`, `24 Stunden / 7 Tage` |

Matching is case-insensitive and whitespace-tolerant.

## Known limitations

- Several time ranges for the same days (`Mo-Fr 8-12 Uhr und 14-18 Uhr`) aren't supported.
- `24:00` as an end time is rejected; use `23:59`.
- Only one closure note per input, and it has to come last.
- Free text such as `nach Vereinbarung`, `werktags` or `sonst geschlossen` isn't understood.

## License

Copyright (C) 2026 Conrad Klaus

Licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE).
