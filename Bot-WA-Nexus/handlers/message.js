const { makeSticker, makeTextSticker, stickerToImage, downloadMedia } = require('../lib/sticker')
const { tiktokDownload } = require('../lib/tiktok')
const { scrape: scrapeYouTube } = require('../youtubeScraper')
const { downloadSpotify } = require('../spotifyScraper')
const { scrapeInstagram, setInstagramSource } = require('../lib/instagram')
const fs = require('fs')
const axios = require('axios')
const path = require('path')
const os = require('os')
const { execFile } = require('child_process')
const util = require('util')
const execFileAsync = util.promisify(execFile)

const OWNER = 'Hoidir'
const BOT_NAME = 'NEXUS BOT'
const CREATED_DATE = '7 September 2026'

// Simple in-memory rate limit (per jid)
const lastCommand = new Map()
const RATE_LIMIT_MS = 1200

function unwrapMessage(message) {
  if (!message) return null
  return (
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.documentWithCaptionMessage?.message ||
    message
  )
}

function getText(msg) {
  const m = unwrapMessage(msg.message)
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    ''
  )
}

function getQuotedMessage(msg) {
  const m = unwrapMessage(msg.message)
  const context =
    m?.extendedTextMessage?.contextInfo ||
    m?.imageMessage?.contextInfo ||
    m?.videoMessage?.contextInfo
  return unwrapMessage(context?.quotedMessage)
}

async function isGroupAdmin(sock, jid, sender) {
  try {
    const metadata = await sock.groupMetadata(jid)
    const participant = metadata.participants.find(p => p.id === sender)
    return participant?.admin === 'admin' || participant?.admin === 'superadmin'
  } catch {
    return false
  }
}

async function isBotAdmin(sock, jid) {
  try {
    const metadata = await sock.groupMetadata(jid)
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
    const participant = metadata.participants.find(p => p.id === botId)
    return participant?.admin === 'admin' || participant?.admin === 'superadmin'
  } catch {
    return false
  }
}

async function sendLoadingStatus(sock, jid, initialText, steps = []) {
  const sent = await sock.sendMessage(jid, { text: initialText })
  for (const step of steps) {
    await new Promise(res => setTimeout(res, step.delay || 700))
    try {
      await sock.sendMessage(jid, { text: step.text, edit: sent.key })
    } catch (_) {}
  }
  return sent
}

// ---------- Extra helpers for new features ----------
async function fetchJson(url, opts = {}) {
  const { data } = await axios.get(url, { timeout: 12000, ...opts })
  return data
}

const QUOTES = [
  { text: 'Kesuksesan adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan.', author: 'Colin Powell' },
  { text: 'Jangan takut gagal. Takutlah untuk tidak mencoba.', author: 'Anonim' },
  { text: 'Hidup itu seperti sepeda. Untuk menjaga keseimbangan, kamu harus terus bergerak.', author: 'Albert Einstein' },
  { text: 'Bermimpilah setinggi langit. Jika engkau jatuh, engkau akan jatuh di antara bintang-bintang.', author: 'Soekarno' },
  { text: 'Kegagalan adalah kesempatan untuk memulai lagi dengan lebih cerdas.', author: 'Henry Ford' },
  { text: 'Yang terbaik belum datang. Teruslah berusaha.', author: 'Anonim' },
  { text: 'Jangan bandingkan prosesmu dengan orang lain. Setiap bunga mekar di waktunya sendiri.', author: 'Anonim' },
  { text: 'Kerja keras mengalahkan bakat ketika bakat tidak bekerja keras.', author: 'Tim Notke' },
  { text: 'Belajarlah dari masa lalu, hiduplah untuk masa kini, dan rencanakan untuk masa depan.', author: 'Anonim' },
  { text: 'Keberanian bukanlah tidak adanya rasa takut, melainkan kemampuan untuk mengatasinya.', author: 'Nelson Mandela' }
]

