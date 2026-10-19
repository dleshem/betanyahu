export const CANDIDATES_SLUG = 'who-will-be-the-next-prime-minister-of-israel-after-the-next-election';
export const DEFENSE_SLUG = 'next-israeli-minister-of-defense';
export const DEFENSE_NO_APPOINTMENT_SLUG = 'will-no-next-israeli-minister-of-defense-be-appointed-by-february-28-2027';
const MINISTER_DEADLINE = ' (עד 28 לפברואר 2027)';
export const ROLE_MARKETS = [
    { slug: CANDIDATES_SLUG, label: 'ראש הממשלה' },
    { slug: DEFENSE_SLUG, label: `שר הביטחון${MINISTER_DEADLINE}` },
    { slug: 'next-israeli-minister-of-foreign-affairs', label: `שר החוץ${MINISTER_DEADLINE}` },
    { slug: 'next-israeli-minister-of-finance', label: `שר האוצר${MINISTER_DEADLINE}` },
    { slug: 'next-israeli-minister-of-justice', label: `שר המשפטים${MINISTER_DEADLINE}` },
    { slug: 'next-israeli-minister-of-national-security', label: `השר לביטחון לאומי${MINISTER_DEADLINE}` },
    { slug: 'next-israeli-minister-of-interior', label: `שר הפנים${MINISTER_DEADLINE}` },
];
// The original party order follows expected seats from the 2026-10-19 snapshot.
// The midpoint/tail assumptions and snapshot values are documented in README.md.
export const PARTY_MARKETS = [
    { slug: 'israel-election-yashar-of-seats', label: 'ישר!' },
    { slug: 'israel-election-likud-of-seats', label: 'הליכוד' },
    { slug: 'israel-election-together-of-seats', label: 'ביחד' },
    { slug: 'israel-election-dems-of-seats', label: 'הדמוקרטים' },
    { slug: 'israel-election-yisrael-beiteinu-of-seats', label: 'ישראל ביתנו' },
    { slug: 'israel-election-joint-list-of-seats', label: 'הרשימה המשותפת' },
    { slug: 'israel-election-otzma-of-seats', label: 'עוצמה יהודית' },
    { slug: 'israel-election-shas-of-seats', label: 'ש״ס' },
    { slug: 'israel-election-utj-of-seats', label: 'יהדות התורה' },
    { slug: 'israel-election-rzp-zehut-of-seats', label: 'הציונות הדתית–זהות' },
    { slug: 'israel-election-raam-of-seats', label: 'רע״ם' },
    // Keep this estimated seat market immediately before Amcha Yisrael.
    { slug: 'israel-election-reservistsnew-economic-party-vote-share', label: 'המילואימניקים–הכלכלית החדשה', estimateSeatsFromVoteShare: true },
    { slug: 'israel-election-amcha-yisrael-of-seats', label: 'עמך ישראל' },
];
export const DEFAULT_PARTY_SLUG = 'israel-election-yashar-of-seats';
export const SCHEDULE_SLUG = 'will-israel-election-happen-as-scheduled-20260720204824362';
export const CONFIDENCE_SLUG = 'vote-of-confidence-passes-in-knesset-by-december-31';
export const HUNG_PARLIAMENT_SLUG = 'israeli-election-results-in-a-hung-parliament';
export const API_URL = `https://gamma-api.polymarket.com/events?${new URLSearchParams([
    ['limit', '50'],
    ...[
        ...ROLE_MARKETS.map(role => role.slug), ...PARTY_MARKETS.map(party => party.slug),
        SCHEDULE_SLUG, CONFIDENCE_SLUG, HUNG_PARLIAMENT_SLUG,
    ].map(slug => ['slug', slug]),
])}`;

function asArray(value) {
    const result = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(result)) throw new Error('Expected an array');
    return result;
}

