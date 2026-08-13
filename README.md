# Chai aur Sutta

A [Pan Wala](https://pan-wala.vercel.app)-style fullscreen radio page for 90s & 2000s Bollywood — tapri wale gaane, full volume.

**Playlist from Spotify. Audio from YouTube.** Visitors play without logging in — same model as Pan Wala.

## Features

- Loads track list + artwork from **your** Spotify playlist
- Full-track playback via **YouTube** (hidden player behind custom UI)
- No visitor login, no Spotify Premium required for listeners
- Pan Wala–inspired UI: hero background, floating glass player, live clock
- Fully customizable via `config.js`

## Quick start

### 1. Spotify Developer App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app and copy **Client ID** + **Client Secret**
3. Add this **Redirect URI** (one-time token setup only):
   ```
   http://127.0.0.1:8888/callback
   ```

### 2. Spotify refresh token (playlist metadata)

```bash
SPOTIFY_CLIENT_ID=your_id SPOTIFY_CLIENT_SECRET=your_secret node scripts/get-spotify-refresh-token.js
```

Add `SPOTIFY_REFRESH_TOKEN` to Vercel. This is only used server-side to read your playlist — not for visitor playback.

### 3. Configure your site

Edit `config.js` with your playlist ID, name, and theme.

### 4. Run locally

```bash
npm install
vercel dev
```

Environment variables:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REFRESH_TOKEN=your_refresh_token
YOUTUBE_API_KEY=              # optional — faster/more reliable YouTube search
```

Open `http://localhost:3000`.

### 5. Deploy to Vercel

Add the env vars in Vercel, then deploy.

## How playback works

1. Page loads → fetches your Spotify playlist (titles, artists, cover art)
2. For each track, server searches YouTube for a matching embeddable video
3. Visitor clicks **Play** → hidden YouTube player streams the full song
4. Next / prev / seek work through the custom UI

| Source | Role |
|--------|------|
| Spotify API | Playlist metadata (what to play) |
| YouTube | Full audio playback (how it plays) |
| Spotify preview | Fallback only (30s clips, rare for Bollywood) |

**Optional:** Set `YOUTUBE_API_KEY` for more reliable search. Without it, `youtube-sr` is used automatically.

## Project structure

```
spotify-radio/
├── index.html
├── style.css
├── app.js              # YouTube audio engine + custom UI
├── config.js
├── api/
│   ├── playlist.js     # Spotify playlist metadata
│   ├── youtube-search.js
│   └── _lib/
└── scripts/
    └── get-spotify-refresh-token.js
```

## License

MIT
