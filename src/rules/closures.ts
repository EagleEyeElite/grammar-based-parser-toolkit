// Copyright (C) 2026 Conrad Klaus
// SPDX-License-Identifier: GPL-3.0-only

import { createToken, type IToken } from 'chevrotain';
import type { GrammarBuilder, GrammarComponent } from '../componentParser.ts';

/** What a closure note refers to. */
export const ClosureSubject = Object.freeze({
    NATIONAL_HOLIDAYS: 'NATIONAL_HOLIDAYS',
    SCHOOL_VACATION: 'SCHOOL_VACATION',
    GENERAL_DEVIATIONS: 'GENERAL_DEVIATIONS',
    EVENT_BASED: 'EVENT_BASED',
    OCCUPANCY_BASED: 'OCCUPANCY_BASED',
} as const);

export type ClosureSubject = (typeof ClosureSubject)[keyof typeof ClosureSubject];

/** A note about exceptions to the opening hours. */
export interface ClosureEntry {
    type: 'Closure';
    subject: ClosureSubject;
}

/**
 * Builds a case-insensitive pattern from phrase alternatives. Each phrase may
 * be wrapped in parentheses and followed by a period.
 */
function phrases(...alternatives: string[]): RegExp {
    const body = alternatives.map((alt) => `\\(?${alt}\\)?\\.?`).join('|');
    return new RegExp(body, 'i');
}

export const NationalHolidaysClosure = createToken({
    name: 'NationalHolidaysClosure',
    pattern: phrases(
        String.raw`außer\s+(?:an\s+)?(?:gesetzlichen\s+)?feiertag(?:en|e)`,
        String.raw`ausgenommen\s+(?:an\s+)?(?:gesetzlichen?\s+)?feiertag(?:en|e)`,
        String.raw`feiertage\s+ausgenommen`,
        String.raw`sonn-\s+und\s+feiertage\s+geschlossen`,
        String.raw`an\s+feiertagen\s+können\s+die\s+öffnungszeiten\s+abweichen`,
        String.raw`öffnungszeiten\s+können\s+(?:in\s+den\s+ferien\s+und\s+)?an\s+feiertagen\s+abweichen`,
    ),
});

export const SchoolVacationClosure = createToken({
    name: 'SchoolVacationClosure',
    pattern: phrases(
        String.raw`ausgenommen\s+(?:während\s+der\s+)?(?:schul)?ferien`,
        String.raw`außer\s+in\s+den\s+(?:schul)?ferien`,
        String.raw`öffnungszeiten\s+können\s+in\s+den\s+ferien(?:\s+und\s+an\s+feiertagen)?\s+abweichen`,
    ),
});

export const DeviationsClosure = createToken({
    name: 'DeviationsClosure',
    pattern: phrases(
        String.raw`(?:einschränkungen|abweichungen|änderungen)\s+vorbehalten`,
        String.raw`abweichungen\s+möglich`,
    ),
});

export const EventBasedClosure = createToken({
    name: 'EventBasedClosure',
    pattern: phrases(
        String.raw`(?:auch\s+|zusätzlich\s+)?bei\s+veranstaltungen`,
    ),
});

export const OccupancyBasedClosure = createToken({
    name: 'OccupancyBasedClosure',
    pattern: phrases(
        String.raw`(?:am\s+wochenende\s+)?je\s+nach\s+belegung`,
    ),
});

const closureTypes = [
    { token: NationalHolidaysClosure, subject: ClosureSubject.NATIONAL_HOLIDAYS },
    { token: SchoolVacationClosure, subject: ClosureSubject.SCHOOL_VACATION },
    { token: DeviationsClosure, subject: ClosureSubject.GENERAL_DEVIATIONS },
    { token: EventBasedClosure, subject: ClosureSubject.EVENT_BASED },
    { token: OccupancyBasedClosure, subject: ClosureSubject.OCCUPANCY_BASED },
];

/**
 * Grammar for a single closure note such as "außer an Feiertagen" or "(Änderungen vorbehalten)".
 */
function defineRules($: GrammarBuilder) {
    const closureExpression = $.RULE('closureExpression', () => {
        $.OR(closureTypes.map(({ token }) => ({ ALT: () => $.CONSUME(token) })));
    });

    return { closureExpression };
}

function closureExpression(ctx: Record<string, IToken[] | undefined>): ClosureEntry {
    const match = closureTypes.find(({ token }) => ctx[token.name]);
    if (!match) {
        throw new Error('Unrecognized closure expression');
    }
    return { type: 'Closure', subject: match.subject };
}

const component: GrammarComponent<'closureExpression'> = {
    tokens: closureTypes.map(({ token }) => token),
    defineRules,
    visitorMethods: { closureExpression },
    entryRule: 'closureExpression',
};

export default component;
