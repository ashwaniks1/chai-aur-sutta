'use strict';

const config = window.SITE_CONFIG || {};
const API_BASE = '/api';

let playlist = [];
let playlistMeta = null;
let currentIndex = 0;
let isPlaying = false;
let isReady = false;
let hasUserStarted = false;
let isSkipLocked = false;
let isDraggingSeek = false;
let seekInterval = null;
let playbackMode = 'none'; // 'youtube' | 'preview'

let ytPlayer = null;
const previewAudio = document.getElementById('preview-audio');
const youtubeCache = new Map();

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
const elHeroBgBase = document.getElementById('hero-bg-base');
const elHeroBgArt = document.getElementById('hero-bg-art');

let songFactLines = [];
let songFactIndex = 0;
let songFactTrackId = null;
let taglineTimer = null;
const factCache = new Map();

function applySiteConfig() {
  document.documentElement.style.setProperty('--theme-color', config.themeColor || '#1a1008');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', config.themeColor || '#1a1008');

  if (config.heroImage && elHeroBgBase) {
    elHeroBgBase.style.backgroundImage = `url('${config.heroImage}')`;
  }

  const title = `${config.name || 'Chai aur Sutta'} ❤️ — 90s & 2000s Bollywood Radio`;
  document.title = title;
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector('meta[name="description"]')?.setAttribute('content', config.description || '');

  if (elStationName) elStationName.textContent = config.name || 'Chai aur Sutta';
  if (elStationTagline) elStationTagline.textContent = config.tagline || '';

  const livePill = document.querySelector('.live-pill');
  if (livePill && config.showLiveCount === false) {
    livePill.style.display = 'none';
  }
}

function fadeTaglineTo(text) {
  if (!elStationTagline || !text) return;

  elStationTagline.style.opacity = '0';
  elStationTagline.style.transform = 'translateY(4px)';

  setTimeout(() => {
    elStationTagline.textContent = text;
    elStationTagline.style.opacity = '1';
    elStationTagline.style.transform = 'translateY(0)';
  }, 220);
}

function rotateTaglineContent() {
  const lines = songFactLines.length ? songFactLines : config.rotatingTaglines;
  if (!lines?.length) return;

  songFactIndex = (songFactIndex + 1) % lines.length;
  fadeTaglineTo(lines[songFactIndex]);
}

function initTaglineRotation() {
  if (!elStationTagline) return;

  elStationTagline.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
  if (taglineTimer) clearInterval(taglineTimer);
  taglineTimer = setInterval(rotateTaglineContent, 5500);
}

async function loadSongFacts(track) {
  if (!track?.id) return;

  songFactTrackId = track.id;

  if (factCache.has(track.id)) {
    songFactLines = factCache.get(track.id);
    songFactIndex = 0;
    fadeTaglineTo(songFactLines[0]);
    return;
  }

  fadeTaglineTo('Did you know…');

  const params = new URLSearchParams({
    title: track.title,
    artist: track.artist,
    album: track.album || '',
    year: track.releaseYear || '',
  });

  try {
    const response = await fetch(`${API_BASE}/track-fact?${params}`);
    const data = await response.json();
    if (songFactTrackId !== track.id) return;

    songFactLines = data.facts?.length ? data.facts : (config.rotatingTaglines || []);
    factCache.set(track.id, songFactLines);
    songFactIndex = 0;
    fadeTaglineTo(songFactLines[0]);
  } catch {
    if (songFactTrackId !== track.id) return;
    songFactLines = config.rotatingTaglines || [];
    songFactIndex = 0;
    fadeTaglineTo(songFactLines[0] || config.tagline || '');
  }
}

function updateHeroBackground(coverUrl) {
  if (!elHeroBgArt) return;

  if (coverUrl) {
    elHeroBgArt.style.backgroundImage = `url('${coverUrl}')`;
    elHeroBgArt.classList.add('visible');
  } else {
    elHeroBgArt.classList.remove('visible');
  }
}

function renderTopbarLinks(spotifyUrl) {
  if (!elTopbarLinks) return;

  const links = [];
  const spotifyLink = config.links?.spotify || spotifyUrl;
  if (spotifyLink) {
    links.push(`
      <a href="${spotifyLink}" target="_blank" rel="noopener noreferrer" class="pill-btn" aria-label="Open on Spotify">
        <svg class="pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        <span>Spotify</span>
        <span class="pill-arrow">↗</span>
      </a>
    `);
  }

  if (config.links?.instagram) {
    links.push(`
      <a href="${config.links.instagram}" target="_blank" rel="noopener noreferrer" class="pill-btn" aria-label="Instagram">
        <svg class="pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        <span>Instagram</span>
        <span class="pill-arrow">↗</span>
      </a>
    `);
  }

  elTopbarLinks.innerHTML = links.join('');
}