async function handleMessage(sock, msg, startTime) {
  try {
    if (!msg?.message) return
    const jid = msg.key.remoteJid
    if (jid === 'status@broadcast') return

    // Abaikan pesan dari bot sendiri
    if (msg.key.fromMe) return

    const text = getText(msg)
    if (!text) return

    const parts = text.trim().split(/\s+/)
    const command = parts[0].toLowerCase()
    const args = parts.slice(1).join(' ')

    // Rate limit sederhana
    const now = Date.now()
    const last = lastCommand.get(jid) || 0
    if (now - last < RATE_LIMIT_MS && command.startsWith('!')) {
      return
    }
    if (command.startsWith('!')) lastCommand.set(jid, now)

    const getRuntime = () => {
      const total = Math.floor((Date.now() - (startTime || Date.now())) / 1000)
      const hours = Math.floor(total / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      return `${hours}j ${minutes}m ${total % 60}d`
    }

    // ================= MAIN MENU =================
    if (command === '!menu' || command === '!help') {
      const menuText = `
━───[ *${BOT_NAME}* ]───━

┌─ *[ STICKER TOOLS ]*
│ • *!s* / *!sticker* : Gambar → Stiker
│ • *!ts <teks>* : Teks → Stiker
│ • *!toimg* : Stiker → Gambar
└───────────────────

┌─ *[ DOWNLOADER ]*
│ • *!tt <url>* : TikTok (tanpa watermark)
│ • *!ig <url>* : Instagram Reel/Post
│ • *!yt <url>* : YouTube Video
│ • *!ytmp3 <url>* / *!play* : YouTube Audio
│ • *!spotify <url>* : Spotify Audio
└───────────────────

┌─ *[ FUN & AI ]*
│ • *!ai <pertanyaan>* : Tanya AI
│ • *!quotes* : Quote random
│ • *!tts <teks>* : Text-to-Speech (VN)
│ • *!translate <kode> <teks>* : Terjemah
│ • *!cuaca <kota>* : Cuaca hari ini
│ • *!short <url>* : Perpendek link
└───────────────────

┌─ *[ SYSTEM ]*
│ • *!ping* : Cek kecepatan
│ • *!runtime* : Waktu aktif bot
│ • *!owner* : Info pemilik
└───────────────────

┌─ *[ GRUP ]* (Admin)
│ • *!groupinfo* • *!admins*
│ • *!tagall* • *!hidetag <pesan>*
│ • *!kick* (reply/mention)
│ • *!add <nomor>*
└───────────────────

━───[ Ketik *!help* untuk panduan ]───━`.trim()

      await sock.sendMessage(jid, { text: menuText }, { quoted: msg })
      return
    }

    // ================= HELP DETAIL =================
    if (command === '!panduan') {
      const helpText = `
━───[ *PANDUAN PENGGUNAAN* ]───━

🖼️ *STIKER*
• Kirim gambar + caption *!s*, atau reply gambar dengan *!s*
• *!ts Halo Bro* → stiker teks
• Reply stiker + *!toimg* → ubah ke gambar

📥 *DOWNLOADER*
• *!tt https://vt.tiktok.com/xxx*
• *!ig https://www.instagram.com/reel/xxx*
• *!yt / !ytmp3 / !play* + link YouTube
• *!spotify* + link Spotify

🤖 *AI & FUN*
• *!ai Apa itu quantum computing?*
• *!quotes*
• *!tts Selamat pagi semuanya*
• *!translate en Halo dunia*
• *!cuaca Jakarta*
• *!short https://example.com/panjang*

👥 *GRUP (Admin saja)*
• *!hidetag Pengumuman penting*
• *!tagall*
• Reply chat member + *!kick*
• *!add 081234567890*

━─────────────────────────━`.trim()
      await sock.sendMessage(jid, { text: helpText }, { quoted: msg })
      return
    }

    // ================= TIKTOK DOWNLOADER =================
    if (command === '!tt' || command === '!tiktok') {
      if (!args && !text.match(/tiktok\.com/i)) {
        await sock.sendMessage(jid, {
          text: `*[ PERINTAH GAGAL ]*\nURL TikTok belum diisi.\n\n*Contoh:*\n!tt https://vt.tiktok.com/xxxx/`
        }, { quoted: msg })
        return
      }

      const statusMsg = await sendLoadingStatus(sock, jid, '━ [ ▰▰▱▱▱ ] *Memproses Video TikTok...*', [
        { text: '━ [ ▰▰▰▰▰ ] *Mengunduh Video...*', delay: 700 }
      ])

      const result = await tiktokDownload(text)

      if (!result.status) {
        await sock.sendMessage(jid, { text: `*[ UNDUHAN GAGAL ]*\n${result.message}`, edit: statusMsg.key })
        return
      }

      const captionText = `━───[ *TIKTOK DOWNLOADER* ]───━\n\n*Judul* : ${result.title}\n*Kreator* : ${result.author}`

      await sock.sendMessage(jid, { text: '━ [ ▰▰▰▰▰ ] *Pengiriman Selesai!*', edit: statusMsg.key })

      await sock.sendMessage(jid, {
        video: result.buffer,
        caption: captionText,
        mimetype: 'video/mp4'
      }, { quoted: msg })
      return
    }

    // ================= INSTAGRAM DOWNLOADER =================
    if (command === '!ig' || command === '!instagram' || command === '!igsnapsave' || command === '!igsavvid' || command === '!igindown') {
      let targetUrl = args
      let customSource = 'snapsave'

      if (command === '!igsnapsave') customSource = 'snapsave'
      if (command === '!igsavvid') customSource = 'savevid'
      if (command === '!igindown') customSource = 'indown'

      if (!targetUrl && text.includes('http')) {
        const matchUrl = text.match(/https?:\/\/[^\s]+/)
        if (matchUrl) targetUrl = matchUrl[0]
      }

      if (!targetUrl) {
        await sock.sendMessage(jid, {
          text: `*[ PERINTAH GAGAL ]*\nURL Instagram belum diisi.\n\n*Contoh:*\n!ig https://www.instagram.com/reel/xxxx/`
        }, { quoted: msg })
        return
      }

      const statusMsg = await sendLoadingStatus(sock, jid, '━ [ ▰▱▱▱▱ ] *Menghubungkan ke Instagram...*', [
        { text: '━ [ ▰▰▰▰▰ ] *Mengambil Data Media...*', delay: 900 }
      ])

      try {
        setInstagramSource(customSource)
        const result = await scrapeInstagram(targetUrl)

        if (!result.status) {
          await sock.sendMessage(jid, { text: `*[ UNDUHAN GAGAL ]*\n${result.error || 'Gagal mengunduh media Instagram.'}`, edit: statusMsg.key })
          return
        }

        const data = result.data
        const downloads = data.downloads || []

        if (downloads.length === 0) {
          await sock.sendMessage(jid, { text: '*[ UNDUHAN GAGAL ]*\nTidak ada media ditemukan pada tautan tersebut.', edit: statusMsg.key })
          return
        }

        await sock.sendMessage(jid, { text: '━ [ ▰▰▰▰▰ ] *Mengirim Media...*', edit: statusMsg.key })

        const captionText = `━───[ *INSTAGRAM DOWNLOADER* ]───━\n\n*Judul* : ${data.title || 'Instagram Media'}`

        const primaryMedia = downloads[0]
        if (primaryMedia.type === 'PHOTO' || primaryMedia.url.match(/\.(jpe?g|png|webp)(\?|$)/i)) {
          await sock.sendMessage(jid, {
            image: { url: primaryMedia.url },
            caption: captionText
          }, { quoted: msg })
        } else {
          await sock.sendMessage(jid, {
            video: { url: primaryMedia.url },
            caption: captionText,
            mimetype: 'video/mp4'
          }, { quoted: msg })
        }

        if (downloads.length > 1) {
          for (let i = 1; i < downloads.length; i++) {
            const med = downloads[i]
            if (med.type === 'PHOTO' || med.url.match(/\.(jpe?g|png|webp)(\?|$)/i)) {
              await sock.sendMessage(jid, { image: { url: med.url } }, { quoted: msg })
            } else {
              await sock.sendMessage(jid, { video: { url: med.url }, mimetype: 'video/mp4' }, { quoted: msg })
            }
          }
        }
      } catch (err) {
        console.log('[ERROR INSTAGRAM]', err)
        await sock.sendMessage(jid, { text: '*[ ERROR ]* Terjadi kesalahan sistem saat memproses Instagram.', edit: statusMsg.key })
      }
      return
    }

    // ================= YOUTUBE DOWNLOADER =================
    if (
      command === '!yt' ||
      command === '!yt360' ||
      command === '!yt720' ||
      command === '!yt1080' ||
      command === '!play' ||
      command === '!ytmp3'
    ) {
      if (!args) {
        await sock.sendMessage(jid, {
          text: `*[ PERINTAH GAGAL ]*\nURL YouTube belum diisi.\n\n*Format:*\n• !yt <url> (Video)\n• !ytmp3 / !play <url> (Audio)`
        }, { quoted: msg })
        return
      }

      const formatType = (command === '!ytmp3' || command === '!play') ? 'mp3' : 'mp4'

      const statusMsg = await sendLoadingStatus(sock, jid, `━ [ ▰▱▱▱▱ ] *Menghubungkan YouTube (${formatType.toUpperCase()})...*`, [
        { text: `━ [ ▰▰▰▰▰ ] *Mengonversi & Mengunduh Media...*`, delay: 1000 }
      ])

      try {
        const result = await scrapeYouTube(args, formatType)

        if (!result.status) {
          await sock.sendMessage(jid, { text: `*[ UNDUHAN GAGAL ]*\n${result.message}`, edit: statusMsg.key })
          return
        }

        const { title, downloads } = result.result
        const downloadItem = downloads[0]

        if (!downloadItem || !downloadItem.url) {
          await sock.sendMessage(jid, { text: '*[ UNDUHAN GAGAL ]* Tautan unduhan tidak tersedia.', edit: statusMsg.key })
          return
        }

        await sock.sendMessage(jid, { text: '━ [ ▰▰▰▰▰ ] *Mengirim Media...*', edit: statusMsg.key })

        // Handle local file (dari ytdl fallback)
        if (downloadItem.isLocal && fs.existsSync(downloadItem.url)) {
          const buffer = fs.readFileSync(downloadItem.url)
          try { fs.unlinkSync(downloadItem.url) } catch (_) {}

          if (formatType === 'mp3') {
            await sock.sendMessage(jid, {
              audio: buffer,
              mimetype: 'audio/mpeg',
              ptt: false
            }, { quoted: msg })
          } else {
            const captionText = `━───[ *YOUTUBE DOWNLOADER* ]───━\n\n*Judul* : ${title}`
            await sock.sendMessage(jid, {
              video: buffer,
              caption: captionText,
              mimetype: 'video/mp4'
            }, { quoted: msg })
          }
        } else {
          if (formatType === 'mp3') {
            await sock.sendMessage(jid, {
              audio: { url: downloadItem.url },
              mimetype: 'audio/mp4',
              ptt: false
            }, { quoted: msg })
          } else {
            const captionText = `━───[ *YOUTUBE DOWNLOADER* ]───━\n\n*Judul* : ${title}`
            await sock.sendMessage(jid, {
              video: { url: downloadItem.url },
              caption: captionText,
              mimetype: 'video/mp4'
            }, { quoted: msg })
          }
        }
      } catch (err) {
        console.log('[ERROR YT]', err)
        await sock.sendMessage(jid, { text: '*[ ERROR ]* Terjadi kesalahan sistem saat mengunduh YouTube.', edit: statusMsg.key })
      }
      return
    }

    // ================= SPOTIFY DOWNLOADER =================
    if (command === '!spotify' || command === '!sp') {
      if (!args) {
        await sock.sendMessage(jid, {
          text: `*[ PERINTAH GAGAL ]*\nURL Spotify belum diisi.\n\n*Contoh:*\n!spotify https://open.spotify.com/track/xxxx`
        }, { quoted: msg })
        return
      }

      const statusMsg = await sendLoadingStatus(sock, jid, '━ [ ▰▱▱▱▱ ] *Menghubungkan ke Spotify...*', [
        { text: '━ [ ▰▰▰▱▱ ] *Mengekstrak Audio...*', delay: 800 },
        { text: '━ [ ▰▰▰▰▰ ] *Mengunduh File...*', delay: 800 }
      ])

      try {
        const result = await downloadSpotify(args)

        if (!result.status) {
          await sock.sendMessage(jid, {
            text: `*[ UNDUHAN GAGAL ]*\n${result.error || result.message || 'Gagal mengunduh.'}`,
            edit: statusMsg.key
          })
          return
        }

        // Support both old & new response shapes
        const data = result.data || result.result || result
        const title = data.title || 'Spotify Song'
        const sourceUrl = data.sourceUrl || args
        const thumbnail = data.thumbnail || data.cover || ''
        let audioUrl = null

        if (Array.isArray(data.downloads) && data.downloads.length) {
          audioUrl = data.downloads[0].url
        } else {
          audioUrl = data.download || data.url || data.music
        }

        if (!audioUrl) {
          await sock.sendMessage(jid, {
            text: '*[ UNDUHAN GAGAL ]*\nTautan unduhan audio tidak ditemukan.',
            edit: statusMsg.key
          })
          return
        }

        const captionText = `━───[ *SPOTIFY DOWNLOADER* ]───━\n\n*Judul* : ${title}\n*Tautan* : ${sourceUrl}`

        await sock.sendMessage(jid, { text: '━ [ ▰▰▰▰▰ ] *Mengirim Audio...*', edit: statusMsg.key })

        if (thumbnail) {
          try {
            await sock.sendMessage(jid, {
              image: { url: thumbnail },
              caption: captionText
            }, { quoted: msg })
          } catch (_) {
            await sock.sendMessage(jid, { text: captionText }, { quoted: msg })
          }
        } else {
          await sock.sendMessage(jid, { text: captionText }, { quoted: msg })
        }

        await sock.sendMessage(jid, {
          audio: { url: audioUrl },
          mimetype: 'audio/mpeg',
          ptt: false
        }, { quoted: msg })
      } catch (err) {
        console.log('[ERROR SPOTIFY]', err)
        await sock.sendMessage(jid, { text: '*[ ERROR ]* Terjadi kesalahan sistem pada Spotify.', edit: statusMsg.key })
      }
      return
    }

    // ================= STICKER TOOLS =================
    if (command === '!s' || command === '!sticker' || command === '!stiker') {
      const m = unwrapMessage(msg.message)
      const quoted = getQuotedMessage(msg)
      let imageMessage = m?.imageMessage || quoted?.imageMessage

      if (!imageMessage) {
        await sock.sendMessage(jid, {
          text: '*[ PERINTAH GAGAL ]*\nKirim atau balas gambar dengan menyertakan perintah *!s*'
        }, { quoted: msg })
        return
      }

      try {
        const buffer = await downloadMedia(imageMessage, 'image')
        const sticker = await makeSticker(buffer, args)
        await sock.sendMessage(jid, { sticker }, { quoted: msg })
      } catch (err) {
        console.log('[STICKER ERROR]', err.message)
        await sock.sendMessage(jid, {
          text: `*[ GAGAL ]* Tidak bisa membuat stiker.\n${err.message.includes('Font') ? 'Font sistem tidak ditemukan (khusus Termux/Android).' : err.message}`
        }, { quoted: msg })
      }
      return
    }

    if (command === '!ts' || command === '!textsticker') {
      if (!args) {
        await sock.sendMessage(jid, {
          text: '*[ PERINTAH GAGAL ]*\nSertakan teks untuk stiker.\n\n*Contoh:* !ts Halo Dunia'
        }, { quoted: msg })
        return
      }
      try {
        const sticker = await makeTextSticker(args)
        await sock.sendMessage(jid, { sticker }, { quoted: msg })
      } catch (err) {
        console.log('[TEXT STICKER ERROR]', err.message)
        await sock.sendMessage(jid, {
          text: `*[ GAGAL ]* ${err.message.includes('Font') ? 'Font sistem tidak ditemukan.' : err.message}`
        }, { quoted: msg })
      }
      return
    }

    if (command === '!toimg') {
      const quoted = getQuotedMessage(msg)
      if (!quoted?.stickerMessage) {
        await sock.sendMessage(jid, {
          text: '*[ PERINTAH GAGAL ]*\nBalas stiker dengan perintah *!toimg*'
        }, { quoted: msg })
        return
      }
      try {
        const buffer = await downloadMedia(quoted.stickerMessage, 'sticker')
        const image = await stickerToImage(buffer)
        await sock.sendMessage(jid, {
          image,
          caption: '*Konversi Stiker → Gambar Berhasil!*'
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(jid, { text: `*[ GAGAL ]* ${err.message}` }, { quoted: msg })
      }
      return
    }

    // ================= SYSTEM COMMANDS =================
    if (command === '!owner') {
      const info = `━───[ *INFORMASI PEMILIK* ]───━\n\n• *Nama Bot* : ${BOT_NAME}\n• *Pemilik* : ${OWNER}\n• *Dibuat Pada* : ${CREATED_DATE}\n• *Waktu Aktif Bot* : ${getRuntime()}\n\nTerima kasih sudah memakai ${BOT_NAME}!`
      await sock.sendMessage(jid, { text: info.trim() }, { quoted: msg })
      return
    }

    if (command === '!ping') {
      const start = Date.now()
      const sent = await sock.sendMessage(jid, { text: '━ [ ▰▱▱▱▱ ] *Menghitung Ping...*' })
      const diff = Date.now() - start
      await sock.sendMessage(jid, {
        text: `*PONG!* 🏓\nRespon Server: *${diff} ms*\nRuntime: ${getRuntime()}`,
        edit: sent.key
      })
      return
    }

    if (command === '!runtime') {
      await sock.sendMessage(jid, {
        text: `⏱️ *Waktu Aktif Bot:*\n${getRuntime()}`
      }, { quoted: msg })
      return
    }

    // ================= NEW: AI =================
    if (command === '!ai' || command === '!ask' || command === '!tanya') {
      if (!args) {
        await sock.sendMessage(jid, {
          text: '*[ PERINTAH GAGAL ]*\nTulis pertanyaan setelah perintah.\n\n*Contoh:* !ai Apa itu black hole?'
        }, { quoted: msg })
        return
      }

      const statusMsg = await sendLoadingStatus(sock, jid, '━ [ ▰▱▱▱▱ ] *AI sedang berpikir...*', [
        { text: '━ [ ▰▰▰▰▱ ] *Menyusun jawaban...*', delay: 900 }
      ])

      try {
        // Free public LLM endpoint (may change; multiple fallbacks)
        let answer = null

        // Try 1: pollinations (simple text)
        try {
          const prompt = encodeURIComponent(
            `Kamu adalah asisten WhatsApp bernama Nexus. Jawab singkat, jelas, dan ramah dalam Bahasa Indonesia.\n\nPertanyaan: ${args}`
          )
          const { data } = await axios.get(`https://text.pollinations.ai/${prompt}`, {
            timeout: 20000,
            responseType: 'text',
            transformResponse: [(d) => d]
          })
          if (data && typeof data === 'string' && data.length > 5) {
            answer = data.trim()
          }
        } catch (_) {}

        // Try 2: simple duckduckgo instant (fallback knowledge)
        if (!answer) {
          try {
            const q = encodeURIComponent(args)
            const { data } = await axios.get(
              `https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1`,
              { timeout: 10000 }
            )
            if (data.AbstractText) answer = data.AbstractText
            else if (data.RelatedTopics?.[0]?.Text) answer = data.RelatedTopics[0].Text
          } catch (_) {}
        }

        if (!answer) {
          answer = 'Maaf, AI sedang sibuk atau tidak bisa menjawab pertanyaan itu saat ini. Coba lagi nanti ya!'
        }

        // Batasi panjang jawaban
        if (answer.length > 3500) answer = answer.slice(0, 3490) + '...'

        await sock.sendMessage(jid, {
          text: `━───[ *NEXUS AI* ]───━\n\n${answer}`,
          edit: statusMsg.key
        })
      } catch (err) {
        console.log('[AI ERROR]', err.message)
        await sock.sendMessage(jid, {
          text: '*[ ERROR ]* Gagal mendapatkan jawaban AI.',
          edit: statusMsg.key
        })
      }
      return
    }

    // ================= NEW: QUOTES =================
    if (command === '!quotes' || command === '!quote' || command === '!katabijak') {
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)]
      await sock.sendMessage(jid, {
        text: `━───[ *QUOTE* ]───━\n\n_"${q.text}"_\n\n— *${q.author}*`
      }, { quoted: msg })
      return
    }

    // ================= NEW: TTS (Text to Speech) =================
    if (command === '!tts' || command === '!say') {
      if (!args) {
        await sock.sendMessage(jid, {
          text: '*[ PERINTAH GAGAL ]*\nTulis teks yang mau diubah jadi suara.\n\n*Contoh:* !tts Selamat pagi semuanya'
        }, { quoted: msg })
        return
      }

      const statusMsg = await sendLoadingStatus(sock, jid, '━ [ ▰▱▱▱▱ ] *Membuat suara...*', [])

      try {
        // Google Translate TTS (free, no key)
        const lang = 'id'
        const textToSpeak = args.slice(0, 200) // limit
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=${lang}&client=tw-ob`

        const { data } = await axios.get(ttsUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000
        })

        const buffer = Buffer.from(data)
        await sock.sendMessage(jid, {
          audio: buffer,
          mimetype: 'audio/mp4',
          ptt: true
        }, { quoted: msg })

        try {
          await sock.sendMessage(jid, { text: '✅ *Voice note siap!*', edit: statusMsg.key })
        } catch (_) {}
      } catch (err) {
        console.log('[TTS ERROR]', err.message)
        await sock.sendMessage(jid, {
          text: '*[ GAGAL ]* Tidak bisa membuat voice note saat ini.',
          edit: statusMsg.key
        })
      }
      return
    }

    // ================= NEW: TRANSLATE =================
    if (command === '!translate' || command === '!tr') {
      if (!args) {
        await sock.sendMessage(jid, {
          text: '*[ PERINTAH GAGAL ]*\nFormat: *!translate <kode_bahasa> <teks>*\n\nContoh:\n• !tr en Halo dunia\n• !tr ja Good morning\n• !tr id How are you?'
        }, { quoted: msg })
        return
      }

      const partsTr = args.trim().split(/\s+/)
      let targetLang = 'id'
      let textToTranslate = args

      // Jika argumen pertama 2 huruf → anggap kode bahasa
      if (partsTr[0].length === 2 && /^[a-z]{2}$/i.test(partsTr[0])) {
        targetLang = partsTr[0].toLowerCase()
        textToTranslate = partsTr.slice(1).join(' ')
      }

      if (!textToTranslate) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]* Teks yang mau diterjemahkan kosong.' }, { quoted: msg })
        return
      }

      try {
        // Google Translate unofficial
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`
        const { data } = await axios.get(url, { timeout: 10000 })

        let translated = ''
        if (Array.isArray(data) && Array.isArray(data[0])) {
          translated = data[0].map(item => item[0]).join('')
        }

        if (!translated) {
          await sock.sendMessage(jid, { text: '*[ GAGAL ]* Tidak bisa menerjemahkan teks tersebut.' }, { quoted: msg })
          return
        }

        const detected = data[2] || 'auto'
        await sock.sendMessage(jid, {
          text: `━───[ *TRANSLATE* ]───━\n\n*Dari* : ${detected}\n*Ke* : ${targetLang}\n\n*Hasil:*\n${translated}`
        }, { quoted: msg })
      } catch (err) {
        console.log('[TRANSLATE ERROR]', err.message)
        await sock.sendMessage(jid, { text: '*[ ERROR ]* Gagal menerjemahkan.' }, { quoted: msg })
      }
      return
    }

    // ================= NEW: CUACA =================
    if (command === '!cuaca' || command === '!weather') {
      if (!args) {
        await sock.sendMessage(jid, {
          text: '*[ PERINTAH GAGAL ]*\nSertakan nama kota.\n\n*Contoh:* !cuaca Jakarta'
        }, { quoted: msg })
        return
      }

      try {
        // Open-Meteo (gratis, tanpa API key) + geocoding
        const geo = await axios.get(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(args)}&count=1&language=id&format=json`,
          { timeout: 10000 }
        )

        if (!geo.data?.results?.length) {
          await sock.sendMessage(jid, {
            text: `*[ TIDAK DITEMUKAN ]*\nKota "${args}" tidak ditemukan.`
          }, { quoted: msg })
          return
        }

        const place = geo.data.results[0]
        const { latitude, longitude, name, country, admin1 } = place

        const weather = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`,
          { timeout: 10000 }
        )

        const cur = weather.data.current
        const code = cur.weather_code

        const weatherDesc = {
          0: 'Cerah ☀️',
          1: 'Sebagian cerah 🌤️',
          2: 'Berawan sebagian ⛅',
          3: 'Berawan ☁️',
          45: 'Berkabut 🌫️',
          48: 'Kabut beku 🌫️',
          51: 'Gerimis ringan 🌦️',
          53: 'Gerimis 🌦️',
          55: 'Gerimis lebat 🌧️',
          61: 'Hujan ringan 🌧️',
          63: 'Hujan 🌧️',
          65: 'Hujan lebat 🌧️',
          71: 'Salju ringan ❄️',
          80: 'Hujan lokal 🌦️',
          95: 'Badai petir ⛈️'
        }

        const desc = weatherDesc[code] || `Kode cuaca ${code}`

        const textCuaca = `
━───[ *CUACA HARI INI* ]───━

📍 *Lokasi* : ${name}${admin1 ? ', ' + admin1 : ''}${country ? ' • ' + country : ''}
🌡️ *Suhu* : ${cur.temperature_2m}°C
💧 *Kelembapan* : ${cur.relative_humidity_2m}%
💨 *Angin* : ${cur.wind_speed_10m} km/j
☁️ *Kondisi* : ${desc}
`.trim()

        await sock.sendMessage(jid, { text: textCuaca }, { quoted: msg })
      } catch (err) {
        console.log('[CUACA ERROR]', err.message)
        await sock.sendMessage(jid, { text: '*[ ERROR ]* Gagal mengambil data cuaca.' }, { quoted: msg })
      }
      return
    }

    // ================= NEW: SHORT URL =================
    if (command === '!short' || command === '!shortlink' || command === '!tiny') {
      if (!args || !args.startsWith('http')) {
        await sock.sendMessage(jid, {
          text: '*[ PERINTAH GAGAL ]*\nBerikan URL yang valid.\n\n*Contoh:* !short https://example.com/halaman-panjang'
        }, { quoted: msg })
        return
      }

      try {
        // is.gd (gratis & stabil)
        const { data } = await axios.get(
          `https://is.gd/create.php?format=simple&url=${encodeURIComponent(args)}`,
          { timeout: 10000, responseType: 'text', transformResponse: [(d) => d] }
        )

        if (data && data.startsWith('http')) {
          await sock.sendMessage(jid, {
            text: `━───[ *SHORT LINK* ]───━\n\n*Asli:*\n${args}\n\n*Pendek:*\n${data.trim()}`
          }, { quoted: msg })
        } else {
          await sock.sendMessage(jid, { text: '*[ GAGAL ]* Tidak bisa memendekkan URL tersebut.' }, { quoted: msg })
        }
      } catch (err) {
        console.log('[SHORT ERROR]', err.message)
        await sock.sendMessage(jid, { text: '*[ ERROR ]* Gagal memendekkan link.' }, { quoted: msg })
      }
      return
    }

    // ================= GROUP COMMANDS =================
    if (command === '!groupinfo') {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nPerintah ini hanya dapat digunakan di dalam grup.' }, { quoted: msg })
        return
      }
      try {
        const metadata = await sock.groupMetadata(jid)
        const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length

        const infoText = `━───[ *INFORMASI GRUP* ]───━\n\n*Nama Grup* : ${metadata.subject}\n*Total Anggota* : ${metadata.participants.length}\n*Total Admin* : ${admins}\n*Dibuat* : ${metadata.creation ? new Date(metadata.creation * 1000).toLocaleDateString('id-ID') : '-'}`

        await sock.sendMessage(jid, { text: infoText }, { quoted: msg })
      } catch (e) {
        await sock.sendMessage(jid, { text: '*[ ERROR ]* Gagal mengambil info grup.' }, { quoted: msg })
      }
      return
    }

    if (command === '!admins') {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nPerintah ini hanya dapat digunakan di dalam grup.' }, { quoted: msg })
        return
      }
      try {
        const metadata = await sock.groupMetadata(jid)
        const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')

        let teks = `━───[ *DAFTAR ADMIN GRUP* ]───━\n\n`
        for (const admin of admins) {
          teks += `• @${admin.id.split('@')[0]}\n`
        }

        await sock.sendMessage(jid, { text: teks.trim(), mentions: admins.map(a => a.id) }, { quoted: msg })
      } catch (e) {
        await sock.sendMessage(jid, { text: '*[ ERROR ]* Gagal mengambil daftar admin.' }, { quoted: msg })
      }
      return
    }

    if (command === '!tagall' || command === '!hidetag') {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nPerintah ini hanya dapat digunakan di dalam grup.' }, { quoted: msg })
        return
      }
      const sender = msg.key.participant || msg.key.remoteJid
      const admin = await isGroupAdmin(sock, jid, sender)
      if (!admin) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nPerintah ini hanya dapat digunakan oleh Admin grup.' }, { quoted: msg })
        return
      }

      try {
        const metadata = await sock.groupMetadata(jid)
        const mentions = metadata.participants.map(p => p.id)

        if (command === '!hidetag') {
          await sock.sendMessage(jid, { text: args || '*PENGUMUMAN GRUP*', mentions })
          return
        }

        let teks = args ? `*PENGUMUMAN:* ${args}\n\n` : '*PANGGILAN ANGGOTA GRUP:*\n\n'
        for (const p of metadata.participants) {
          teks += `• @${p.id.split('@')[0]}\n`
        }
        await sock.sendMessage(jid, { text: teks.trim(), mentions })
      } catch (e) {
        await sock.sendMessage(jid, { text: '*[ ERROR ]* Gagal men-tag anggota.' }, { quoted: msg })
      }
      return
    }

    if (command === '!kick') {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nHanya bisa digunakan di grup.' }, { quoted: msg })
        return
      }
      const sender = msg.key.participant || msg.key.remoteJid
      if (!(await isGroupAdmin(sock, jid, sender))) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nHanya Admin yang boleh menggunakan perintah ini.' }, { quoted: msg })
        return
      }
      if (!(await isBotAdmin(sock, jid))) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nBot harus menjadi Admin untuk mengeluarkan anggota.' }, { quoted: msg })
        return
      }

      let targetJid =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        msg.message?.extendedTextMessage?.contextInfo?.participant

      if (!targetJid) {
        await sock.sendMessage(jid, {
          text: '*[ PERINTAH GAGAL ]*\nReply chat member atau mention (@) member yang mau dikeluarkan.'
        }, { quoted: msg })
        return
      }

      try {
        await sock.groupParticipantsUpdate(jid, [targetJid], 'remove')
        await sock.sendMessage(jid, {
          text: `*[ KICK BERHASIL ]*\nBerhasil mengeluarkan @${targetJid.split('@')[0]}`,
          mentions: [targetJid]
        }, { quoted: msg })
      } catch (e) {
        await sock.sendMessage(jid, { text: `*[ GAGAL ]* ${e.message || 'Tidak bisa mengeluarkan member.'}` }, { quoted: msg })
      }
      return
    }

    if (command === '!add') {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nHanya bisa digunakan di grup.' }, { quoted: msg })
        return
      }
      const sender = msg.key.participant || msg.key.remoteJid
      if (!(await isGroupAdmin(sock, jid, sender))) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nHanya Admin yang boleh menggunakan perintah ini.' }, { quoted: msg })
        return
      }
      if (!(await isBotAdmin(sock, jid))) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nBot harus menjadi Admin untuk menambah anggota.' }, { quoted: msg })
        return
      }

      if (!args) {
        await sock.sendMessage(jid, {
          text: '*[ PERINTAH GAGAL ]*\nSertakan nomor.\n\n*Contoh:* !add 081234567890'
        }, { quoted: msg })
        return
      }

      let cleanNumber = args.replace(/[^0-9]/g, '')
      if (cleanNumber.startsWith('0')) cleanNumber = '62' + cleanNumber.slice(1)
      if (cleanNumber.startsWith('8')) cleanNumber = '62' + cleanNumber
      const targetJid = `${cleanNumber}@s.whatsapp.net`

      try {
        await sock.groupParticipantsUpdate(jid, [targetJid], 'add')
        await sock.sendMessage(jid, {
          text: `*[ ADD BERHASIL ]*\nBerhasil menambahkan @${cleanNumber}`,
          mentions: [targetJid]
        }, { quoted: msg })
      } catch (e) {
        await sock.sendMessage(jid, {
          text: `*[ GAGAL ]* Tidak bisa menambahkan nomor tersebut.\nPastikan nomor aktif di WhatsApp dan pengaturan privasi grup mengizinkan.`
        }, { quoted: msg })
      }
      return
    }

  } catch (error) {
    console.log('[ERROR HANDLER]', error.message)
  }
}

module.exports = { handleMessage }
