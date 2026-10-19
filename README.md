# betanyahu

A Hebrew, static election-odds page for betanyahu.com. It displays every active
candidate above 1% in [this Polymarket event](https://polymarket.com/event/who-will-be-the-next-prime-minister-of-israel-after-the-next-election),
ranked by the price of their **Yes** outcome. Prices are not renormalized; the 1%
cutoff is applied before display rounding.

Just below the update banner, “הבחירות” shows four probabilities, each with a 📊
link to its source market:

| Label | Market outcome |
| --- | --- |
| יערכו במועדן — October 27, 2026 | **Yes** from [the election timing market](https://polymarket.com/event/will-israel-election-happen-as-scheduled-20260720204824362) |
| ממשלה חדשה לפני 2027 | **Yes** from [the confidence vote market](https://polymarket.com/event/vote-of-confidence-passes-in-knesset-by-december-31) |
| ממשלה חדשה ללא בחירות נוספות | **No** from [the hung parliament market](https://polymarket.com/event/israeli-election-results-in-a-hung-parliament) |
| הולכים שוב לבחירות | **Yes** from [the hung parliament market](https://polymarket.com/event/israeli-election-results-in-a-hung-parliament) |

Each price comes directly from the named outcome, without calculating it from
another price or renormalizing the four probabilities.

The browser fetches all four events in a single HTTP request to the
[Gamma `/events` endpoint](https://gamma-api.polymarket.com/events) with repeated
`slug` query parameters, on page load, every minute, and when the page becomes
visible again. Events are matched by slug, regardless of response order.
The Hebrew status card links to Polymarket, shows the last successful pull time in
the visitor's local time (today, yesterday, or a full date), and counts down to the
next pull. “עדכון עכשיו” fetches immediately and restarts the one-minute countdown
after the request finishes. Concurrent requests are prevented, and failed pulls
retain the previous data and timestamp with a visible error message. All events
must load and validate before either section updates, keeping the shared timestamp
accurate.

Under the heading “ראש הממשלה הבא”, the page displays candidate
portraits, names, and percentages. Portraits use
each market's `image` URL, falling back to its `icon` URL. Known candidate names
are displayed in Hebrew; new names from the event are still included. There is no
server-side fetch, generated data file, or deployment schedule.

The page automatically follows the device's light or dark color-scheme preference.

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
