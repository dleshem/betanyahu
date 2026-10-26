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

Every market's probability uses the bid–ask midpoint, calculated directly as
`(bestBid + bestAsk) / 2` from the Gamma event response. When the bid–ask spread is
**5 percentage points or more**, the page displays the bid–ask range instead of
the midpoint alone. Ranges emphasize the midpoint with a smaller, muted margin
in parentheses, rounded to the nearest whole percentage point (for example, bids
and asks of `14%` and `30%` display as `22% (±8%)`). Smaller spreads display the midpoint.
The cutoff uses unrounded quotes and includes exactly 5 percentage points.
This applies to candidate odds, summaries, and party chart labels and details;
bar heights still use midpoints. Quotes apply to the first outcome; the other
outcome uses `1 - midpoint` with range bounds `1 - ask` and `1 - bid`.
The reported `outcomePrices` and last trade price are not used. A missing bid
uses the lower price bound of 0; a missing ask uses the upper bound of 1.
An empty book, invalid quotes, or a bid above the ask fails the refresh and
retains the previous data. All filtering, ranking, aggregation, and period
differences use these unrounded midpoint probabilities.
Merged estimated seat brackets also add their lower and upper bounds, capped
at 100%. Calculated periods use the later deadline's lower bound minus the
earlier deadline's upper bound, and the later upper bound minus the earlier
lower bound, with negative endpoints clamped to zero. These derived bounds
use the same 5-point display cutoff. The displayed midpoint and margin are
calculated from the final bounds before display rounding; their center can differ
from the probability used for bar heights and calculations.

All seven lists are loaded into memory together, so changing roles updates the
📊 source link beside the dropdown and results immediately without fetching.
The section title stays “הממשלה הבאה”. The PM choice reads “ראש הממשלה”; minister choices include
“(עד 28 לפברואר 2027)”. The selection stays in place during refreshes. Minister
lists omit the no-appointment outcome. Every remaining active outcome above 1%
is ranked by its unrounded **Yes** midpoint; the 1% cutoff is applied before display
rounding.

The “מפלגות” section adds a matching party dropdown, with Yashar selected by
default. Each bar represents a full seat-range bracket from the party's market,
ordered by increasing seats from left to right. The height is the **Yes**
midpoint on a shared 0–100% scale. All brackets are shown, including those at or
below 1%. Bar labels round to one decimal place; tapping a bar or selecting it
with the keyboard shows its midpoint or range with up to four decimal places. The 📊
link sits beside the dropdown and follows the selected party. The chart starts
with the histogram, without repeating the party name or source link. Party and role choices are independent and
stay selected through refreshes; switching either uses cached data.

