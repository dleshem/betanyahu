import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ROLE_MARKETS, PARTY_MARKETS, CANDIDATES_SLUG, DEFENSE_SLUG,
    DEFENSE_NO_APPOINTMENT_SLUG, SCHEDULE_SLUG, CONFIDENCE_SLUG,
    HUNG_PARLIAMENT_SLUG, BLOC_MAJORITY_SLUG,
    getCandidates, getRoleCandidates, getElectionOutcomes, getGovernmentOutcomes,
    getBlocOutcomes, getPartyDistributions,
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
    const parties = PARTY_MARKETS.map(party => event(party.slug, [
        market({ groupItemTitle: party.estimateSeatsFromVoteShare ? '<3.25%' : '<4' }),
        market({ groupItemTitle: party.estimateSeatsFromVoteShare ? '3.25%+' : '4+', bestBid: 0.4, bestAsk: 0.8 }),
    ]));
    return [
        ...roles, ...parties,
        event(SCHEDULE_SLUG, [market({ slug: SCHEDULE_SLUG, bestBid: 0.8, bestAsk: 0.98 })]),
        event(CONFIDENCE_SLUG, [market({ slug: CONFIDENCE_SLUG, bestBid: 0.2, bestAsk: 0.6 })]),
        event(HUNG_PARLIAMENT_SLUG, [market({ slug: HUNG_PARLIAMENT_SLUG, bestBid: 0.1, bestAsk: 0.2 })]),
        event(BLOC_MAJORITY_SLUG, [market({ slug: BLOC_MAJORITY_SLUG, bestBid: 0.2, bestAsk: 0.8 })]),
    ];
}

