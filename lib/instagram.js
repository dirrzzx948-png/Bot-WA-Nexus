const axios = require('axios');
const { JSDOM } = require('jsdom');

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

let _igSource = null;
function setInstagramSource(src) {
  _igSource = src;
}

function getCleanUrl(url) {
  if (!url) return '';
  return url.trim().split('?')[0];
}

function createScraperResult(success, dataOrError) {
  if (!success) {
    return { status: false, error: dataOrError };
  }
  return { status: true, data: dataOrError };
}

function extractInstagramTitle(doc, cleanUrl) {
  let title = "";
  if (doc) {
    const titleEl = doc.querySelector(
      ".download-items__title, .card-title, .caption, .desc, .post-title, h3, h4, h5, p.card-text, .text-center > p",
    );
    if (titleEl) {
      const txt = titleEl.textContent?.trim().replace(/\s+/g, " ");
      if (txt && txt.length > 3 && !txt.toLowerCase().includes("download")) {
        title = txt;
      }
    }
  }

  if (!title) {
    const isReel = cleanUrl.includes("/reel");
    const mediaType = isReel ? "Reel" : "Post";
    title = `Instagram ${mediaType}`;
  }
  return title;
}

async function scrapeSnapSave(cleanUrl) {
  try {
    const res = await axios({
      method: 'POST',
      url: 'https://snapsave.app/action.php',
      data: new URLSearchParams({ url: cleanUrl }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': CHROME_UA,
        'Origin': 'https://snapsave.app',
        'Referer': 'https://snapsave.app/'
      },
      timeout: 20000,
      validateStatus: () => true
    });

    if (res.status === 200 && res.data) {
      let htmlContent = res.data;
      if (typeof htmlContent === 'string' && htmlContent.includes('innerHTML')) {
        const match = htmlContent.match(/innerHTML\s*=\s*"([^"]+)"/);
        if (match) {
          htmlContent = JSON.parse('"' + match[1] + '"');
        }
      }

      if (typeof htmlContent === 'string' && htmlContent.includes('<')) {
        const dom = new JSDOM(htmlContent);
        const doc = dom.window.document;
        const downloads = [];

        doc.querySelectorAll('a[href^="http"]').forEach(a => {
          const href = a.getAttribute('href');
          if (href && !href.includes('snapsave.app') && !href.includes('facebook.com')) {
            const isImage = href.match(/\.(jpe?g|png|webp)(\?|$)/i) || a.textContent.toUpperCase().includes('PHOTO');
            downloads.push({
              url: href,
              type: isImage ? 'PHOTO' : 'MP4'
            });
          }
        });

        if (downloads.length > 0) {
          return {
            title: extractInstagramTitle(doc, cleanUrl),
            thumbnail: downloads[0].url,
            downloads: downloads
          };
        }
      }
    }
  } catch (err) {
    console.warn('[SnapSave] Failed:', err.message);
  }
  return null;
}

async function scrapeIndown(cleanUrl) {
  try {
    const res = await axios({
      method: 'POST',
      url: 'https://indown.net/api/ajaxSearch',
      data: new URLSearchParams({ q: cleanUrl, vt: 'reel', t: 'media', lang: 'en', v: 'v2' }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': CHROME_UA,
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://indown.net',
        'Referer': 'https://indown.net/'
      },
      timeout: 20000,
      validateStatus: () => true
    });

    if (res.status === 200 && res.data) {
      const rawData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      const htmlContent = rawData.data || '';

      if (htmlContent) {
        const dom = new JSDOM(htmlContent);
        const doc = dom.window.document;
        const downloads = [];
        const seenUrls = new Set();

        doc.querySelectorAll('a.abutton, a.btn, a[href^="http"]').forEach(a => {
          let href = a.getAttribute('href');
          if (!href || !href.startsWith('http')) return;
          href = href.replace(/&amp;/g, '&');

          if (href.includes('indown.net/api') || href.includes('facebook.com') || seenUrls.has(href)) return;
          seenUrls.add(href);

          const isImage = /\.(jpe?g|png|webp)(\?|$)/i.test(href);
          downloads.push({
            type: isImage ? 'PHOTO' : 'MP4',
            url: href
          });
        });

        if (downloads.length > 0) {
          return {
            title: extractInstagramTitle(doc, cleanUrl),
            thumbnail: downloads[0].url,
            downloads: downloads
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Indown] Failed:', err.message);
  }
  return null;
}

async function scrapeInstagram(url) {
  try {
    const cleanUrl = getCleanUrl(url);
    if (!cleanUrl || !cleanUrl.includes('instagram.com')) {
      return createScraperResult(false, 'URL Instagram tidak valid.');
    }

    let result = null;
    if (_igSource === 'indown') {
      result = await scrapeIndown(cleanUrl) || await scrapeSnapSave(cleanUrl);
    } else {
      result = await scrapeSnapSave(cleanUrl) || await scrapeIndown(cleanUrl);
    }

    if (result && result.downloads && result.downloads.length > 0) {
      _igSource = null;
      return createScraperResult(true, result);
    }

    return createScraperResult(false, 'Semua server downloader Instagram sedang sibuk.');
  } catch (err) {
    _igSource = null;
    return createScraperResult(false, err.message);
  }
}

module.exports = { scrapeInstagram, setInstagramSource };
