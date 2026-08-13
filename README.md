# Chai aur Sutta

A [Pan Wala](https://pan-wala.vercel.app)-style fullscreen radio page for 90s & 2000s Bollywood — tapri wale gaane, full volume.

## Features

- Loads tracks from **your** Spotify playlist (you must own it or collaborate on it)
- Pan Wala–inspired UI: hero background, floating glass player, live clock
- Full-track playback via YouTube search (optional)
- Falls back to Spotify 30-second previews when YouTube is unavailable
- Fully customizable via `config.js`

## Quick start

### 1. Spotify Developer App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Copy **Client ID** and **Client Secret**

### 2. Spotify refresh token (required)

Spotify no longer allows playlist track access with Client ID/Secret alone. You need a one-time user authorization:

1. In your [Spotify app settings](https://developer.spotify.com/dashboard), add Redirect URI:
   ```
   http://127.0.0.1:8888/callback
   ```
2. Add your Spotify account to the app's **User Management** allowlist (Settings → Users and Access).
3. Run locally:

```bash
SPOTIFY_CLIENT_ID=your_id SPOTIFY_CLIENT_SECRET=your_secret node scripts/get-spotify-refresh-token.js
```

4. Copy the printed `SPOTIFY_REFRESH_TOKEN` into Vercel environment variables.

### 3. Configure your site

Edit `config.js`:

```js
window.SITE_CONFIG = {
  name: 'Ashwani\'s Mix',
  tagline: 'Late Night Vibes',
  description: 'My personal Spotify playlist.',
  spotifyPlaylistId: 'YOUR_PLAYLIST_ID', // from open.spotify.com/playlist/THIS_PART
  themeColor: '#0a0a12',
  heroImage: 'hero-bg.jpg',
  timezone: 'America/New_York',
  links: {
    spotify: '',
    instagram: 'https://instagram.com/yourhandle',
  },
};
```

Add a background image named `hero-bg.jpg` in the project root (or change `heroImage` to any URL).

### 4. Run locally with Vercel

```bash
npm i -g vercel
vercel dev
```

Set environment variables when prompted (or in `.env.local`):

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REFRESH_TOKEN=your_refresh_token
YOUTUBE_API_KEY=your_youtube_key   # optional, for full-track playback
```

Open `http://localhost:3000`.

### 5. Deploy to Vercel

```bash
vercel
```

In the Vercel dashboard, add:

| Variable | Required | Purpose |
|----------|----------|---------|
| `SPOTIFY_CLIENT_ID` | Yes | Spotify app credentials |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify app credentials |
| `SPOTIFY_REFRESH_TOKEN` | Yes | Read your playlist tracks |
| `YOUTUBE_API_KEY` | No | Full songs via YouTube (like Pan Wala) |

## Playback modes

| Mode | Requirement | Experience |
|------|-------------|------------|
| YouTube | `YOUTUBE_API_KEY` set | Full songs (same idea as Pan Wala) |
| Spotify preview | Always available | 30-second clips per track |
| Open in Spotify | Top-bar link | Full playback in Spotify app |

## Project structure

```
spotify-radio/
├── index.html       # Page shell
├── style.css        # Pan Wala–style UI
├── app.js           # Player engine
├── config.js        # Your customization
├── api/
│   ├── playlist.js       # Spotify playlist API
│   └── youtube-search.js # YouTube fallback search
└── vercel.json
```

## Notes

- The playlist must be **owned by you** (or you must be a collaborator). Spotify returns 403 otherwise.
- Your Spotify account must be on the app's **allowlist** in the Developer Dashboard (development mode).
- YouTube playback requires a [Google Cloud API key](https://console.cloud.google.com/) with YouTube Data API v3 enabled.

## License

MIT
