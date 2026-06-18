# CFLY Rewards: We In Here Edition

Accessible Cazerny Bussey / CFLY fan reward reel game.

This first version promotes **We In Here** with New York basketball-inspired energy. It is intentionally simple: fans pull the lever, the reels spin, and matching three winning symbols unlocks a reward.

## What is built

- Static web game: `index.html`, `styles.css`, `config.js`, `game.js`
- 7 pulls per day on the same device
- Optional guaranteed fan reward on the last pull, controlled in `config.js`
- Accessible keyboard play
- Screen reader live announcements
- Browser speech fallback
- Optional Cazerny voice clip paths
- Synthesized sound effects when real sound files are not available
- Reward download panel
- Monthly update system through `config.js`
- No external packages or build tools required

## Launch files

Open this file in a browser:

```text
cfly-rewards/index.html
```

If hosted from GitHub Pages, the public path will usually look like:

```text
https://cazernybussey.github.io/seen-through-sound-mvp/cfly-rewards/
```

## Monthly update checklist

Edit `config.js` and change:

1. `brand.editionName`
2. `brand.promoMessage`
3. `storageKey` so a new month starts fresh
4. `reward.title`
5. `reward.url`
6. `reward.filename`
7. `reward.downloadText`
8. `symbols`
9. `audio.voiceClips`
10. `theme`

## Add the real MP3

Place the final reward MP3 here:

```text
assets/rewards/we-in-here.mp3
```

Then update `config.js`:

```js
reward: {
  url: "./assets/rewards/we-in-here.mp3",
  filename: "We-In-Here-Cazerny-Bussey.mp3"
}
```

## Add Cazerny's real voice clips

Recommended voice clips:

```text
assets/audio/voice/welcome.mp3
assets/audio/voice/pull-the-lever.mp3
assets/audio/voice/reels-spinning.mp3
assets/audio/voice/winner.mp3
assets/audio/voice/try-again.mp3
assets/audio/voice/last-pull.mp3
assets/audio/voice/locked-out.mp3
assets/audio/voice/cfly-forever-loves-you.mp3
```

The game already points to those file names. If a clip is missing, the game falls back to browser speech and synthesized effects.

## Accessibility notes

- Main button is keyboard accessible.
- Screen reader announcements are sent to live regions.
- Browser speech can be turned off separately from sound effects.
- Visual motion respects `prefers-reduced-motion`.
- No drag, mouse-only, or visual-only step is required.

## Brand/legal note

This game uses original New York basketball-inspired symbols. It does not use the official Knicks, NBA, or Madison Square Garden marks. Only add official logos if you have written permission.
