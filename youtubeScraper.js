const axios = require('axios');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const os = require('os');

function extractVideoId(url) {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function scrapeViaApi(url, format) {
  const videoId = extractVideoId(url);
  if (!videoId) return null;
  const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const apis = [
    async () => {
      const endpoint =
        format === 'mp3'
          ? `https://apis.davidcyriltech.my.id/youtube/mp3?url=${encodeURIComponent(targetUrl)}`
          : `https://apis.davidcyriltech.my.id/youtube/mp4?url=${encodeURIComponent(targetUrl)}`;
      const { data } = await axios.get(endpoint, { timeout: 12000 });
      const res = data.result || data;
      return {
        title: res.title || 'YouTube Video',
        url: res.download_url || res.url || res.dl_url || res.dl
      };
    },
    async () => {
      const endpoint =
        format === 'mp3'
          ? `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(targetUrl)}`
          : `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(targetUrl)}`;
      const { data } = await axios.get(endpoint, { timeout: 12000 });
      const res = data.data || data.result || data;
      return {
        title: res.title || 'YouTube Video',
        url: res.dl || res.url || res.download || res.download_url
      };
    },
    async () => {
      const endpoint = `https://api.vreden.web.id/api/yt${format === 'mp3' ? 'mp3' : 'mp4'}?url=${encodeURIComponent(targetUrl)}`;
      const { data } = await axios.get(endpoint, { timeout: 12000 });
      const res = data.result || data.data || data;
      return {
        title: res.title || 'YouTube Video',
        url: res.download?.url || res.url || res.dl || res.download
      };
    }
  ];

  for (const api of apis) {
    try {
      const result = await api();
      if (result && result.url) return result;
    } catch (e) {
      continue;
    }
  }
  return null;
}

/**
 * Fallback using @distube/ytdl-core (downloads to temp then returns local path as "url")
 * WhatsApp can send local file buffers, so we return a special local path.
 */
async function scrapeViaYtdl(url, format) {
  if (!ytdl.validateURL(url)) return null;

  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title || 'YouTube Video';

  const dir = path.join(os.tmpdir(), 'nexus-yt');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const id = Date.now();
  const ext = format === 'mp3' ? 'mp3' : 'mp4';
  const outPath = path.join(dir, `yt_${id}.${ext}`);

  return new Promise((resolve, reject) => {
    const stream = ytdl(url, {
      quality: format === 'mp3' ? 'highestaudio' : 'highest',
      filter: format === 'mp3' ? 'audioonly' : 'audioandvideo'
    });

    const writeStream = fs.createWriteStream(outPath);
    stream.pipe(writeStream);

    stream.on('error', (err) => {
      try { fs.unlinkSync(outPath); } catch (_) {}
      reject(err);
    });

    writeStream.on('finish', () => {
      resolve({
        title,
        url: outPath, // local path – handler will detect & send as buffer
        isLocal: true
      });
    });

    writeStream.on('error', (err) => {
      try { fs.unlinkSync(outPath); } catch (_) {}
      reject(err);
    });
  });
}

async function scrape(url, format = 'mp4') {
  const videoId = extractVideoId(url);
  if (!videoId) {
    return { status: false, message: 'URL YouTube tidak valid!' };
  }

  // 1. Coba API dulu (lebih cepat & hemat bandwidth)
  try {
    const apiResult = await scrapeViaApi(url, format);
    if (apiResult && apiResult.url) {
      return {
        status: true,
        result: {
          title: apiResult.title,
          downloads: [
            {
              type: format === 'mp3' ? 'audio' : 'video',
              quality: format === 'mp3' ? '128kbps' : '720p',
              url: apiResult.url,
              isLocal: false
            }
          ]
        }
      };
    }
  } catch (e) {}

  // 2. Fallback ke ytdl-core
  try {
    const ytdlResult = await scrapeViaYtdl(url, format);
    if (ytdlResult && ytdlResult.url) {
      return {
        status: true,
        result: {
          title: ytdlResult.title,
          downloads: [
            {
              type: format === 'mp3' ? 'audio' : 'video',
              quality: format === 'mp3' ? 'highestaudio' : 'highest',
              url: ytdlResult.url,
              isLocal: true
            }
          ]
        }
      };
    }
  } catch (e) {
    console.log('[YT ytdl fallback error]', e.message);
  }

  return {
    status: false,
    message: 'Semua server downloader YouTube sedang sibuk/gagal. Coba beberapa saat lagi.'
  };
}

module.exports = { scrape, extractVideoId };
