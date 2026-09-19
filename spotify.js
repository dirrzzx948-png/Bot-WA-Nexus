/**
 * Spotify Downloader Module for Node.js / Termux
 * Returns format expected by handlers/message.js
 */

const axios = require('axios');

function cleanSpotifyUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch (e) {
    return url;
  }
}

async function spotifydl(url) {
  if (!url || !url.includes('spotify.com')) {
    return { status: false, message: 'URL Spotify tidak valid.' };
  }

  const cleanUrl = cleanSpotifyUrl(url);

  // Helper to normalize success response to the shape expected by the handler
  const ok = (title, artists, cover, downloadUrl, sourceUrl = cleanUrl) => ({
    status: true,
    data: {
      title: title || 'Spotify Song',
      sourceUrl,
      thumbnail: cover || '',
      downloads: [{ url: downloadUrl, type: 'audio' }]
    }
  });

  // 1. Primary: siputzx
  try {
    const res1 = await axios.get(
      `https://api.siputzx.my.id/api/d/spotify?url=${encodeURIComponent(cleanUrl)}`,
      { timeout: 15000 }
    );
    const data = res1.data;
    if (data && (data.status || data.data) && data.data) {
      const d = data.data;
      const dl = d.download || d.url || d.dl || d.music;
      if (dl) {
        return ok(d.title || d.name, d.artist || d.artists, d.cover || d.image || d.thumbnail, dl);
      }
    }
  } catch (e) {}

  // 2. Fallback: vreden
  try {
    const res3 = await axios.get(
      `https://api.vreden.web.id/api/spotify?url=${encodeURIComponent(cleanUrl)}`,
      { timeout: 15000 }
    );
    const data3 = res3.data;
    if (data3 && data3.result && (data3.result.music || data3.result.download)) {
      const r = data3.result;
      return ok(r.title, r.artists || r.artist, r.cover || r.thumbnail, r.music || r.download);
    }
  } catch (e) {}

  // 3. Fallback: davidcyriltech style
  try {
    const res4 = await axios.get(
      `https://apis.davidcyriltech.my.id/spotify?url=${encodeURIComponent(cleanUrl)}`,
      { timeout: 15000 }
    );
    const data4 = res4.data;
    const r = data4.result || data4.data || data4;
    const dl = r?.download || r?.url || r?.dl;
    if (dl) {
      return ok(r.title || r.name, r.artists || r.artist, r.cover || r.thumbnail || r.image, dl);
    }
  } catch (e) {}

  // 4. Last resort: spotidownloader-like metadata + download
  try {
    const res2 = await axios.get(
      `https://spotidownloader.com/api/get-metadata?url=${encodeURIComponent(cleanUrl)}`,
      { timeout: 12000, validateStatus: () => true }
    );
    if (res2.status === 200 && res2.data && res2.data.id) {
      const meta = res2.data;
      const downloadRes = await axios.get(
        `https://spotidownloader.com/api/download-track?id=${meta.id}`,
        { timeout: 15000, validateStatus: () => true }
      );
      if (downloadRes.data && downloadRes.data.url) {
        return ok(meta.title, meta.artists, meta.cover, downloadRes.data.url);
      }
    }
  } catch (e) {}

  return {
    status: false,
    message: 'Semua server API Spotify sedang sibuk/down. Coba beberapa saat lagi.'
  };
}

module.exports = {
  spotifydl,
  downloadSpotifyTrack: spotifydl,
  setSpotifySource: () => true
};
