/**
 * Spotify Downloader Module for Node.js / Termux
 */

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

  // 1. Coba Endpoint API Primary (Spotify Downloader Direct)
  try {
    const res1 = await fetch(`https://api.siputzx.my.id/api/d/spotify?url=${encodeURIComponent(cleanUrl)}`);
    if (res1.ok) {
      const data = await res1.json();
      if (data && data.status && data.data && (data.data.download || data.data.url)) {
        return {
          status: true,
          result: {
            title: data.data.title || data.data.name || 'Spotify Song',
            artists: data.data.artist || data.data.artists || 'Unknown Artist',
            cover: data.data.cover || data.data.image || '',
            download: data.data.download || data.data.url
          }
        };
      }
    }
  } catch (e) {}

  // 2. Fallback: Endpoint Spotimate / FabDL Scraper API
  try {
    const res2 = await fetch(`https://spotidownloader.com/api/get-metadata?url=${encodeURIComponent(cleanUrl)}`);
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.id) {
        const downloadRes = await fetch(`https://spotidownloader.com/api/download-track?id=${data2.id}`);
        const downloadData = await downloadRes.json();
        if (downloadData && downloadData.url) {
          return {
            status: true,
            result: {
              title: data2.title || 'Spotify Song',
              artists: data2.artists || 'Unknown Artist',
              cover: data2.cover || '',
              download: downloadData.url
            }
          };
        }
      }
    }
  } catch (e) {}

  // 3. Fallback: Endpoint Vreden
  try {
    const res3 = await fetch(`https://api.vreden.web.id/api/spotify?url=${encodeURIComponent(cleanUrl)}`);
    if (res3.ok) {
      const data3 = await res3.json();
      if (data3 && data3.result && data3.result.music) {
        return {
          status: true,
          result: {
            title: data3.result.title || 'Spotify Song',
            artists: data3.result.artists || 'Unknown Artist',
            cover: data3.result.cover || '',
            download: data3.result.music
          }
        };
      }
    }
  } catch (e) {}

  return { status: false, message: 'Semua server API Spotify sedang sibuk/down. Coba beberapa saat lagi.' };
}

function setSpotifySource() {
  return true;
}

module.exports = {
  spotifydl,
  downloadSpotifyTrack: spotifydl,
  setSpotifySource
};
