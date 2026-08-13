'use strict';

const config = window.SITE_CONFIG || {};
const API_BASE = '/api';

let playlist = [];
let accessToken = '';
let spotifyPlayer = null;
let deviceId = null;
let currentIndex = 0;
let isPlaying = false;
let isReady = false;
let isAuthenticated = false;
let hasStarted = false;
let isDraggingSeek = false;
let playbackPosition = 0;
let playbackDuration = 0;

const elTrackName = document.getElementById('track-name');
const elTrackArtist = document.getElementById('track-artist');
const elArtImg = document.getElementById('art-img');
const elArtPlaceholder = document.getElementById('art-placeholder');
const elSeekFill = document.getElementById('seek-fill');
const elSeekBar = document.getElementById('seek-bar');
const elTimeCur = document.getElementById('time-cur');
const elTimeTot = document.getElementById('time-tot');
const elBtnPlay = document.getElementById('btn-play');
const elBtnPrev = document.getElementById('btn-prev');
const elBtnNext = document.getElementById('btn-next');
const elIconPlay = document.getElementById('icon-play');
const elIconPause = document.getElementById('icon-pause');
const elLiveCount = document.getElementById('live-count');
const elClockDisplay = document.getElementById('clock-display');
const elToast = document.getElementById('toast');
const elStationName = document.getElementById('station-name');
const elStationTagline = document.getElementById('station-tagline');
const elTopbarLinks = document.getElementById('topbar-links');

function applySiteConfig() {
  document.documentElement.style.setProperty('--theme-color', config.themeColor || '#1a1008');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', config.themeColor || '#1a1008');

  if (config.heroImage) {
    document.documentElement.style.setProperty('--hero-image', `url('${config.heroImage}')`);
  }

  const title = `${config.name || 'Chai aur Sutta'} ❤️ — 90s & 2000s Bollywood Radio`;
  document.title = title;
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector('meta[name="description"]')?.setAttribute('content', config.description || '');

  if (elStationName) elStationName.textContent = config.name || 'Chai aur Sutta';
  if (elStationTagline) elStationTagline.textContent = config.tagline || '';
}

let taglineIndex = 0;
function rotateTagline() {
  const lines = config.rotatingTaglines;
  if (!lines?.length || !elStationTagline) return;

  elStationTagline.style.opacity = '0';
  elStationTagline.style.transform = 'translateY(4px)';

  setTimeout(() => {
    taglineIndex = (taglineIndex + 1) % lines.length;
    elStationTagline.textContent = lines[taglineIndex];
    elStationTagline.style.opacity = '1';
    elStationTagline.style.transform = 'translateY(0)';
  }, 220);
}

function initRotatingTaglines() {
  if (!elStationTagline || !config.rotatingTaglines?.length) return;
  elStationTagline.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
  setInterval(rotateTagline, 5500);
}

function renderTopbarLinks(spotifyUrl) {
  if (!elTopbarLinks) return;

  const links = [];
  const spotifyLink = config.links?.spotify || spotifyUrl;

  if (isAuthenticated) {
    links.push(`
      <button type="button" class="pill-btn" id="btn-logout" aria-label="Disconnect Spotify">
        <span>Logout</span>
      </button>
    `);
  } else {
    links.push(`
      <a href="/api/auth/login" class="pill-btn" aria-label="Connect Spotify">
        <svg class="pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        <span>Connect</span>
      </a>
    `);
  }

  if (spotifyLink) {
    links.push(`
      <a href="${spotifyLink}" target="_blank" rel="noopener noreferrer" class="pill-btn" aria-label="Open on Spotify">
        <svg class="pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        <span>Spotify</span>
        <span class="pill-arrow">↗</span>
      </a>
    `);
  }

  elTopbarLinks.innerHTML = links.join('');

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    window.location.reload();
  });
}

