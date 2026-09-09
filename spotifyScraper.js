const { spotifydl } = require('./spotify.js');

async function downloadSpotify(url) {
  try {
    const res = await spotifydl(url);
    return res;
  } catch (err) {
    return { status: false, message: err.message };
  }
}

module.exports = {
  downloadSpotify,
  spotifydl
};
