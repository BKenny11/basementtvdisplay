# Basement TV

The bar menu display for the basement TV. It's a static site with no build step, hosted on GitHub Pages and opened in the Silk browser on a Fire TV Stick.

- `index.html`, `style.css`, `app.js`: the display and the editor
- `menu.json`: the taps, menu sections, bar name and screen mode. **This is the only file you change day to day.**

The TV re-reads `menu.json` every 2 minutes and does a full page reload every 6 hours, so you never have to touch the Fire Stick after setup.

## Publish to GitHub Pages

1. Push this repo to GitHub, e.g. `github.com/<you>/BasementTV`.
2. Go to repo **Settings → Pages**, set **Source** to *Deploy from a branch*, branch `main`, folder `/ (root)`, then click Save.
3. After about a minute the site is live at `https://<you>.github.io/BasementTV/`.

## Fire TV setup

1. Install **Amazon Silk Browser** from the Appstore, if it isn't on there already.
2. Open `https://<you>.github.io/BasementTV/` and bookmark it.
3. Press **Select/OK** on the remote to go fullscreen. Silk's own menu also has a fullscreen option.
4. Fire TV's screensaver can still kick in. To keep the menu up, go to **Settings → Display & Sounds → Screensaver → Start Time → Never**.

Remote shortcuts on the display:
- **Select / OK**: toggle fullscreen
- **Play / Pause**: reload `menu.json` now
- **Up / Down**: shrink or grow the edge margin, so your TV doesn't crop the edges of the picture. A dashed gold outline shows the edge while you adjust. The setting is saved on the FireStick. It starts at 5%; you can also set it in the address, e.g. `…/basementtvdisplay/?inset=4`.

## Editing the menu

**From your phone (recommended):** open `https://<you>.github.io/BasementTV/#edit`, or tap the **Edit** pill on a touch screen.

The first time, open *GitHub connection* and paste a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with:
- Repository access: *Only select repositories* → this repo
- Permissions: **Contents → Read and write**

The token is saved only in that phone's browser. After that, make your edits and tap **Publish**. This commits `menu.json`, Pages redeploys (about 1 minute), and the TV picks up the change on its next 2-minute check.

**Without a token:** edit `menu.json` directly on github.com (the pencil icon), or use *Download menu.json instead* in the editor and commit the file.

### Screen modes (`"mode"` in menu.json)
- `menu`: taps plus menu sections
- `ticker`: the menu plus a scores ticker along the bottom (placeholder for now)
- `scores`: full-screen scoreboard (placeholder for now)

## Running locally

```bash
python3 -m http.server 8737
```

Then open http://localhost:8737 (display) or http://localhost:8737/#edit (editor).
