# betanyahu

A Hebrew, static election-odds page for betanyahu.com. A native dropdown lets
visitors choose one role market at a time, with prime minister selected by
default:

| Role | Polymarket event |
| --- | --- |
| ראש הממשלה | [Next PM](https://polymarket.com/event/who-will-be-the-next-prime-minister-of-israel-after-the-next-election) |
| שר הביטחון | [Defense](https://polymarket.com/event/next-israeli-minister-of-defense) |
| שר החוץ | [Foreign affairs](https://polymarket.com/event/next-israeli-minister-of-foreign-affairs) |
| שר האוצר | [Finance](https://polymarket.com/event/next-israeli-minister-of-finance) |
| שר המשפטים | [Justice](https://polymarket.com/event/next-israeli-minister-of-justice) |
| השר לביטחון לאומי | [National security](https://polymarket.com/event/next-israeli-minister-of-national-security) |
| שר הפנים | [Interior](https://polymarket.com/event/next-israeli-minister-of-interior) |
| יו״ר הכנסת | [Knesset speaker](https://polymarket.com/event/who-will-be-the-next-speaker-of-the-knesset-20261019103128390) |

Every market's probability uses the bid–ask midpoint, calculated directly as
`(bestBid + bestAsk) / 2` from the Gamma event response. When the bid–ask spread is
**5 percentage points or more**, the page displays the bid–ask range instead of
the midpoint alone. Ranges emphasize the midpoint with a smaller, muted margin
in parentheses, rounded to the nearest whole percentage point (for example, bids
and asks of `14%` and `30%` display as `22% (±8%)`). Smaller spreads display the midpoint.
The cutoff uses unrounded quotes and includes exactly 5 percentage points.
This applies to candidate odds, government periods, and coalition odds. Quotes
apply to the first outcome; the other outcome uses `1 - midpoint` with range bounds `1 - ask` and `1 - bid`.
The reported `outcomePrices` and last trade price are not used. A missing bid
uses the lower price bound of 0; a missing ask uses the upper bound of 1.
An empty book, invalid quotes, or a bid above the ask fails the refresh and
retains the previous data. All filtering, ranking, and period differences use
these unrounded midpoint probabilities. Calculated periods use the later deadline's lower bound minus the
earlier deadline's upper bound, and the later upper bound minus the earlier
lower bound, with negative endpoints clamped to zero. These derived bounds
use the same 5-point display cutoff. The displayed midpoint and margin are
calculated from the final bounds before display rounding; their center can differ
from the probability used for ranking and calculations.

All eight lists are loaded into memory together, so changing roles updates the
📊 source link beside the dropdown and results immediately without fetching.
The section title stays “הממשלה הבאה”. The PM choice reads “ראש הממשלה”; minister and speaker choices include
“(עד 28 לפברואר 2027)”. The selection stays in place during refreshes. Minister
lists omit the no-appointment outcome; the speaker list omits “No speaker by Feb 28”.
Every remaining active outcome above 1%
is ranked by its unrounded **Yes** midpoint; the 1% cutoff is applied before display
rounding.

The first section, “ממשלה חדשה”, shows non-cumulative probabilities from
[the next government formed market](https://polymarket.com/event/next-israeli-government-formed-by).
The 📊 source link beside the section title opens the market:

| Label | Calculation using cumulative **Yes** odds |
| --- | --- |
| נובמבר 2026 | By November 30, 2026 |
| דצמבר 2026 | By December 31, 2026, minus by November 30, 2026 |
| ינו׳–פבר׳ 2027 | By February 28, 2027, minus by December 31, 2026 |
| מרץ–יוני 2027 | By June 30, 2027, minus by February 28, 2027 |

Period differences use unrounded midpoint probabilities and combine quote bounds.
Negative differences and bounds are clamped to zero; values are not renormalized.
For example, cumulative odds of 18%, 45%, 69%, and 82% produce period odds of
18%, 27%, 24%, and 13%. All four deadlines must validate before any section updates.

Immediately after “ממשלה חדשה”, “פיזור הכנסת” shows non-cumulative probabilities from
[the next election called market](https://polymarket.com/event/next-israeli-election-called-by).
The trigger is the formal dissolution of the Knesset or official scheduling of a
snap election. The 📊 source link beside the section title opens the market;
rows use abbreviated months:

| Label | Calculation using cumulative **Yes** odds |
| --- | --- |
| אוק׳–דצמ׳ 2026 | By December 31, 2026 |
| ינו׳–מרץ 2027 | By March 31, 2027, minus by December 31, 2026 |
| אפר׳–דצמ׳ 2027 | By December 31, 2027, minus by March 31, 2027 |

The first period starts at market creation on October 30, 2026. Later periods
subtract the previous deadline's unrounded midpoint and combine quote bounds in
the same way as “ממשלה חדשה”. Negative differences and bounds are clamped to zero;
the three values are not renormalized. All three deadlines must validate before
any section updates.

After “פיזור הכנסת”, “קואליציה” lists the active outcomes from
[the next government coalition market](https://polymarket.com/event/next-israeli-government-coalition).
Its short description explains that the first government must be approved by the
current, 26th Knesset, without another election. Party codes expand to Hebrew
names; “Other” is shown as “הרכב אחר”. “No government formed” is excluded by both
its market slug and its label, before quote validation. All remaining active
outcomes are shown, including those at or below 1%, ordered by their unrounded
**Yes** midpoints. The probabilities are not renormalized after excluding an
outcome. The 📊 link beside the heading opens the coalition market.

The browser fetches all 11 events in a single HTTP request to the
[Gamma `/events` endpoint](https://gamma-api.polymarket.com/events) with repeated
`slug` query parameters and `limit=50`, on page load, every minute, and when the page becomes
visible again. Events are matched by slug, regardless of response order.
The Hebrew status card links to Polymarket, shows the last successful pull time in
the visitor's local time (today, yesterday, or a full date), and counts down to the
next pull. “עדכון עכשיו” fetches immediately and restarts the one-minute countdown
after the request finishes. Concurrent requests are prevented, and failed pulls
retain the previous data and timestamp with a visible error message. All events
must load and validate before any section updates, keeping the shared timestamp
accurate.

Under “הממשלה הבאה”, the page displays candidate
portraits, names, and percentages. Portraits use
each market's `image` URL, falling back to its `icon` URL. Known candidate names
are displayed in Hebrew; new names from the event are still included. There is no
server-side fetch, generated data file, or deployment schedule.

The page automatically follows the device's light or dark color-scheme preference.
The role dropdown retains an accessible name without a visible label. Long role
choices wrap within the native select control, and coalition names wrap within
their rows. The footer credits Danny Leshem, links his
name to https://dannyleshem.com, and links “github” to the source repository.

## Local development

No packages or build step are required. Serve `docs/` over HTTP:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory docs
```

The browser needs HTTPS access to `gamma-api.polymarket.com` and the API must allow
cross-origin requests from the site. Portraits load directly from the image hosts
in the API response. No API key is required. Loading uses a spinner; failed
requests can be retried with the refresh button. Missing or
failed portraits leave a neutral placeholder without hiding the candidate.

Deploy `docs/` through the existing GitHub Pages setup. All candidate data is loaded
at runtime.

Run the probability regression tests with `node --test`.
