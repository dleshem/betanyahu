import assert from 'node:assert/strict';
import test from 'node:test';
import {
    API_URL, ROLE_MARKETS, CANDIDATES_SLUG, DEFENSE_SLUG, SPEAKER_SLUG,
    DEFENSE_NO_APPOINTMENT_SLUG, CONFIDENCE_SLUG,
    HUNG_PARLIAMENT_SLUG, COALITION_SLUG, COALITION_NO_GOVERNMENT_SLUG,
    getCandidates, getRoleCandidates, getGovernmentOutcomes, getCoalitionOutcomes,
    formatProbability, isProbabilityRange,
} from '../docs/polymarket.mjs';

function market(overrides = {}) {
    return {
        outcomes: '["Yes", "No"]',
        // Deliberately disagree with the book so using reported prices fails tests.
        outcomePrices: '["0.99", "0.01"]',
        bestBid: 0.1,
        bestAsk: 0.5,
        groupItemTitle: 'Candidate',
        ...overrides,
    };
}

function event(slug, markets) {
    return { slug, markets };
}

function near(actual, expected) {
    assert.ok(Math.abs(actual - expected) < 1e-12, `Expected ${expected}, got ${actual}`);
}

function snapshot() {
    const roles = ROLE_MARKETS.map(role => event(role.slug, [market()]));
    roles.find(role => role.slug === DEFENSE_SLUG).markets.push(market({
        slug: DEFENSE_NO_APPOINTMENT_SLUG,
        groupItemTitle: 'No Next Minister by Feb 28',
        bestBid: 0.1,
        bestAsk: 0.3,
    }));
    return [
        ...roles,
        event(CONFIDENCE_SLUG, [market({ slug: CONFIDENCE_SLUG, bestBid: 0.2, bestAsk: 0.6 })]),
        event(HUNG_PARLIAMENT_SLUG, [market({ slug: HUNG_PARLIAMENT_SLUG, bestBid: 0.1, bestAsk: 0.2 })]),
        event(COALITION_SLUG, [
            market({ groupItemTitle: 'L + Y', bestBid: 0.1, bestAsk: 0.7 }),
            market({ groupItemTitle: 'Y + T + B + D', bestBid: 0.5, bestAsk: 0.9 }),
            // Ignored entirely, even when its quotes are missing.
            market({ slug: COALITION_NO_GOVERNMENT_SLUG, groupItemTitle: 'No government formed', bestBid: null, bestAsk: null }),
            market({ groupItemTitle: 'Other', bestBid: 0.004, bestAsk: 0.006 }),
        ]),
    ];
}

test('one request loads only the 11 events used by roles, government periods, and coalitions', () => {
    const events = snapshot();
    assert.equal(events.length, 11);
    assert.deepEqual(new URL(API_URL).searchParams.getAll('slug').sort(), events.map(event => event.slug).sort());
    const roles = getRoleCandidates(events);
    assert.equal(roles.size, ROLE_MARKETS.length);
    for (const candidates of roles.values()) {
        assert.equal(candidates.length, 1);
        near(candidates[0].probability, 0.3);
    }
    const government = getGovernmentOutcomes(events);
    near(government.novemberDecember2026.probability, 0.4);
    near(government.januaryFebruary2027.probability, 0.4);
    near(government.marchJune2027.probability, 0.05);
    near(government.anotherElection.probability, 0.15);
    const coalitions = getCoalitionOutcomes(events);
    assert.deepEqual(coalitions.map(coalition => coalition.name), [
        'ישר! + ביחד + ישראל ביתנו + הדמוקרטים', 'הליכוד + ישר!', 'הרכב אחר',
    ]);
    near(coalitions[0].probability, 0.7);
    near(coalitions[1].probability, 0.4);
    near(coalitions[2].probability, 0.005);
});

test('candidate ranking and the strict 1% cutoff use unrounded midpoints', () => {
    const candidates = getCandidates(event(CANDIDATES_SLUG, [
        market({ groupItemTitle: 'Lower', bestBid: 0.1, bestAsk: 0.7 }),
        market({ groupItemTitle: 'At cutoff', bestBid: 0.004, bestAsk: 0.016 }),
        market({ groupItemTitle: 'Above cutoff', bestBid: 0.004, bestAsk: 0.0162 }),
        market({ groupItemTitle: 'Higher', bestBid: 0.5, bestAsk: 0.9 }),
    ]));
    assert.deepEqual(candidates.map(candidate => candidate.name), ['Higher', 'Lower', 'Above cutoff']);
    near(candidates[0].probability, 0.7);
    near(candidates[1].probability, 0.4);
    near(candidates[2].probability, 0.0101);
});

