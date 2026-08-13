# Chai aur Sutta

A [Pan Wala](https://pan-wala.vercel.app)-style fullscreen radio page for 90s & 2000s Bollywood — tapri wale gaane, full volume.

Uses the [Spotify Web Playback SDK](https://github.com/spotify/spotify-web-playback-sdk-example) pattern for full playlist playback in your custom player.

## Features

- Loads tracks from **your** Spotify playlist (you must own it or collaborate on it)
- Full playlist playback via **Spotify Web Playback SDK**
- Pan Wala–inspired UI: hero background, floating glass player, live clock
- Fully customizable via `config.js`

## Quick start

### 1. Spotify Developer App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Copy **Client ID** and **Client Secret**
4. Add **Redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback
   https://YOUR-DOMAIN.vercel.app/api/auth/callback
   ```
5. Add your Spotify account to **Users and Access** (development mode allowlist)

### 2. Spotify refresh token (for playlist metadata API)

Spotify requires a server refresh token to load playlist track info for the UI:

```bash
SPOTIFY_CLIENT_ID=your_id SPOTIFY_CLIENT_SECRET=your_secret node scripts/get-spotify-refresh-token.js
```

Add the printed `SPOTIFY_REFRESH_TOKEN` to Vercel.

### 3. Configure your site

Edit `config.js` with your playlist ID, name, and theme.

### 4. Run locally

```bash
vercel dev
```

Environment variables:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REFRESH_TOKEN=your_refresh_token
```

Open `http://localhost:3000`.

### 5. Deploy to Vercel

Add the same env vars in Vercel, then deploy.

## How playback works

1. Page loads → player UI shows your playlist info
2. Visitor clicks **Connect** (or **Play**) → Spotify login
3. **Play** starts your playlist via Web Playback SDK
4. Custom controls drive play / pause / next / prev / seek

**Requirements for listeners:**

- Spotify account (logged in through your site)
- **Spotify Premium** (required by Web Playback SDK)

## Project structure

```
spotify-radio/
├── index.html
├── style.css
├── app.js              # Web Playback SDK player
├── config.js
├── api/
│   ├── auth/           # OAuth login flow
│   ├── playlist.js     # Playlist metadata
│   └── _lib/
└── scripts/
```

## License

MIT
