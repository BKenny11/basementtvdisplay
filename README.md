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
| **Taps** | Beer, Brewery, Style, ABV %, Price, Kicked, Flavors, Hide | One row per beer or seltzer, top to bottom; numbers follow the row order. Tick **Kicked** to cross one out, or **Hide** to keep it off the TV without deleting it. **Flavors** (comma-separated, e.g. *Black Cherry, Natural Lime*) show as colored chips. Rows with no Beer are skipped. |
| **Menu** | Section, Item, Price, Description, Hide, Ingredients, Glass | Rows with the same Section are grouped together, in the order each section first appears. Tick **Hide** to keep an item off the TV without deleting it. A section whose items have **Ingredients** (comma-separated) shows as cocktail cards: name, Description as the tagline, the ingredient list, and a glass illustration. **Glass** picks it: *Coupe, Martini, Rocks, Highball, Copper mug, Wine, Flute, Margarita, Hot mug* or *Shot*; blank or *Auto* chooses from the drink (a Mule gets the copper mug, a Spritz the wine glass, a whiskey ginger a highball). The drink inside is tinted from the ingredients. |
| **Teams** | League, Team, Celebrate | The teams to follow in the scores ticker and on the scoreboard. Pick the league from the dropdown and type the team however you like: *Bills*, *BUF*, *Buffalo Bills*, or *Buffalo*. **Celebrate** is ticked by default; untick it to follow a team without the animations. |
| **Settings** | Setting, Value | **Bar name**, **Tagline**, **Screen** (*Menu*, *Menu + scores ticker* or *Scoreboard*), **Theme** (*Beach* or *Thanksgiving*), **Drinks heading** (the left board title, default *On Tap*), and **Other big games** (*Yes*/*No*: playoff and Top 25 games on the ticker). |

Tips:
- Both menu boards shrink their type automatically when they fill up, so up to six drinks and three cocktails fit without "+ more".
- Keep the tab names and header names as they are. You can reorder the columns, though.
- The text columns are set to Plain text so values like `5.1` and `$6` show on the TV exactly as you type them. If you add a column, set it to Format → Number → Plain text too.
- The checkboxes cover the first 40 tap rows, 60 menu rows and 29 team rows. Typing `TRUE` or `yes` in those columns works too.

## Themes

**Theme** on the Settings tab switches the look; add `?theme=thanksgiving` or `?theme=beach` to the address to preview one without changing the sheet.

- **Beach** (default): sky and surf over sand, green pub chalkboards.
- **Thanksgiving**: an autumn sunset over a harvest table (roast turkey, wine, mashed potatoes, corn, pumpkin pie and a football), fall leaves drifting behind espresso chalkboards, harvest-gold lettering. The artwork is inline SVG in `themes.js`. The LED ticker and score celebrations work the same in both.

## Live scores

Set **Screen** to *Menu + scores ticker* or *Scoreboard*, and list your teams on the **Teams** tab. The ticker is styled as a bar LED sign: amber dot-matrix text, your teams in green, live status in red, pixel-art logos, and a scroll that steps one LED column at a time, 30 steps a second (every 2 frames on a 60Hz screen, so every step is the same length; `TICKER_STEPS_PER_S` and `TICKER_STEP_PX` at the top of `scores.js`). Fire TV sticks automatically get a lighter mode without the glow effects; add `?lite=1` or `?lite=0` to the address to force it on or off. Leagues: NFL, NBA, WNBA, MLB, NHL, College Football, College Basketball, MLS and Premier League.

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

## Security notes

- The repo holds no keys or passwords. The site only *reads* the Google Sheet, through Google's public CSV export; it has no way to write to it.
- Keep the sheet shared as **Anyone with the link → Viewer**. Anyone with the link (it's in this repo) can read the menu and team list, but only the owner can edit. Never switch it to Editor.
- Everything from the sheet and ESPN is escaped before it reaches the page, and a Content-Security-Policy in `index.html` only allows this site's own scripts, data from the sheet and ESPN, and images from ESPN's CDN. If you add a new data or image source, add it to that policy too.

## Running locally

```bash
python3 -m http.server 8737
```

Then open http://localhost:8737.