test('speaker candidates exclude missing-election outcomes and inactive placeholders while retaining candidate names and odds', () => {
    const events = snapshot();
    events.find(event => event.slug === SPEAKER_SLUG).markets = [
        market({ groupItemTitle: 'Amir Ohana', bestBid: 0.1, bestAsk: 0.3 }),
        market({ groupItemTitle: undefined, question: 'Will Ofir Katz be the next Speaker of the Knesset?', bestBid: 0.4, bestAsk: 0.6 }),
        market({ slug: 'will-no-speaker-of-the-knesset-be-elected-by-february-28-20261019103128390', groupItemTitle: undefined, bestBid: null, bestAsk: null }),
        market({ groupItemTitle: ' No speaker by Feb 28 ', bestBid: null, bestAsk: null }),
        market({ groupItemTitle: 'Person 1', active: false, bestBid: null, bestAsk: null }),
        market({ groupItemTitle: 'At cutoff', bestBid: 0.004, bestAsk: 0.016 }),
    ];
    const candidates = getRoleCandidates(events).get(SPEAKER_SLUG);
    assert.deepEqual(candidates.map(candidate => candidate.name), ['Ofir Katz', 'Amir Ohana']);
    near(candidates[0].probability, 0.5);
    near(candidates[1].probability, 0.2);
    assert.equal(formatProbability(candidates[0]), '50% (±10%)');
});

test('inconsistent deadline midpoints still clamp negative period differences to zero', () => {
    const events = snapshot();
    Object.assign(events.find(event => event.slug === CONFIDENCE_SLUG).markets[0], { bestBid: 0.8, bestAsk: 0.9 });
    Object.assign(events.find(event => event.slug === DEFENSE_SLUG).markets[1], { bestBid: 0.5, bestAsk: 0.7 });
    Object.assign(events.find(event => event.slug === HUNG_PARLIAMENT_SLUG).markets[0], { bestBid: 0.8, bestAsk: 0.9 });
    const government = getGovernmentOutcomes(events);
    assert.equal(government.januaryFebruary2027.probability, 0);
    assert.equal(government.marchJune2027.probability, 0);
});

function quoteOdds(overrides) {
    return getCoalitionOutcomes([
        event(COALITION_SLUG, [market(overrides)]),
    ])[0];
}

function quoteProbability(overrides) {
    return quoteOdds(overrides).probability;
}

test('one-sided books use price bounds, preserving genuine zero and one quotes', () => {
    near(quoteProbability({ bestBid: undefined, bestAsk: 0.002 }), 0.001);
    near(quoteProbability({ bestBid: null, bestAsk: 0.2 }), 0.1);
    near(quoteProbability({ bestBid: 0.8, bestAsk: undefined }), 0.9);
    near(quoteProbability({ bestBid: 0.8, bestAsk: null }), 0.9);
    assert.equal(quoteProbability({ bestBid: 0, bestAsk: 0 }), 0);
    assert.equal(quoteProbability({ bestBid: 1, bestAsk: 1 }), 1);
    assert.equal(quoteProbability({ bestBid: 0, bestAsk: 1 }), 0.5);
});

test('numeric string quotes and reversed outcome order retain the quote-to-outcome mapping', () => {
    near(quoteProbability({ bestBid: '0.2', bestAsk: '0.8', outcomePrices: undefined }), 0.5);
    near(quoteProbability({ outcomes: [' No ', ' YES '], bestBid: '0.1', bestAsk: '0.3' }), 0.8);
});

test('empty books and malformed quotes fail validation instead of falling back to trade prices', () => {
    for (const [bestBid, bestAsk] of [
        [undefined, undefined], [null, null], [false, 0.5], ['', 0.5], [' ', 0.5],
        [[], 0.5], [{}, 0.5], [-0.1, 0.5], [0.1, 1.1], [NaN, 0.5],
        [0.1, Infinity], [0.1, 'invalid'], [0.7, 0.2],
    ]) {
        assert.throws(() => quoteProbability({ bestBid, bestAsk }));
    }
    assert.throws(() => quoteProbability({ outcomes: ['Yes', 'Maybe'] }));
});