test('all 24 events use midpoints for roles, party charts, elections, government periods, and blocs', () => {
    const events = snapshot();
    assert.equal(events.length, 24);
    const roles = getRoleCandidates(events);
    assert.equal(roles.size, ROLE_MARKETS.length);
    for (const candidates of roles.values()) {
        assert.equal(candidates.length, 1);
        near(candidates[0].probability, 0.3);
    }
    const parties = getPartyDistributions(events);
    assert.equal(parties.size, PARTY_MARKETS.length);
    for (const party of PARTY_MARKETS) {
        const bins = parties.get(party.slug);
        assert.deepEqual(bins.map(bin => bin.label), [party.estimateSeatsFromVoteShare ? '0' : '<4', '4+']);
        near(bins[0].probability, 0.3);
        near(bins[1].probability, 0.6);
    }
    near(getElectionOutcomes(events).onSchedule.probability, 0.89);
    const government = getGovernmentOutcomes(events);
    near(government.novemberDecember2026.probability, 0.4);
    near(government.januaryFebruary2027.probability, 0.4);
    near(government.marchJune2027.probability, 0.05);
    near(government.anotherElection.probability, 0.15);
    near(getBlocOutcomes(events).majority.probability, 0.5);
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

test('estimated seat brackets add their underlying midpoint probabilities without normalization', () => {
    const events = snapshot();
    const party = PARTY_MARKETS.find(party => party.estimateSeatsFromVoteShare);
    events.find(event => event.slug === party.slug).markets = [
        market({ groupItemTitle: '<2.75%', bestBid: 0.1, bestAsk: 0.3 }),
        market({ groupItemTitle: '2.75-3.25%', bestBid: 0.2, bestAsk: 0.4 }),
        market({ groupItemTitle: '3.25-3.75%', bestBid: 0.1, bestAsk: 0.5 }),
        market({ groupItemTitle: '3.75%+', bestBid: 0.001, bestAsk: 0.009 }),
    ];
    const bins = getPartyDistributions(events).get(party.slug);
    assert.deepEqual(bins.map(bin => bin.label), ['0', '4', '5+']);
    near(bins[0].probability, 0.5);
    near(bins[1].probability, 0.3);
    near(bins[2].probability, 0.005);
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

function electionProbability(overrides) {
    return getElectionOutcomes([
        event(SCHEDULE_SLUG, [market({ slug: SCHEDULE_SLUG, ...overrides })]),
    ]).onSchedule.probability;
}

test('one-sided books use price bounds, preserving genuine zero and one quotes', () => {
    near(electionProbability({ bestBid: undefined, bestAsk: 0.002 }), 0.001);
    near(electionProbability({ bestBid: null, bestAsk: 0.2 }), 0.1);
    near(electionProbability({ bestBid: 0.8, bestAsk: undefined }), 0.9);
    near(electionProbability({ bestBid: 0.8, bestAsk: null }), 0.9);
    assert.equal(electionProbability({ bestBid: 0, bestAsk: 0 }), 0);
    assert.equal(electionProbability({ bestBid: 1, bestAsk: 1 }), 1);
    assert.equal(electionProbability({ bestBid: 0, bestAsk: 1 }), 0.5);
});

test('numeric string quotes and reversed outcome order retain the quote-to-outcome mapping', () => {
    near(electionProbability({ bestBid: '0.2', bestAsk: '0.8', outcomePrices: undefined }), 0.5);
    near(electionProbability({ outcomes: [' No ', ' YES '], bestBid: '0.1', bestAsk: '0.3' }), 0.8);
});

test('empty books and malformed quotes fail validation instead of falling back to trade prices', () => {
    for (const [bestBid, bestAsk] of [
        [undefined, undefined], [null, null], [false, 0.5], ['', 0.5], [' ', 0.5],
        [[], 0.5], [{}, 0.5], [-0.1, 0.5], [0.1, 1.1], [NaN, 0.5],
        [0.1, Infinity], [0.1, 'invalid'], [0.7, 0.2],
    ]) {
        assert.throws(() => electionProbability({ bestBid, bestAsk }));
    }
    assert.throws(() => electionProbability({ outcomes: ['Yes', 'Maybe'] }));
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
        const odds = getElectionOutcomes([
            event(SCHEDULE_SLUG, [market({ slug: SCHEDULE_SLUG, bestBid: lower, bestAsk: upper })]),
        ]).onSchedule;
        assert.equal(formatProbability(odds), expected);
    }
    assert.equal(isProbabilityRange({ lower: 0.3, upper: 0.349999 }), false);
    const chartPercent = new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 1 });
    assert.equal(formatProbability({ probability: 0.30055, lower: 0.2001, upper: 0.401 }, chartPercent), '30.1% (±10%)');
});

test('reversed outcomes and one-sided books preserve display bounds', () => {
    const odds = overrides => getElectionOutcomes([
        event(SCHEDULE_SLUG, [market({ slug: SCHEDULE_SLUG, ...overrides })]),
    ]).onSchedule;
    const reversed = odds({ outcomes: ['No', 'Yes'], bestBid: 0.1, bestAsk: 0.3 });
    near(reversed.lower, 0.7);
    near(reversed.upper, 0.9);
    assert.equal(formatProbability(reversed), '80% (±10%)');
    assert.equal(formatProbability(odds({ bestBid: null, bestAsk: 0.2 })), '10% (±10%)');
    assert.equal(formatProbability(odds({ bestBid: 0.8, bestAsk: null })), '90% (±10%)');
});

test('all display sections carry the appropriate bid–ask bounds', () => {
    const events = snapshot();
    for (const candidates of getRoleCandidates(events).values()) {
        assert.equal(formatProbability(candidates[0]), '30% (±20%)');
    }
    for (const bins of getPartyDistributions(events).values()) {
        assert.equal(formatProbability(bins[0]), '30% (±20%)');
        assert.equal(formatProbability(bins[1]), '60% (±20%)');
    }
    assert.equal(formatProbability(getElectionOutcomes(events).onSchedule), '89% (±9%)');
    assert.equal(formatProbability(getBlocOutcomes(events).majority), '50% (±30%)');
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

test('merged estimated seat brackets sum display bounds and cap them at 100%', () => {
    const events = snapshot();
    const party = PARTY_MARKETS.find(party => party.estimateSeatsFromVoteShare);
    events.find(event => event.slug === party.slug).markets = [
        market({ groupItemTitle: '<2.75%', bestBid: 0.1, bestAsk: 0.3 }),
        market({ groupItemTitle: '2.75-3.25%', bestBid: 0.2, bestAsk: 0.9 }),
        market({ groupItemTitle: '3.25%+', bestBid: 0.01, bestAsk: 0.03 }),
    ];
    const bins = getPartyDistributions(events).get(party.slug);
    assert.equal(formatProbability(bins[0]), '65% (±35%)');
    near(bins[0].probability, 0.75);
    assert.equal(formatProbability(bins[1]), '2%');
});