function getBinaryProbabilities(market) {
    const outcomes = asArray(market.outcomes).map(outcome => String(outcome).trim().toLowerCase());
    const prices = asArray(market.outcomePrices);
    if (outcomes.length !== 2 || !outcomes.includes('yes') || !outcomes.includes('no') || prices.length !== outcomes.length) {
        throw new Error('Expected matching Yes/No outcomes and prices');
    }
    const probabilities = {};
    outcomes.forEach((outcome, index) => {
        const price = prices[index];
        if ((typeof price !== 'number' && typeof price !== 'string') || String(price).trim() === '') {
            throw new Error(`Missing ${outcome} price`);
        }
        const probability = Number(price);
        if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
            throw new Error(`Invalid ${outcome} price`);
        }
        probabilities[outcome] = probability;
    });
    return probabilities;
}

function getEventProbabilities(events, slug, marketSlug = slug) {
    const event = events.find(event => event?.slug === slug);
    const market = Array.isArray(event?.markets) ? event.markets.find(market => market?.slug === marketSlug) : undefined;
    if (!market || market.archived || market.active === false) throw new Error(`Market is unavailable: ${marketSlug}`);
    return getBinaryProbabilities(market);
}

export function getElectionOutcomes(events) {
    if (!Array.isArray(events)) throw new Error('Expected an array of events');
    const schedule = getEventProbabilities(events, SCHEDULE_SLUG);
    return { onSchedule: schedule.yes };
}

export function getGovernmentOutcomes(events) {
    if (!Array.isArray(events)) throw new Error('Expected an array of events');
    const confidence = getEventProbabilities(events, CONFIDENCE_SLUG);
    const noDefenseAppointment = getEventProbabilities(events, DEFENSE_SLUG, DEFENSE_NO_APPOINTMENT_SLUG);
    const hungParliament = getEventProbabilities(events, HUNG_PARLIAMENT_SLUG);
    return {
        novemberDecember2026: confidence.yes,
        // Independently priced deadlines can disagree; a period cannot have negative odds.
        januaryFebruary2027: Math.max(0, noDefenseAppointment.no - confidence.yes),
        marchJune2027: Math.max(0, hungParliament.no - noDefenseAppointment.no),
        anotherElection: hungParliament.yes,
    };
}

function getImage(market) {
    for (const value of [market.image, market.icon]) {
        if (typeof value !== 'string') continue;
        try {
            const url = new URL(value);
            if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
        } catch {
            // A missing or malformed image should not hide a candidate's odds.
        }
    }
}

export function getCandidates(event, { omitNoAppointment = false } = {}) {
    if (!event || !Array.isArray(event.markets) || !event.markets.length) {
        throw new Error('Event has no markets');
    }
    if (event.closed || event.active === false) throw new Error('Event is no longer active');

    const candidates = [];
    for (const market of event.markets) {
        if (!market || typeof market !== 'object') throw new Error('Invalid market');
        if (market.closed || market.archived || market.active === false) continue;
        if (omitNoAppointment && (
            /^will-no-next-israeli-minister-/i.test(market.slug || '') ||
            /^no (?:next minister|one)\b/i.test(String(market.groupItemTitle || '').trim())
        )) continue;

        const { yes: probability } = getBinaryProbabilities(market);
        // Apply the threshold to the original probability, before formatting.
        if (probability <= 0.01) continue;

        let name = market.groupItemTitle;
        if (typeof name !== 'string' || !name.trim()) {
            name = typeof market.question === 'string'
                ? market.question.match(/^Will (.+?) (?:be|become) (?:the )?next (?:prime minister|Israeli Minister of [^?]+)/i)?.[1]
                : undefined;
        }
        if (!name) throw new Error('Missing candidate name');
        const image = getImage(market);
        candidates.push({ name: name.trim(), probability, ...(image ? { image } : {}) });
    }
    // These are independent market prices; do not renormalize them to 100%.
    return candidates.sort((a, b) => b.probability - a.probability || a.name.localeCompare(b.name));
}

export function getRoleCandidates(events) {
    if (!Array.isArray(events)) throw new Error('Expected an array of events');
    return new Map(ROLE_MARKETS.map(role => [
        role.slug,
        getCandidates(events.find(event => event?.slug === role.slug), {
            omitNoAppointment: role.slug !== CANDIDATES_SLUG,
        }),
    ]));
}

