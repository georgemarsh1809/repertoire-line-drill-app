# Repertoire Line Drill

A small static web app for drilling a chess opening repertoire over the board.

Whoever sits at the screen plays the opponent: the screen shows each opponent move as an arrow, they make it on the real board, and you answer from memory. Load a Lichess study (all chapters in one PGN) and the app walks through every line of every chapter, tracks your progress for the session, and lets you jump to any chapter or line.

Everything runs in the browser. There is no backend and no database; the only outside request is the optional import from Lichess. Saved studies are kept in the browser's `localStorage`; session progress lives in memory and resets on reload.

## Run locally

```sh
npm start            # serves http://localhost:8080 (needs python3)
# or just open index.html in a browser
```

## Use it

1. Open **Studies and options**, then **Add or update a study**.
2. Paste a Lichess study link (for example `https://lichess.org/study/xxxxxxxx`) and press **Import**. Every chapter comes in at once, and the study is saved under its Lichess name.
3. Tick the chapters you want and press **Start**.
4. After you edit the study on Lichess, choose the study in the dropdown and press **Update from Lichess**. Your session progress carries over for lines that haven't changed.

Import uses the Lichess API (`GET /api/study/{id}.pgn`) straight from the browser. It works for public and unlisted studies. For a private study, create a [personal access token](https://lichess.org/account/oauth/token) with the `study:read` permission and paste it under **Private study?**. The token is stored only in your browser's `localStorage`, so use a token with just that permission.

If import fails (offline, or a browser or network that blocks it), open the study on Lichess, choose **Share & export**, then **Study PGN**, and paste the PGN into the box instead.

`examples/` has starter PGNs you can load to try it.

Which side you play comes from each chapter's `[Orientation "white"|"black"]` tag, which Lichess exports include.

## Tests

```sh
npm install
npm test
```

The tests cover the PGN parser and the step that turns a study's variation tree into individual lines (`walker.js`).

## Deploy to Netlify

The site is static, so there is no build command.

- **From git:** push this repo, then in Netlify choose *Add new site*, *Import an existing project*, pick the repo. Leave the build command empty and set the publish directory to `.` (already set in `netlify.toml`).
- **Drag and drop:** drag the project folder onto the Netlify sites page.

Saved studies live in each browser's `localStorage`, so they stay on the device and browser where you saved them. The deployed site only serves the app. Anyone who opens the URL starts with no studies, and nothing you save is uploaded.

## Layout

| File | What it is |
| --- | --- |
| `index.html` | The app: markup, styles and UI logic |
| `walker.js` | PGN parser and line flattening, also used by the tests |
| `vendor/chess.js` | chess.js 0.10.3 (BSD-2-Clause), used for move legality and SAN |
| `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` | Icons |
| `examples/` | Starter repertoire PGNs |
| `tests/` | Node tests for `walker.js` |

## Credits and licences

- Piece artwork is the "cburnett" set by Colin M.L. Burnett (the Lichess default), used under GPL v2+ / CC BY-SA 3.0 and embedded in `index.html`. If you publish the repo, keep that credit.
- `vendor/chess.js` is [chess.js](https://github.com/jhlywa/chess.js) by Jeff Hlywa, BSD-2-Clause.
- Fonts (IBM Plex) load from Google Fonts. The app falls back to system fonts if they are unavailable.
