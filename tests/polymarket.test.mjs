import assert from 'node:assert/strict';
import test from 'node:test';
import {
    CONFIDENCE_SLUG, DEFENSE_SLUG, DEFENSE_NO_APPOINTMENT_SLUG,
    HUNG_PARLIAMENT_SLUG, getGovernmentOutcomes,
} from '../docs/polymarket.mjs';

function eventsFor({ december = 0.48, february = 0.591, june = 0.62, repeat = 0.38 } = {}) {
    const market = (slug, yes, no) => ({
        slug, outcomes: '["Yes","No"]', outcomePrices: JSON.stringify([yes, no]),
    });
    return [
        { slug: CONFIDENCE_SLUG, markets: [market(CONFIDENCE_SLUG, december, 1 - december)] },
        // Deliberately independent Yes/No quotes: read the named No price directly.
        { slug: DEFENSE_SLUG, markets: [market(DEFENSE_NO_APPOINTMENT_SLUG, 0.2, february)] },
        { slug: HUNG_PARLIAMENT_SLUG, markets: [market(HUNG_PARLIAMENT_SLUG, repeat, june)] },
    ];
}

function assertPeriods(events, expected) {
    const actual = getGovernmentOutcomes(events);
    for (const [key, value] of Object.entries(expected)) {
        assert.ok(Math.abs(actual[key] - value) < 1e-12, `${key}: expected ${value}, got ${actual[key]}`);
    }
}

test('deadline odds of 48%, 59.1%, and 62% become distinct period probabilities', () => {
    assertPeriods(eventsFor(), {
        novemberDecember2026: 0.48, januaryFebruary2027: 0.111,
        marchJune2027: 0.029, anotherElection: 0.38,
    });
});

test('equal deadline odds leave later periods at zero', () => {
    assertPeriods(eventsFor({ february: 0.48, june: 0.48, repeat: 0.52 }), {
        novemberDecember2026: 0.48, januaryFebruary2027: 0,
        marchJune2027: 0, anotherElection: 0.52,
    });
});

test('inconsistent deadline quotes never produce negative probabilities or renormalize prices', () => {
    assertPeriods(eventsFor({ december: 0.6, february: 0.4, june: 0.7, repeat: 0.3 }), {
        novemberDecember2026: 0.6, januaryFebruary2027: 0,
        marchJune2027: 0.3, anotherElection: 0.3,
    });
    assertPeriods(eventsFor({ december: 0.6, february: 0.8, june: 0.7, repeat: 0.3 }), {
        novemberDecember2026: 0.6, januaryFebruary2027: 0.2,
        marchJune2027: 0, anotherElection: 0.3,
    });
});

test('event and Yes/No ordering do not change which prices define the periods', () => {
    const events = eventsFor({ december: 0.31, february: 0.57, june: 0.83, repeat: 0.17 }).reverse();
    for (const event of events) {
        for (const market of event.markets) {
            market.outcomes = JSON.parse(market.outcomes).reverse();
            market.outcomePrices = JSON.parse(market.outcomePrices).reverse();
        }
    }
    assertPeriods(events, {
        novemberDecember2026: 0.31, januaryFebruary2027: 0.26,
        marchJune2027: 0.26, anotherElection: 0.17,
    });
});