async function fetchAccessToken() {
  const response = await fetch(`${API_BASE}/auth/token`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.access_token || null;
}

async function refreshTokenForSdk(cb) {
  const token = await fetchAccessToken();
  if (token) {
    accessToken = token;
    cb(token);
  }
}

function initWebPlaybackSdk() {
  if (window.Spotify) {
    createSpotifyPlayer();
    return;
  }

  window.onSpotifyWebPlaybackSDKReady = createSpotifyPlayer;

  if (!document.getElementById('spotify-sdk')) {
    const script = document.createElement('script');
    script.id = 'spotify-sdk';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
  }
}

function createSpotifyPlayer() {
  if (spotifyPlayer || !accessToken) return;

  spotifyPlayer = new window.Spotify.Player({
    name: config.name || 'Chai aur Sutta',
    getOAuthToken: refreshTokenForSdk,
    volume: 0.85,
  });

  spotifyPlayer.addListener('ready', ({ device_id }) => {
    deviceId = device_id;
    isReady = true;
    if (elBtnPlay) elBtnPlay.disabled = false;
  });

  spotifyPlayer.addListener('not_ready', () => {
    isReady = false;
  });

  spotifyPlayer.addListener('initialization_error', ({ message }) => {
    showToast(message);
  });

  spotifyPlayer.addListener('authentication_error', () => {
    isAuthenticated = false;
    showToast('Spotify session expired — connect again');
    renderTopbarLinks(playlistMeta?.spotifyUrl);
  });

  spotifyPlayer.addListener('account_error', () => {
    showToast('Spotify Premium is required for playback');
  });

  spotifyPlayer.addListener('player_state_changed', (state) => {
    if (!state) return;

    playbackPosition = (state.position || 0) / 1000;
    playbackDuration = (state.duration || 0) / 1000;
    setPlaying(!state.paused);

    const track = state.track_window?.current_track;
    if (track) syncFromSdkTrack(track);

    if (!isDraggingSeek) {
      updateSeekBar(playbackPosition, playbackDuration);
    }
  });

  spotifyPlayer.connect();
}

async function startPlaylistPlayback() {
  if (!deviceId || !accessToken || !config.spotifyPlaylistId) return;

  const response = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context_uri: `spotify:playlist:${config.spotifyPlaylistId}`,
      }),
    }
  );

  if (response.status === 401) {
    showToast('Session expired — connect Spotify again');
    return;
  }

  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    showToast(err.error?.message || 'Could not start playlist');
  }
}

async function loadPlaylist() {
  const playlistId = config.spotifyPlaylistId;
  if (!playlistId) {
    showToast('Add your Spotify playlist ID in config.js');
    return;
  }

  accessToken = await fetchAccessToken();
  isAuthenticated = Boolean(accessToken);

  if (isAuthenticated) {
    initWebPlaybackSdk();
  } else if (elBtnPlay) {
    elBtnPlay.disabled = false;
  }

  renderTopbarLinks();

  try {
    const response = await fetch(`${API_BASE}/playlist?id=${encodeURIComponent(playlistId)}`);
    const data = await response.json();

    if (!response.ok) {
      const message = [data.error, data.hint].filter(Boolean).join(' — ');
      throw new Error(message || 'Failed to load playlist');
    }

    playlistMeta = data;
    playlist = data.tracks || [];
    renderTopbarLinks(data.spotifyUrl);

    if (playlist.length === 0) {
      showToast('Playlist is empty');
      return;
    }

    if (elStationTagline && data.name) {
      elStationTagline.textContent = data.name;
    }

    currentIndex = 0;
    updateTrackUI(currentIndex);
  } catch (error) {
    if (elTrackName) elTrackName.textContent = config.name || 'Chai aur Sutta';
    if (elTrackArtist) {
      elTrackArtist.textContent = isAuthenticated
        ? 'Tap play to start your playlist'
        : 'Connect Spotify, then hit play';
    }
    if (!isAuthenticated) showToast('Connect Spotify to play your playlist');
  }
}

function syncFromSdkTrack(track) {
  if (elTrackName) elTrackName.textContent = track.name;
  if (elTrackArtist) {
    const artists = (track.artists || []).map((a) => a.name).join(', ');
    const album = track.album?.name;
    elTrackArtist.textContent = album ? `${artists} • ${album}` : artists;
  }

  const cover = track.album?.images?.[0]?.url;
  if (cover && elArtImg && elArtPlaceholder) {
    elArtImg.src = cover;
    elArtImg.classList.add('loaded');
    elArtPlaceholder.style.display = 'none';
  }
}

async function togglePlay() {
  if (!isAuthenticated) {
    window.location.href = '/api/auth/login';
    return;
  }

  if (!spotifyPlayer) {
    showToast('Connecting to Spotify…');
    return;
  }

  if (!hasStarted) {
    hasStarted = true;
    await startPlaylistPlayback();
    return;
  }

  await spotifyPlayer.togglePlay();
}

async function nextTrack() {
  if (!spotifyPlayer || !isAuthenticated) return;
  await spotifyPlayer.nextTrack();
}

async function prevTrack() {
  if (!spotifyPlayer || !isAuthenticated) return;

  if (playbackPosition > 3) {
    await spotifyPlayer.seek(0);
    return;
  }

  await spotifyPlayer.previousTrack();
}

function setPlaying(state) {
  isPlaying = state;
  if (elBtnPlay) elBtnPlay.setAttribute('aria-pressed', String(state));
  if (elIconPlay && elIconPause) {
    elIconPlay.style.display = state ? 'none' : 'block';
    elIconPause.style.display = state ? 'block' : 'none';
  }
}

