// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { createToken, Lexer } from 'chevrotain';

export const WhiteSpace = createToken({
    name: 'WhiteSpace',
    pattern: /\s+/,
    group: Lexer.SKIPPED,
    line_breaks: true,
});

export const Dash = createToken({ name: 'Dash', pattern: /-/ });
export const Bis = createToken({ name: 'Bis', pattern: /bis/i });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });

/** Tokens every component parser understands. */
export const baseTokens = [WhiteSpace, Dash, Bis, Comma, Semicolon];