test('display uses midpoint with a rounded margin at or above five percentage points and midpoints below it', () => {
    for (const [lower, upper, expected] of [
        [0.3, 0.3499, '32.495%'],
        [0.3, 0.35, '32.5% (±3%)'],
        [0.1, 0.15, '12.5% (±3%)'],
        [0.94, 0.99, '96.5% (±3%)'],
        [0.1, 0.7, '40% (±30%)'],
        [0.14, 0.3, '22% (±8%)'],
        [0, 0, '0%'],
        [1, 1, '100%'],
        [0, 1, '50% (±50%)'],
    ]) {
        const odds = quoteOdds({ bestBid: lower, bestAsk: upper });
        assert.equal(formatProbability(odds), expected);
    }
    assert.equal(isProbabilityRange({ lower: 0.3, upper: 0.349999 }), false);
});

test('reversed outcomes and one-sided books preserve display bounds', () => {
    const reversed = quoteOdds({ outcomes: ['No', 'Yes'], bestBid: 0.1, bestAsk: 0.3 });
    near(reversed.lower, 0.7);
    near(reversed.upper, 0.9);
    assert.equal(formatProbability(reversed), '80% (±10%)');
    assert.equal(formatProbability(quoteOdds({ bestBid: null, bestAsk: 0.2 })), '10% (±10%)');
    assert.equal(formatProbability(quoteOdds({ bestBid: 0.8, bestAsk: null })), '90% (±10%)');
});

test('all display sections carry the appropriate bid–ask bounds', () => {
    const events = snapshot();
    for (const candidates of getRoleCandidates(events).values()) {
        assert.equal(formatProbability(candidates[0]), '30% (±20%)');
    }
    const coalitions = getCoalitionOutcomes(events);
    assert.equal(formatProbability(coalitions[0]), '70% (±20%)');
    assert.equal(formatProbability(coalitions[1]), '40% (±30%)');
    assert.equal(formatProbability(coalitions[2]), '0.5%');
    const government = getGovernmentOutcomes(events);
    assert.equal(formatProbability(government.novemberDecember2026), '40% (±20%)');
    assert.equal(formatProbability(government.januaryFebruary2027), '40% (±30%)');
    assert.equal(formatProbability(government.marchJune2027), '10% (±10%)');
    assert.equal(formatProbability(government.anotherElection), '15% (±5%)');
});

test('period ranges combine deadline bounds and clamp negative endpoints to zero', () => {
    const events = snapshot();
    Object.assign(events.find(event => event.slug === CONFIDENCE_SLUG).markets[0], { bestBid: 0.4, bestAsk: 0.43 });
    Object.assign(events.find(event => event.slug === DEFENSE_SLUG).markets[1], { bestBid: 0.4, bestAsk: 0.43 });
    const government = getGovernmentOutcomes(events);
    // Both source spreads are below 5%, but their difference spans six points.
    assert.equal(formatProbability(government.januaryFebruary2027), '17% (±3%)');
    Object.assign(events.find(event => event.slug === CONFIDENCE_SLUG).markets[0], { bestBid: 0.7, bestAsk: 0.9 });
    const clamped = getGovernmentOutcomes(events).januaryFebruary2027;
    assert.deepEqual(clamped, { probability: 0, lower: 0, upper: 0 });
});

test('coalitions omit no-government outcomes by slug or label and skip inactive outcomes', () => {
    const events = snapshot();
    const coalition = events.find(event => event.slug === COALITION_SLUG);
    coalition.markets.push(
        market({ slug: COALITION_NO_GOVERNMENT_SLUG, groupItemTitle: undefined, bestBid: null, bestAsk: null }),
        market({ slug: 'renamed-no-government-market', groupItemTitle: ' NO GOVERNMENT FORMED ', bestBid: null, bestAsk: null }),
        market({ groupItemTitle: 'Closed', closed: true, bestBid: null, bestAsk: null }),
        market({ groupItemTitle: 'Archived', archived: true, bestBid: null, bestAsk: null }),
        market({ groupItemTitle: 'Inactive', active: false, bestBid: null, bestAsk: null }),
    );
    assert.equal(getCoalitionOutcomes(events).length, 3);
});

test('missing or invalid coalition data fails validation so refresh can retain the previous snapshot', () => {
    for (const events of [null, {}, [], [event(COALITION_SLUG, [])],
        [{ ...event(COALITION_SLUG, [market()]), closed: true }],
        [{ ...event(COALITION_SLUG, [market()]), active: false }],
        [event(COALITION_SLUG, [null])],
        [event(COALITION_SLUG, [market({ groupItemTitle: ' ' })])],
        [event(COALITION_SLUG, [market({ groupItemTitle: 'No government formed' })])],
    ]) {
        assert.throws(() => getCoalitionOutcomes(events));
    }
});