function updateTrackUI(index) {
  const track = playlist[index];
  if (!track) return;

  if (elTrackName) elTrackName.textContent = track.title;
  if (elTrackArtist) {
    elTrackArtist.textContent = track.album
      ? `${track.artist} • ${track.album}`
      : track.artist;
  }

  if (elArtImg && elArtPlaceholder) {
    elArtImg.classList.remove('loaded');
    elArtPlaceholder.style.display = 'flex';

    if (track.cover) {
      const img = new Image();
      img.onload = () => {
        elArtImg.src = track.cover;
        elArtImg.classList.add('loaded');
        elArtPlaceholder.style.display = 'none';
      };
      img.onerror = () => {
        elArtPlaceholder.style.display = 'flex';
      };
      img.src = track.cover;
    }
  }

  const totalSecs = track.durationMs ? track.durationMs / 1000 : 0;
  updateSeekBar(playbackPosition, totalSecs || playbackDuration);
}

function formatTime(secs) {
  if (!secs || Number.isNaN(secs) || secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateSeekBar(current, total) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  if (elSeekFill) elSeekFill.style.width = `${pct}%`;
  if (elSeekBar) elSeekBar.setAttribute('aria-valuenow', Math.round(pct));
  if (elTimeCur) elTimeCur.textContent = formatTime(current);
  if (elTimeTot) elTimeTot.textContent = formatTime(total);
}

function seekPct(e) {
  if (!elSeekBar) return 0;
  const rect = elSeekBar.getBoundingClientRect();
  const touch = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : null);
  const x = touch ? touch.clientX : e.clientX;
  return Math.min(1, Math.max(0, (x - rect.left) / rect.width));
}

function handleSeekCommit(pct) {
  if (!spotifyPlayer || !playbackDuration) return;
  spotifyPlayer.seek(Math.floor(pct * playbackDuration * 1000));
  updateSeekBar(pct * playbackDuration, playbackDuration);
}

if (elSeekBar) {
  const onSeekStart = (e) => {
    if (!isReady) return;
    isDraggingSeek = true;
    updateSeekBar(seekPct(e) * playbackDuration, playbackDuration);
  };

  const onSeekMove = (e) => {
    if (!isDraggingSeek) return;
    updateSeekBar(seekPct(e) * playbackDuration, playbackDuration);
  };

  const onSeekEnd = (e) => {
    if (!isDraggingSeek) return;
    isDraggingSeek = false;
    handleSeekCommit(seekPct(e));
  };

  elSeekBar.addEventListener('mousedown', onSeekStart);
  document.addEventListener('mousemove', onSeekMove);
  document.addEventListener('mouseup', onSeekEnd);
  elSeekBar.addEventListener('touchstart', onSeekStart, { passive: true });
  elSeekBar.addEventListener('touchmove', onSeekMove, { passive: true });
  elSeekBar.addEventListener('touchend', onSeekEnd);
}

if (elBtnPlay) elBtnPlay.addEventListener('click', togglePlay);
if (elBtnNext) elBtnNext.addEventListener('click', nextTrack);
if (elBtnPrev) elBtnPrev.addEventListener('click', prevTrack);

document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.code === 'ArrowRight') {
    nextTrack();
  } else if (e.code === 'ArrowLeft') {
    prevTrack();
  }
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: config.timezone || 'Asia/Kolkata',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function updateClock() {
  if (!elClockDisplay) return;
  const parts = timeFormatter.formatToParts(new Date());
  const h = parts.find((p) => p.type === 'hour')?.value || '';
  const m = parts.find((p) => p.type === 'minute')?.value || '';
  const period = (parts.find((p) => p.type === 'dayPeriod')?.value || '').toLowerCase();
  elClockDisplay.textContent = `${h}:${m} ${period}`;
}

function updateLiveCount() {
  if (!elLiveCount) return;
  const base = config.liveCountBase || 24;
  const variance = Math.floor(Math.sin(Date.now() / 8500) * 10 + Math.random() * 6);
  elLiveCount.textContent = Math.max(8, base + variance);
}

let toastTimer = null;
function showToast(message) {
  if (!elToast) return;
  elToast.textContent = message;
  elToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elToast.classList.remove('show'), 2800);
}

applySiteConfig();
initRotatingTaglines();
updateClock();
updateLiveCount();
setInterval(updateClock, 1000);
setInterval(updateLiveCount, 6000);

const authError = new URLSearchParams(window.location.search).get('auth_error');
if (authError) showToast(`Spotify login failed: ${authError}`);

loadPlaylist();
