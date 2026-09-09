const axios = require('axios')
const crypto = require('crypto')

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// --- DUKUNGAN AES SNAPTIK ---
function decryptSnapTikAes(id, encryptedBase64) {
  const salt = 'sn4pt1k_v3r1fy2026'
  const str = salt + ':' + id
  const keyBytes = crypto.createHash('sha256').update(str).digest()

  const bytes = Buffer.from(encryptedBase64, 'base64')
  const iv = bytes.subarray(0, 16)
  const data = bytes.subarray(16)

  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBytes, iv)
  let decrypted = decipher.update(data, null, 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

function solveSnapTikChallenge(challenge) {
  switch (challenge.t) {
    case 'b':
      return ((challenge.a ^ challenge.b) >> challenge.s) & 255
    case 'r':
      return challenge.n.reduce((m, f) => m + f, 0) * 2 + 1
    case 'c':
      return challenge.w.charCodeAt(challenge.i) * challenge.m
    case 'm':
      return ((challenge.a + challenge.b) % 100) * challenge.c
    case 'n':
      return (
        challenge.a * challenge.b +
        challenge.b * challenge.c +
        challenge.c * challenge.a -
        challenge.a
      )
    default:
      throw new Error('Unknown challenge type: ' + challenge.t)
  }
}

// --- SCRAPER TIKTOKIO ---
async function scrapeTikTokIO(cleanUrl) {
  const res = await axios.post('https://tiktokio.com/api/v1/tk/html', {
    vid: cleanUrl,
    prefix: 'tiktokio.com'
  }, {
    headers: {
      'User-Agent': CHROME_UA,
      'Content-Type': 'application/json',
      'Origin': 'https://tiktokio.com',
      'Referer': 'https://tiktokio.com/'
    }
  })

  let html = typeof res.data === 'object' ? JSON.stringify(res.data) : (res.data || '')
  if (!html || html.includes('Please paste a valid link') || html.includes('Error')) {
    throw new Error('TikTokIO: Link tidak valid atau gagal.')
  }

  let title = 'TikTok Content'
  const titleMatch = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
  if (titleMatch) title = titleMatch[1].replace(/<[^>]+>/g, '').trim()

  const anchorTagRegex = /<a[\s\S]*?<\/a>/gi
  let anchorMatch
  let downloadUrl = null

  while ((anchorMatch = anchorTagRegex.exec(html)) !== null) {
    const tag = anchorMatch[0]
    if (!tag.includes('download-btn')) continue

    const hrefM = tag.match(/href=["']([^"']+)/i)
    if (!hrefM || hrefM[1] === '#') continue
    const href = hrefM[1].replace(/&#38;/g, '&')

    const innerText = tag.replace(/<[^>]+>/g, '').trim().toLowerCase()
    if (innerText.includes('without watermark') || tag.includes('download-btn-blue') || tag.includes('download-btn-green')) {
      downloadUrl = href
      break
    }
  }

  if (!downloadUrl) throw new Error('TikTokIO: Link download tidak ditemukan.')

  return { title, downloadUrl }
}

// --- SCRAPER SNAPTIK ---
async function scrapeSnapTik(cleanUrl) {
  const tokenRes = await axios.post('https://snaptik.app/api/token', {}, {
    headers: {
      'User-Agent': CHROME_UA,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      'Origin': 'https://snaptik.app',
      'Referer': 'https://snaptik.app/'
    }
  })

  const tData = tokenRes.data
  if (!tData || !tData.id || !tData.p) throw new Error('SnapTik: Gagal mengambil token.')

  const decryptedStr = decryptSnapTikAes(tData.id, tData.p)
  const challenge = JSON.parse(decryptedStr)
  delete challenge._e
  delete challenge._h
  const challengeResult = solveSnapTikChallenge(challenge)
  const xVerify = `${tData.id}:${challengeResult}:${decryptedStr._e || ''}:${decryptedStr._h || ''}`

  const extractRes = await axios.get(`https://snaptik.app/api/extract?url=${encodeURIComponent(cleanUrl)}`, {
    headers: {
      'User-Agent': CHROME_UA,
      'X-Requested-With': 'XMLHttpRequest',
      'X-Verify': xVerify,
      'Origin': 'https://snaptik.app',
      'Referer': 'https://snaptik.app/'
    }
  })

  const exData = extractRes.data
  if (!exData || !exData.success || !exData.data) throw new Error('SnapTik: Ekstraksi gagal.')

  return {
    title: exData.data.title || 'TikTok Video',
    author: exData.data.author?.nickname || 'TikTok User',
    downloadUrl: exData.data.downloadUrl
  }
}

// --- FUNGSI UTAMA BOT ---
async function tiktokDownload(text) {
  try {
    const regex = /(https?:\/\/(?:vm|vt|www|m)\.tiktok\.com\/[^\s]+)/gi
    const match = text.match(regex)

    if (!match || !match[0]) {
      return { status: false, message: 'URL TikTok tidak ditemukan di dalam pesan.' }
    }

    const cleanUrl = match[0].split('?')[0]
    let downloadData = null

    // 1. Coba Pakai TikTokIO Pertama
    try {
      downloadData = await scrapeTikTokIO(cleanUrl)
    } catch (e1) {
      // 2. Jika TikTokIO Gagal, Fallback ke SnapTik
      try {
        downloadData = await scrapeSnapTik(cleanUrl)
      } catch (e2) {
        throw new Error('Gagal dari TikTokIO maupun SnapTik.')
      }
    }

    // 3. Download videonya ke Buffer
    const videoBuffer = await axios.get(downloadData.downloadUrl, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': CHROME_UA }
    })

    return {
      status: true,
      title: downloadData.title || 'TikTok Video',
      author: downloadData.author || 'TikTok User',
      buffer: Buffer.from(videoBuffer.data)
    }
  } catch (err) {
    return { status: false, message: err.message }
  }
}

module.exports = { tiktokDownload }

