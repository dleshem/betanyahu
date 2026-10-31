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
export const CONFIDENCE_SLUG = 'vote-of-confidence-passes-in-knesset-by-december-31';
export const HUNG_PARLIAMENT_SLUG = 'israeli-election-results-in-a-hung-parliament';
export const COALITION_SLUG = 'next-israeli-government-coalition';
export const COALITION_NO_GOVERNMENT_SLUG = 'will-no-israeli-government-be-formed-after-the-2026-knesset-vote';
export const API_URL = `https://gamma-api.polymarket.com/events?${new URLSearchParams([
    ['limit', '50'],
    ...[
        ...ROLE_MARKETS.map(role => role.slug),
        CONFIDENCE_SLUG, HUNG_PARLIAMENT_SLUG, COALITION_SLUG,
    ].map(slug => ['slug', slug]),
])}`;

function asArray(value) {
    const result = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(result)) throw new Error('Expected an array');
    return result;
}

export function isProbabilityRange({ lower, upper }) {
    // Allow for subtraction error at the inclusive five-percentage-point boundary.
    return upper - lower >= 0.05 - Number.EPSILON;
}

const percent = new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 4 });
const marginPercent = new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 0 });

export function getProbabilityDisplay(odds, formatter = percent) {
    if (!isProbabilityRange(odds)) return { value: formatter.format(odds.probability), margin: null };
    // Center on the displayed bounds, which may have been clamped or capped.
    const midpoint = (odds.lower + odds.upper) / 2;
    const margin = (odds.upper - odds.lower) / 2;
    return {
        value: formatter.format(midpoint),
        // Avoid rounding an exact half point down because of subtraction error.
        margin: marginPercent.format(margin + Number.EPSILON),
    };
}

export function formatProbability(odds, formatter = percent) {
    const { value, margin } = getProbabilityDisplay(odds, formatter);
    return margin === null ? value : `${value} (±${margin})`;
}

function getBinaryProbabilities(market) {
    const outcomes = asArray(market.outcomes).map(outcome => String(outcome).trim().toLowerCase());
    if (outcomes.length !== 2 || !outcomes.includes('yes') || !outcomes.includes('no')) {
        throw new Error('Expected Yes/No outcomes');
    }

    if (market.bestBid == null && market.bestAsk == null) throw new Error('Market has no bid or ask');
    const [bid, ask] = [market.bestBid ?? 0, market.bestAsk ?? 1].map(quote => {
        if ((typeof quote !== 'number' && typeof quote !== 'string') || String(quote).trim() === '') {
            throw new Error('Missing market quote');
        }
        const price = Number(quote);
        if (!Number.isFinite(price) || price < 0 || price > 1) throw new Error('Invalid market quote');
        return price;
    });
    if (bid > ask) throw new Error('Market bid exceeds ask');

    // Gamma quotes the first outcome; complement and reverse its bounds for the other.
    const midpoint = (bid + ask) / 2;
    return {
        [outcomes[0]]: { probability: midpoint, lower: bid, upper: ask },
        [outcomes[1]]: { probability: 1 - midpoint, lower: 1 - ask, upper: 1 - bid },
    };
}

function getEventProbabilities(events, slug, marketSlug = slug) {
    const event = events.find(event => event?.slug === slug);
    const market = Array.isArray(event?.markets) ? event.markets.find(market => market?.slug === marketSlug) : undefined;
    if (!market || market.archived || market.active === false) throw new Error(`Market is unavailable: ${marketSlug}`);
    return getBinaryProbabilities(market);
}

export function getGovernmentOutcomes(events) {
    if (!Array.isArray(events)) throw new Error('Expected an array of events');
    const confidence = getEventProbabilities(events, CONFIDENCE_SLUG);
    const noDefenseAppointment = getEventProbabilities(events, DEFENSE_SLUG, DEFENSE_NO_APPOINTMENT_SLUG);
    const hungParliament = getEventProbabilities(events, HUNG_PARLIAMENT_SLUG);
    return {
        novemberDecember2026: confidence.yes,
        januaryFebruary2027: subtractProbabilities(noDefenseAppointment.no, confidence.yes),
        marchJune2027: subtractProbabilities(hungParliament.no, noDefenseAppointment.no),
        anotherElection: hungParliament.yes,
    };
}

function subtractProbabilities(later, earlier) {
    // Independently priced deadlines can disagree; a period cannot have negative odds.
    return {
        probability: Math.max(0, later.probability - earlier.probability),
        lower: Math.max(0, later.lower - earlier.upper),
        upper: Math.max(0, later.upper - earlier.lower),
    };
}

const coalitionParties = new Map(Object.entries({
    L: 'הליכוד',
    Y: 'ישר!',
    T: 'ביחד',
    S: 'ש״ס',
    U: 'יהדות התורה',
    O: 'עוצמה יהודית',
    Z: 'הציונות הדתית–זהות',
    B: 'ישראל ביתנו',
    D: 'הדמוקרטים',
    R: 'רע״ם',
    J: 'הרשימה המשותפת',
}));

export function getCoalitionOutcomes(events) {
    if (!Array.isArray(events)) throw new Error('Expected an array of events');
    const event = events.find(event => event?.slug === COALITION_SLUG);
    if (!event || !Array.isArray(event.markets) || !event.markets.length) {
        throw new Error('Event has no coalition markets');
    }
    if (event.closed || event.active === false) throw new Error('Coalition event is no longer active');

    const coalitions = [];
    for (const market of event.markets) {
        if (!market || typeof market !== 'object') throw new Error('Invalid coalition market');
        if (market.closed || market.archived || market.active === false) continue;
        const title = typeof market.groupItemTitle === 'string' ? market.groupItemTitle.trim() : '';
        if (market.slug === COALITION_NO_GOVERNMENT_SLUG || /^no government formed$/i.test(title)) continue;
        if (!title) throw new Error('Missing coalition name');
        const { yes: odds } = getBinaryProbabilities(market);
        const name = /^other$/i.test(title) ? 'הרכב אחר'
            : title.split(/\s*\+\s*/).map(party => coalitionParties.get(party) || party).join(' + ');
        coalitions.push({ name, ...odds });
    }
    if (!coalitions.length) throw new Error('No active coalition markets');
    // Keep all combinations and their quoted odds; excluding an option does not renormalize them.
    return coalitions.sort((a, b) => b.probability - a.probability || a.name.localeCompare(b.name));
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

        const { yes: odds } = getBinaryProbabilities(market);
        // Apply the threshold to the original probability, before formatting.
        if (odds.probability <= 0.01) continue;

        let name = market.groupItemTitle;
        if (typeof name !== 'string' || !name.trim()) {
            name = typeof market.question === 'string'
                ? market.question.match(/^Will (.+?) (?:be|become) (?:the )?next (?:prime minister|Israeli Minister of [^?]+)/i)?.[1]
                : undefined;
        }
        if (!name) throw new Error('Missing candidate name');
        const image = getImage(market);
        candidates.push({ name: name.trim(), ...odds, ...(image ? { image } : {}) });
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
