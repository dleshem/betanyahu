# betanyahu

A Hebrew, static election-odds page for betanyahu.com. It displays every active
candidate above 1% in [this Polymarket event](https://polymarket.com/event/who-will-be-the-next-prime-minister-of-israel-after-the-next-election),
ranked by the price of their **Yes** outcome. Prices are not renormalized; the 1%
cutoff is applied before display rounding.

The browser fetches the [Gamma API event](https://gamma-api.polymarket.com/events/slug/who-will-be-the-next-prime-minister-of-israel-after-the-next-election)
directly on page load, every minute, and when the page becomes visible again.
The page displays only candidate portraits, names, and percentages. Portraits use
each market's `image` URL, falling back to its `icon` URL. Known candidate names
are displayed in Hebrew; new names from the event are still included. There is no
server-side fetch, generated data file, or deployment schedule.

## Local development

No packages or build step are required. Serve `docs/` over HTTP:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory docs
```

The browser needs HTTPS access to `gamma-api.polymarket.com` and the API must allow
cross-origin requests from the site. Portraits load directly from the image hosts
in the API response. No API key is required. Loading uses a spinner; failed
requests show a retry icon and retain any previously loaded odds. Missing or
failed portraits leave a neutral placeholder without hiding the candidate.

Deploy `docs/` through the existing GitHub Pages setup. All candidate data is loaded
at runtime.
