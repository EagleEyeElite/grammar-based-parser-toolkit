# grammar-based-parser-toolkit

Turn messy, free-form strings into structured data by writing small grammar rules and combining them.

Regular expressions get unreadable fast once input has structure: lists, ranges, optional parts, notes at the end. This toolkit lets you describe that structure as a grammar instead, built from small, separately testable components on top of [Chevrotain](https://chevrotain.io). Each component brings its own tokens, rules and a visitor that turns what was parsed into plain objects. Components can be reused and combined into bigger grammars.

It ships with a complete, real-world example: a grammar for **German opening hours** that understands input like

```
Mo-Fr 08:00-16:30 Uhr, Sa: 9-13 Uhr; außer an gesetzlichen Feiertagen
```

## Getting started

Requires Node.js 22.18 or newer. Written in TypeScript; tests and examples run directly from the sources.

```sh
npm install       # also builds dist/
npm test
npm run typecheck
npm run example   # parses a list of sample opening-hours strings
```

It isn't published to npm; install it from GitHub with
`npm install github:EagleEyeElite/grammar-based-parser-toolkit`.

## How it works

A grammar is made of **components**. A component is a plain object with four parts:

| Part | Purpose |
|---|---|
| `tokens` | The token types the component needs, in lexing priority order (the lexer takes the first match) |
| `defineRules($)` | Defines the grammar rules with Chevrotain's DSL and returns them |
| `visitorMethods` | One function per rule that turns the parsed rule into a result value |
| `entryRule` | The rule parsing starts with |

`ComponentParser` takes a component and builds lexer, parser and visitor from it. `parse(input)` then returns the entry rule's result or throws with a lexing or parsing error.

Because `defineRules` returns its rules, a bigger component can call a smaller one's `defineRules` and use its rules as building blocks. The opening-hours grammar is composed like this:

```
operatingHours
├── alwaysOpen      "24/7", "täglich 24h"
├── closures        "außer an Feiertagen", "Änderungen vorbehalten"
└── openHours       "Mo-Fr: 8-16 Uhr, Sa: 9-13 Uhr"
    ├── days        "Mo-Fr", "Di+Do", "Montag bis Freitag"
    └── times       "08:00-16:00", "8 Uhr bis 20 Uhr"
```

Every component can also be parsed and tested on its own, which keeps grammar changes easy to verify.

## Write your own grammar

A grammar for shopping lists like `3x Äpfel, 2 x Birnen, 10x Eier`:

```ts
import {
    ComponentParser, WhiteSpace, Comma, createToken,
    type GrammarBuilder, type GrammarComponent, type IToken, type Visitor, type CstNode,
} from 'grammar-based-parser-toolkit';

const Quantity = createToken({ name: 'Quantity', pattern: /\d+\s*x/i });
const Item = createToken({ name: 'Item', pattern: /[A-Za-zÄÖÜäöüß]+/ });

interface Entry { item: string; count: number }

function defineRules($: GrammarBuilder) {
    const entry = $.RULE('entry', () => {
        $.CONSUME(Quantity);
        $.CONSUME(Item);
    });
    const list = $.RULE('list', () => {
        $.SUBRULE(entry);
        $.MANY(() => {
            $.CONSUME(Comma);
            $.SUBRULE2(entry);
        });
    });
    return { entry, list };
}

const shoppingList: GrammarComponent<'entry' | 'list'> = {
    tokens: [Quantity, Item],
    defineRules,
    visitorMethods: {
        entry: (ctx: { Quantity: [IToken]; Item: [IToken] }): Entry => ({
            item: ctx.Item[0].image,
            count: parseInt(ctx.Quantity[0].image, 10),
        }),
        list(this: Visitor, ctx: { entry: CstNode[] }): Entry[] {
            return ctx.entry.map((e) => this.visit(e) as Entry);
        },
    },
    entryRule: 'list',
};

const parser = new ComponentParser<Entry[]>(shoppingList, [WhiteSpace, Comma]);

parser.parse('3x Äpfel, 2 x Birnen, 10x Eier');
// [{ item: 'Äpfel', count: 3 }, { item: 'Birnen', count: 2 }, { item: 'Eier', count: 10 }]
```

The second argument to `ComponentParser` holds tokens shared across components. The toolkit exports `WhiteSpace` (skipped), `Dash`, `Bis`, `Comma` and `Semicolon`; `baseTokens` is the set the opening-hours grammar uses.

Tips:
- Using the same DSL method twice in one rule needs a numeric suffix (`SUBRULE2`, `CONSUME2`, `OR1`, …). This is a Chevrotain requirement.
- Put long, specific tokens before short, generic ones. The lexer takes the first token type that matches, not the longest.
- Build parsers at module level in tests, not inside `describe`. Node's test runner doesn't fail the run on errors thrown while a `describe` block is being set up.

This example is also a test: [`test/customGrammar.test.ts`](test/customGrammar.test.ts).

## Example: German opening hours

```ts
import { parse, parseMany, isReliable } from 'grammar-based-parser-toolkit';

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
- `openingHoursGrammar` is the component itself, for use with your own `ComponentParser` or as a building block.

See [`examples/parse-list.ts`](examples/parse-list.ts) for a longer list of inputs, including ones the grammar doesn't cover.

### Result entries

All result types (`OpeningHoursEntry`, `OpenHoursEntry`, `ClosureEntry`, `AlwaysOpenEntry`, `ParseOutcome`) are exported.

| Type | Fields | Meaning |
|---|---|---|
| `OpenHours` | `days`, `startTime`, `endTime` | Open on the given days (ISO weekday numbers, 1 = Monday … 7 = Sunday) from `startTime` to `endTime` (minutes since midnight) |
| `Closure` | `subject` | A note about exceptions: `NATIONAL_HOLIDAYS`, `SCHOOL_VACATION`, `GENERAL_DEVIATIONS`, `EVENT_BASED` or `OCCUPANCY_BASED` |
| `AlwaysOpen` | – | Open around the clock |

### Supported syntax

| Part | Examples |
|---|---|
| Days | `Mo`, `Mo.`, `Montag`, `Mo-Fr`, `Mo bis Fr`, `Fr-So`, `Sa-Di` (wraps), `Di+Do`, `Mittwoch und Freitag` |
| Times | `8-12`, `08:00-12:00`, `8.30 - 12 Uhr`, `8 Uhr bis 12 Uhr`, `13:00-21:30Uhr` |
| Statements | `Mo-Fr: 8-16 Uhr`, `Mo-Fr, 8-16 Uhr`, `Mo-Do 8-17 Uhr; Fr 8-14 Uhr`, `Mo-Fr 7-19 Sa 8-12 Uhr` |
| Closure notes (after `,` or `;`) | `außer an (gesetzlichen) Feiertagen`, `Feiertage ausgenommen`, `Sonn- und Feiertage geschlossen`, `ausgenommen Schulferien`, `Änderungen vorbehalten`, `Abweichungen möglich`, `auch bei Veranstaltungen`, `je nach Belegung`; optionally in parentheses or with a trailing period |
| Always open | `24/7`, `24h`, `24 Stunden`, `täglich 24h`, `24 Stunden / 7 Tage` |

Matching is case-insensitive and whitespace-tolerant.

### Known limitations

- Several time ranges for the same days (`Mo-Fr 8-12 Uhr und 14-18 Uhr`) aren't supported.
- `24:00` as an end time is rejected; use `23:59`.
- Only one closure note per input, and it has to come last.
- Free text such as `nach Vereinbarung`, `werktags` or `sonst geschlossen` isn't understood.

## Project layout

```
src/
├── componentParser.ts   the toolkit: ComponentParser, GrammarComponent, GrammarBuilder
├── index.ts             public exports and the opening-hours API
└── rules/               the opening-hours grammar, one component per file
test/                    one test file per component, plus the README example
examples/parse-list.ts   opening-hours demo
```

## License

Copyright (C) 2026 Conrad Klaus

Licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE).
