// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { createToken } from 'chevrotain';

/** "24/7", "24h", "täglich 24 Stunden", "24 Stunden / 7 Tage", ... */
export const AlwaysOpen = createToken({
    name: 'AlwaysOpen',
    pattern: /(?:täglich:?\s+)?24\s*(?:h|stunden)(?:\s*\/\s*7\s+tage)?|(?:täglich:?\s+)?24\s*\/\s*7|24\s+stunden(?:\s*\/\s*7\s+tage)?/i,
});

function defineRules($) {
    $.RULE('alwaysOpenExpression', () => {
        $.CONSUME(AlwaysOpen);
    });
}

/**
 * @returns {{type: 'AlwaysOpen'}}
 */
function alwaysOpenExpression() {
    return { type: 'AlwaysOpen' };
}

export default {
    tokens: [AlwaysOpen],
    defineRules,
    visitorMethods: { alwaysOpenExpression },
    entryRule: 'alwaysOpenExpression',
};
