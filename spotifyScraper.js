const { spotifydl } = require('./spotify.js');

async function downloadSpotify(url) {
  try {
    const res = await spotifydl(url);
    return res;
  } catch (err) {
    return { status: false, message: err.message || 'Gagal mengunduh Spotify.' };
  }
}

module.exports = {
  downloadSpotify,
  spotifydl
};