async function loadPlaylist() {
  const playlistId = config.spotifyPlaylistId;
  if (!playlistId) {
    showToast('Add your Spotify playlist ID in config.js');
    return;
  }

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

    shuffleStartIndex();
    updateTrackUI(currentIndex);
    if (data.cover) updateHeroBackground(data.cover);
    initYouTubeEngine();
  } catch (error) {
    if (elTrackName) elTrackName.textContent = 'Could not load playlist';
    if (elTrackArtist) elTrackArtist.textContent = error.message;
    showToast(error.message);
  }
}

function shuffleStartIndex() {
  currentIndex = Math.floor(Math.random() * playlist.length);
}

async function resolveYouTubeId(track) {
  const cacheKey = track.id;
  if (youtubeCache.has(cacheKey)) {
    return youtubeCache.get(cacheKey);
  }

  const query = `${track.title} ${track.artist} original`.replace(/\s+/g, ' ').trim();

  try {
    const response = await fetch(`${API_BASE}/youtube-search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      youtubeCache.set(cacheKey, null);
      return null;
    }
    const data = await response.json();
    const videoId = data.videoId || null;
    youtubeCache.set(cacheKey, videoId);
    return videoId;
  } catch {
    youtubeCache.set(cacheKey, null);
    return null;
  }
}

function initYouTubeEngine() {
  if (window.YT?.Player) {
    createYouTubePlayer();
    return;
  }

  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function () {
  createYouTubePlayer();
};

function createYouTubePlayer() {
  if (ytPlayer) return;

  ytPlayer = new YT.Player('yt-audio-player', {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      origin: window.location.origin,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onYouTubeStateChange,
      onError: onYouTubeError,
    },
  });
}

function onPlayerReady() {
  isReady = true;
  if (elBtnPlay) elBtnPlay.disabled = false;
  if (playlist.length) prepareTrack(currentIndex);
}

function onYouTubeStateChange(event) {
  if (playbackMode !== 'youtube') return;

  const S = YT.PlayerState;
  if (event.data === S.PLAYING) {
    setPlaying(true);
    isSkipLocked = false;
    startSeekUpdater();
  } else if (event.data === S.PAUSED) {
    setPlaying(false);
  } else if (event.data === S.ENDED) {
    setPlaying(false);
    nextTrack();
  }
}

function onYouTubeError() {
  if (playbackMode !== 'youtube' || isSkipLocked) return;
  isSkipLocked = true;
  showToast('Agla gaana laga rahe hain…');
  setTimeout(() => {
    isSkipLocked = false;
    nextTrack();
  }, 800);
}

async function prepareTrack(index) {
  if (!playlist.length) return;

  currentIndex = ((index % playlist.length) + playlist.length) % playlist.length;
  const track = playlist[currentIndex];

  const youtubeId = await resolveYouTubeId(track);
  if (youtubeId && ytPlayer?.cueVideoById) {
    playbackMode = 'youtube';
    ytPlayer.cueVideoById(youtubeId);
    return;
  }

  if (track.previewUrl) {
    playbackMode = 'preview';
    previewAudio.src = track.previewUrl;
    return;
  }

  playbackMode = 'none';
}

async function playTrackAt(index) {
  if (!playlist.length) return;

  currentIndex = ((index % playlist.length) + playlist.length) % playlist.length;
  const track = playlist[currentIndex];
  updateTrackUI(currentIndex);

  stopPreview();
  if (ytPlayer?.stopVideo) {
    try { ytPlayer.stopVideo(); } catch (_) {}
  }

  const youtubeId = await resolveYouTubeId(track);
  if (youtubeId && ytPlayer?.loadVideoById && hasUserStarted) {
    playbackMode = 'youtube';
    ytPlayer.loadVideoById(youtubeId);
    return;
  }

  if (youtubeId && ytPlayer?.cueVideoById && !hasUserStarted) {
    playbackMode = 'youtube';
    ytPlayer.cueVideoById(youtubeId);
    return;
  }

  if (track.previewUrl) {
    playbackMode = 'preview';
    previewAudio.src = track.previewUrl;
    if (hasUserStarted) {
      try {
        await previewAudio.play();
        setPlaying(true);
      } catch {
        showToast('Tap play to start listening');
      }
    }
    return;
  }

  playbackMode = 'none';
  showToast('Could not find audio — skipping…');
  if (hasUserStarted) {
    setTimeout(() => nextTrack(), 1200);
  }
}

function stopPreview() {
  previewAudio.pause();
  previewAudio.currentTime = 0;
}

previewAudio.addEventListener('ended', () => {
  if (playbackMode === 'preview' && isPlaying) {
    nextTrack();
  }
});

previewAudio.addEventListener('timeupdate', () => {
  if (playbackMode !== 'preview' || isDraggingSeek) return;
  updateSeekBar(previewAudio.currentTime, previewAudio.duration || 0);
});

function togglePlay() {
  if (!isReady || !playlist.length) return;
  hasUserStarted = true;

  if (isPlaying) {
    if (playbackMode === 'youtube' && ytPlayer?.pauseVideo) {
      ytPlayer.pauseVideo();
    } else if (playbackMode === 'preview') {
      previewAudio.pause();
      setPlaying(false);
    }
    return;
  }

  if (playbackMode === 'youtube' && ytPlayer?.playVideo) {
    ytPlayer.playVideo();
  } else if (playbackMode === 'preview' && previewAudio.src) {
    previewAudio.play().then(() => setPlaying(true)).catch(() => {
      showToast('Tap play to start listening');
    });
  } else {
    playTrackAt(currentIndex);
  }
}

function nextTrack() {
  hasUserStarted = true;
  playTrackAt(currentIndex + 1);
}

function prevTrack() {
  hasUserStarted = true;

  if (playbackMode === 'youtube' && ytPlayer?.getCurrentTime?.() > 3) {
    ytPlayer.seekTo(0, true);
    return;
  }

  if (playbackMode === 'preview' && previewAudio.currentTime > 3) {
    previewAudio.currentTime = 0;
    return;
  }

  playTrackAt(currentIndex - 1);
}

function setPlaying(state) {
  isPlaying = state;
  if (elBtnPlay) elBtnPlay.setAttribute('aria-pressed', String(state));
  if (elIconPlay && elIconPause) {
    elIconPlay.style.display = state ? 'none' : 'block';
    elIconPause.style.display = state ? 'block' : 'none';
  }

  if (state) startSeekUpdater();
  else stopSeekUpdater();
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
  updateSeekBar(0, totalSecs);

  updateHeroBackground(track.cover);
  loadSongFacts(track);
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

function startSeekUpdater() {
  stopSeekUpdater();
  seekInterval = setInterval(() => {
    if (isDraggingSeek || !isPlaying) return;

    if (playbackMode === 'youtube' && ytPlayer?.getCurrentTime) {
      try {
        const cur = ytPlayer.getCurrentTime() || 0;
        const tot = ytPlayer.getDuration() || 0;
        updateSeekBar(cur, tot);
      } catch (_) {}
    }
  }, 400);
}

function stopSeekUpdater() {
  if (seekInterval) {
    clearInterval(seekInterval);
    seekInterval = null;
  }
}

function seekPct(e) {
  if (!elSeekBar) return 0;
  const rect = elSeekBar.getBoundingClientRect();
  const touch = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : null);
  const x = touch ? touch.clientX : e.clientX;
  return Math.min(1, Math.max(0, (x - rect.left) / rect.width));
}

function handleSeekCommit(pct) {
  if (playbackMode === 'youtube' && ytPlayer?.getDuration) {
    const tot = ytPlayer.getDuration() || 0;
    ytPlayer.seekTo(pct * tot, true);
    updateSeekBar(pct * tot, tot);
  } else if (playbackMode === 'preview' && previewAudio.duration) {
    previewAudio.currentTime = pct * previewAudio.duration;
    updateSeekBar(previewAudio.currentTime, previewAudio.duration);
  }
}

if (elSeekBar) {
  const onSeekStart = (e) => {
    if (!isReady) return;
    isDraggingSeek = true;
    const tot = playbackMode === 'youtube'
      ? (ytPlayer?.getDuration?.() || 0)
      : (previewAudio.duration || 0);
    updateSeekBar(seekPct(e) * tot, tot);
  };

  const onSeekMove = (e) => {
    if (!isDraggingSeek) return;
    const tot = playbackMode === 'youtube'
      ? (ytPlayer?.getDuration?.() || 0)
      : (previewAudio.duration || 0);
    updateSeekBar(seekPct(e) * tot, tot);
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
  if (!elLiveCount || config.showLiveCount === false) return;
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
initTaglineRotation();
updateClock();
updateLiveCount();
setInterval(updateClock, 1000);
setInterval(updateLiveCount, 6000);
loadPlaylist();