function getSeatRange(value) {
    if (typeof value !== 'string') throw new Error('Missing seat range');
    const label = value.trim();
    let min, max;
    let match;
    if ((match = label.match(/^<(\d+)$/))) {
        min = 0;
        max = Number(match[1]) - 1;
    } else if ((match = label.match(/^(\d+)[-–](\d+)$/))) {
        min = Number(match[1]);
        max = Number(match[2]);
    } else if ((match = label.match(/^(\d+)\+$/))) {
        min = Number(match[1]);
        max = 120;
    } else if ((match = label.match(/^(\d+)$/))) {
        min = max = Number(match[1]);
    } else {
        throw new Error('Invalid seat range');
    }
    if (min < 0 || max > 120 || min > max) throw new Error('Seat range is out of bounds');
    return { label: label.replace('-', '–'), min, max };
}

function getVoteShareRange(value) {
    if (typeof value !== 'string') throw new Error('Missing vote-share range');
    const label = value.trim();
    let min, max;
    let match;
    if ((match = label.match(/^<(\d+(?:\.\d+)?)%$/))) {
        min = 0;
        max = Number(match[1]);
    } else if ((match = label.match(/^(\d+(?:\.\d+)?)[-–](\d+(?:\.\d+)?)%$/))) {
        min = Number(match[1]);
        max = Number(match[2]);
    } else if ((match = label.match(/^(\d+(?:\.\d+)?)%\+$/))) {
        min = Number(match[1]);
        max = 100;
    } else {
        throw new Error('Invalid vote-share range');
    }
    if (min < 0 || max > 100 || min >= max) throw new Error('Vote-share range is out of bounds');
    return { label: label.replace('-', '–'), min, max };
}

function getBins(event, parseRange, continuousRanges = false) {
    if (!event || !Array.isArray(event.markets) || !event.markets.length) throw new Error('Event has no party markets');
    if (event.closed || event.active === false) throw new Error('Party event is no longer active');
    const bins = [];
    for (const market of event.markets) {
        if (!market || typeof market !== 'object') throw new Error('Invalid party market');
        if (market.closed || market.archived || market.active === false) continue;
        const range = parseRange(market.groupItemTitle);
        const { yes: probability } = getBinaryProbabilities(market);
        // Keep every bracket, including probabilities at or below 1%.
        bins.push({ ...range, probability });
    }
    if (!bins.length) throw new Error('No active party markets');
    bins.sort((a, b) => a.min - b.min || a.max - b.max);
    // Vote-share brackets share boundaries; the boundary belongs to the higher bracket.
    if (bins.some((bin, index) => index > 0 && (
        continuousRanges ? bin.min < bins[index - 1].max : bin.min <= bins[index - 1].max
    ))) {
        throw new Error('Party ranges overlap');
    }
    return bins;
}

export function getSeatBins(event) {
    return getBins(event, getSeatRange);
}

function getEstimatedSeatBins(event) {
    const threshold = 3.25;
    const seatsPerPercent = 120 / 100;
    const estimates = [];
    for (const bin of getBins(event, getVoteShareRange, true)) {
        const min = bin.min < threshold ? 0 : Math.round(bin.min * seatsPerPercent);
        // The upper vote boundary is excluded, so a rounding boundary belongs to the next bin.
        const max = bin.max <= threshold ? 0 : Math.ceil(bin.max * seatsPerPercent - 0.5);
        const previous = estimates.at(-1);
        if (previous && min <= previous.max) {
            // Merge overlapping estimates without inventing probabilities within a vote bracket.
            previous.max = Math.max(previous.max, max);
            previous.probability += bin.probability;
        } else {
            estimates.push({ min, max, probability: bin.probability });
        }
    }
    return estimates.map(bin => ({
        ...bin,
        label: bin.min === bin.max ? String(bin.min)
            : bin.max === 120 ? `${bin.min}+` : `${bin.min}–${bin.max}`,
    }));
}

export function getPartyDistributions(events) {
    if (!Array.isArray(events)) throw new Error('Expected an array of events');
    return new Map(PARTY_MARKETS.map(party => [
        party.slug,
        (party.estimateSeatsFromVoteShare ? getEstimatedSeatBins : getSeatBins)(
            events.find(event => event?.slug === party.slug)),
    ]));
}
