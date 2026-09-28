// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

// The "Write your own grammar" example from the README.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    ComponentParser, WhiteSpace, Comma, createToken,
    type GrammarBuilder, type GrammarComponent, type IToken, type Visitor, type CstNode,
} from '../src/index.ts';

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

describe('custom grammar from the README', () => {
    it('parses a shopping list', () => {
        assert.deepEqual(parser.parse('3x Äpfel, 2 x Birnen, 10x Eier'), [
            { item: 'Äpfel', count: 3 },
            { item: 'Birnen', count: 2 },
            { item: 'Eier', count: 10 },
        ]);
    });

    it('rejects input outside the grammar', () => {
        assert.throws(() => parser.parse('Äpfel, Birnen'), /Parsing error/);
    });
});
