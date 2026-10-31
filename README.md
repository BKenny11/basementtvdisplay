# Basement TV

The bar menu display for the basement TV. It's a static site with no build step, hosted on GitHub Pages and opened in the Silk browser on a Fire TV Stick.

The menu itself lives in a Google Sheet: **[Basement Bar Menu](https://docs.google.com/spreadsheets/d/1MRG1xUpZEYDi8NpmIcatDR8UpHEttfFGdvJxjh2BX7E/edit)**. Edit the sheet from your phone or computer, and the TV picks up the change within about a minute. You don't need to touch GitHub to change the menu.

- `index.html`, `style.css`, `app.js`: the display. The sheet ID is set at the top of `app.js`.
- `scores.js`: live scores, team news and score celebrations, from ESPN's public scoreboard and news feeds.
- `teams/`: a team directory per league, used to match the names on the Teams tab to ESPN teams. `tools/update-teams.sh` rebuilds it.

## The menu sheet

The sheet must be shared as **Anyone with the link → Viewer** (Share button → General access). The TV reads it without signing in, so a private sheet shows "Can't reach the Google Sheet."

| Tab | Columns | Notes |
|---|---|---|
| **Taps** | Beer, Brewery, Style, ABV %, Price, Kicked | One row per tap, top to bottom. Tap numbers follow the row order. Tick **Kicked** to cross a beer out. Rows with no Beer are skipped. |
| **Menu** | Section, Item, Price, Description, Hide | Rows with the same Section are grouped together, in the order each section first appears. Tick **Hide** to keep an item off the TV without deleting it. |
| **Teams** | League, Team, Celebrate | The teams to follow in the scores ticker and on the scoreboard. Pick the league from the dropdown and type the team however you like: *Bills*, *BUF*, *Buffalo Bills*, or *Buffalo*. **Celebrate** is ticked by default; untick it to follow a team without the animations. |
| **Settings** | Setting, Value | **Bar name**, **Tagline**, and **Screen**, which can be *Menu*, *Menu + scores ticker*, or *Scoreboard*. |

Tips:
- Keep the tab names and header names as they are. You can reorder the columns, though.
- The text columns are set to Plain text so values like `5.1` and `$6` show on the TV exactly as you type them. If you add a column, set it to Format → Number → Plain text too.
- The checkboxes cover the first 40 tap rows, 60 menu rows and 29 team rows. Typing `TRUE` or `yes` in those columns works too.

## Live scores

Set **Screen** to *Menu + scores ticker* or *Scoreboard*, and list your teams on the **Teams** tab. The ticker is styled as a bar LED sign: amber dot-matrix text, your teams in green, live status in red, pixel-art logos, and a scroll that steps one LED column at a time (speed and step size are `TICKER_PX_PER_S` and `TICKER_STEP_PX` at the top of `scores.js`). Leagues: NFL, NBA, WNBA, MLB, NHL, College Football, College Basketball, MLS and Premier League.

- **While one of your teams is playing,** the ticker label turns red (**Live**) and the ticker shows only scores, checked every **30 seconds**. Scores update in place without restarting the scroll.
- **When none of your teams is playing,** it checks every **60 seconds** and shows today's games and finals, each team's next game, and recent headlines about your teams (refreshed every 10 minutes, up to 3 per team from the last 4 days).
- **Scoreboard** (the default screen) fills the main area with your teams' games, live first, then their next games, then other big games, with the LED ticker underneath. Up to six large cards, or up to twelve in a 4x3 grid on busier days. *Menu + scores ticker* and *Menu* bring the drinks menu back.
- **Other big games** ride along after your teams, on the ticker and in any spare scoreboard cards, but never trigger celebrations, and they don't turn the label red. In the leagues you follow, that's any playoff game (with the round and series, e.g. *World Series - Game 5 · MIL leads series 3-1*) and any college game with a Top 25 team (shown with its rank). The ticker shows at most 12 of them, live first, then the highest-ranked. Upcoming ones appear within 24 hours of the start, and finals stay for 12 hours.
- **News** is capped at 2 headlines per team and 10 in all, newest first. Video highlight clips are left out.

**Celebrations.** When a team with Celebrate ticked scores, the screen fills with the team's colors and logo, a big title, the score, the play (for football) and confetti, for about 9 seconds:

| Sport | What triggers it |
|---|---|
| Football | Touchdown (6+), field goal (3), safety (2). The extra point or 2-point try right after a touchdown doesn't trigger a second one. |
| Hockey, soccer | Goal |
| Baseball | Run scores |
| Basketball | Only the win, since a basket every few seconds would never stop |
| All | A win, when your team's game goes final with them ahead |

Scores already on the board when the page loads don't celebrate, so reloading mid-game won't replay old touchdowns. Because scores are checked every 30 seconds, a celebration shows up to about 30 seconds after the play, often ahead of a streamed broadcast.

Press **Fast-Forward** on the remote to play a sample celebration.

## How the TV stays current

- It checks the sheet every 60 seconds and redraws when something changed.
- It keeps the last menu it loaded, so if the Wi-Fi or Google is down, the TV keeps showing that menu instead of going blank.
- It fully reloads every 6 hours to pick up code changes pushed to GitHub.

## Publish to GitHub Pages

1. Push this repo to GitHub.
2. Go to repo **Settings → Pages** and set **Source** to *Deploy from a branch*, `main`, `/ (root)`.
3. The site is live at `https://bkenny11.github.io/basementtvdisplay/`.

## Fire TV setup

1. Open **Silk Browser**, go to `https://bkenny11.github.io/basementtvdisplay/` and bookmark it.
2. Press **Select/OK** on the remote to go fullscreen.
3. To keep the screensaver from covering the menu, go to **Settings → Display & Sounds → Screensaver → Start Time → Never**.

Remote shortcuts on the display:
- **Select / OK**: toggle fullscreen
- **Play / Pause**: re-check the sheet and scores now
- **Fast-Forward**: play a sample score celebration
- **Up / Down**: shrink or grow the edge margin, so your TV doesn't crop the edges of the picture. A dashed gold outline shows the edge while you adjust. The setting is saved on the FireStick. It starts at 5%; you can also set it in the address, e.g. `…/basementtvdisplay/?inset=4`.

On a phone or tablet, an **Edit menu** button in the corner opens the sheet.

## Running locally

```bash
python3 -m http.server 8737
```

Then open http://localhost:8737.