“המילואימניקים–הכלכלית החדשה” appears immediately before “עמך ישראל” and uses
estimated seat brackets derived from
[its vote-share market](https://polymarket.com/event/israel-election-reservistsnew-economic-party-vote-share).
It uses the same seat axis and chart styling as the other parties. Vote shares
below the 3.25% electoral threshold map to zero seats; qualifying shares are
multiplied by 120 / 100 and rounded to the nearest seat. Upper bracket boundaries
are excluded. Overlapping estimated seat brackets are merged and their **Yes**
midpoints added, without renormalizing or splitting probabilities within a bracket.
For the current market this produces 0, 4, and 5+ seat brackets. Bar details mark
the result as an estimate. The approximation ignores discarded votes and surplus
vote agreements; the 📊 link continues to open the underlying vote-share market.

The original twelve parties retain their fixed order based on approximate expected
seats from the 2026-10-19 14:27:24 UTC market snapshot:

| Party | Approximate seats used for ordering | Polymarket event |
| --- | --- | --- |
| ישר! | 23.75 | [Yashar](https://polymarket.com/event/israel-election-yashar-of-seats) |
| הליכוד | 22.51 | [Likud](https://polymarket.com/event/israel-election-likud-of-seats) |
| ביחד | 13.69 | [Together](https://polymarket.com/event/israel-election-together-of-seats) |
| הדמוקרטים | 9.66 | [Dems](https://polymarket.com/event/israel-election-dems-of-seats) |
| ישראל ביתנו | 8.45 | [Yisrael Beiteinu](https://polymarket.com/event/israel-election-yisrael-beiteinu-of-seats) |
| הרשימה המשותפת | 8.14 | [Joint List](https://polymarket.com/event/israel-election-joint-list-of-seats) |
| עוצמה יהודית | 7.88 | [Otzma](https://polymarket.com/event/israel-election-otzma-of-seats) |
| ש״ס | 7.86 | [Shas](https://polymarket.com/event/israel-election-shas-of-seats) |
| יהדות התורה | 7.41 | [UTJ](https://polymarket.com/event/israel-election-utj-of-seats) |
| הציונות הדתית–זהות | 5.78 | [RZP-Zehut](https://polymarket.com/event/israel-election-rzp-zehut-of-seats) |
| רע״ם | 5.50 | [Raam](https://polymarket.com/event/israel-election-raam-of-seats) |
| המילואימניקים–הכלכלית החדשה | Requested position; estimated seats | [Reservists–New Economic Party](https://polymarket.com/event/israel-election-reservistsnew-economic-party-vote-share) |
| עמך ישראל | 3.08 | [Amcha Yisrael](https://polymarket.com/event/israel-election-amcha-yisrael-of-seats) |

For this ordering estimate, closed ranges use their midpoints; each open-ended
tail is approximated by a bracket with the neighboring range's width, bounded
to 0–120 seats. Midpoints are weighted by the Yes prices and divided by their
sum. These are approximate ordering values because the markets do not specify
probabilities for individual seats within a bracket. The histogram retains the
unrounded midpoint probabilities. The configured order stays fixed as live prices change.

Just below the update banner, “הבחירות” shows “יערכו במועדן” with the October 27,
2026 date and the **Yes** midpoint from [the election timing market](https://polymarket.com/event/will-israel-election-happen-as-scheduled-20260720204824362).

The next section, “הכרעה”, shows non-cumulative probabilities for each period,
plus the probability of another election. Each row has a 📊 source link:

| Label | Market outcome |
| --- | --- |
| נוב׳–דצמ׳ 2026 | **Yes** from [the confidence vote market](https://polymarket.com/event/vote-of-confidence-passes-in-knesset-by-december-31) |
| ינו׳–פבר׳ 2027 | **No** from the “No Next Minister by Feb 28” outcome in [the defense minister event](https://polymarket.com/event/next-israeli-minister-of-defense), minus the confidence vote **Yes** price |
| מרץ–יוני 2027 | **No** from [the hung parliament market](https://polymarket.com/event/israeli-election-results-in-a-hung-parliament), minus the defense market's “No Next Minister by Feb 28” **No** price |
| בחירות חוזרות | **Yes** from [the hung parliament market](https://polymarket.com/event/israeli-election-results-in-a-hung-parliament) |

Period differences use the midpoint probabilities before display rounding. Since these
deadlines are priced in separate markets, any negative difference is displayed as
zero; the four values are not renormalized. For example, cumulative deadline odds
of 48%, 59.1%, and 62% with a 38% repeat-election price display as 48%, 11.1%, 2.9%,
and 38%.
The February deadline value is read directly by market slug from the already-fetched
defense event, independently of the role list's 1% cutoff.

The final section, “גושים”, shows “רוב לאחד הגושים” with the **Yes** midpoint from
[the bloc majority market](https://polymarket.com/event/israel-election-any-coalition-wins-a-majority).
Its description defines a majority as at least 61 seats for either of the market's
two groups: The Democrats, Yashar, Together, and Yisrael Beiteinu; or Likud,
Otzma Yehudit, RZP-Zehut, Amcha Yisrael, United Torah Judaism, and Shas.

The browser fetches all 24 events in a single HTTP request to the
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
The dropdowns retain accessible names without visible labels. Long role choices
and party names wrap within the native select controls. The footer credits Danny Leshem, links his
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
