export const API_URL = 'https://gamma-api.polymarket.com/events/slug/who-will-be-the-next-prime-minister-of-israel-after-the-next-election';

function asArray(value) {
    const result = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(result)) throw new Error('Expected an array');
    return result;
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

export function getCandidates(event) {
    if (!event || !Array.isArray(event.markets) || !event.markets.length) {
        throw new Error('Event has no markets');
    }
    if (event.closed || event.active === false) throw new Error('Event is no longer active');

    const candidates = [];
    for (const market of event.markets) {
        if (!market || typeof market !== 'object') throw new Error('Invalid market');
        if (market.closed || market.archived || market.active === false) continue;

        const outcomes = asArray(market.outcomes).map(outcome => String(outcome).trim().toLowerCase());
        const prices = asArray(market.outcomePrices);
        const yesIndex = outcomes.indexOf('yes');
        if (outcomes.length !== 2 || !outcomes.includes('no') || yesIndex < 0 || prices.length !== outcomes.length) {
            throw new Error('Expected matching Yes/No outcomes and prices');
        }
        const price = prices[yesIndex];
        if ((typeof price !== 'number' && typeof price !== 'string') || String(price).trim() === '') {
            throw new Error('Missing Yes price');
        }
        const probability = Number(price);
        if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
            throw new Error('Invalid Yes price');
        }
        // Apply the threshold to the original probability, before formatting.
        if (probability <= 0.01) continue;

        let name = market.groupItemTitle;
        if (typeof name !== 'string' || !name.trim()) {
            name = typeof market.question === 'string'
                ? market.question.match(/^Will (.+?) (?:be|become) (?:the )?next prime minister/i)?.[1]
                : undefined;
        }
        if (!name) throw new Error('Missing candidate name');
        const image = getImage(market);
        candidates.push({ name: name.trim(), probability, ...(image ? { image } : {}) });
    }
    // These are independent market prices; do not renormalize them to 100%.
    return candidates.sort((a, b) => b.probability - a.probability || a.name.localeCompare(b.name));
}
