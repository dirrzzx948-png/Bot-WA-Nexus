const { makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys')
const { makeSticker, makeTextSticker, stickerToImage, downloadMedia } = require('../lib/sticker')
const { tiktokDownload } = require('../lib/tiktok')
const { scrape: scrapeYouTube } = require('../youtubeScraper')
const { downloadSpotify } = require('../spotifyScraper')
const { scrapeInstagram, setInstagramSource } = require('../lib/instagram')
const { fal } = require('@fal-ai/client')
const FormData = require('form-data')
const fs = require('fs')
const axios = require('axios')
const path = require('path')
const os = require('os')
const { execFile } = require('child_process')
const util = require('util')
const execFileAsync = util.promisify(execFile)

const OWNER = 'CEO SAWIT'
const BOT_NAME = 'NEXUS BOT'
const CREATED_DATE = '7 September 2026'

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

    return (
      participant?.admin === 'admin' ||
      participant?.admin === 'superadmin'
    )
  } catch {
    return false
  }
}

async function isBotAdmin(sock, jid) {
  try {
    const metadata = await sock.groupMetadata(jid)

    const botId =
      sock.user.id.split(':')[0] + '@s.whatsapp.net'

    const participant = metadata.participants.find(
      p => p.id === botId
    )

    return (
      participant?.admin === 'admin' ||
      participant?.admin === 'superadmin'
    )
  } catch {
    return false
  }
}

async function sendLoadingStatus(sock, jid, initialText, steps = []) {
  const sent = await sock.sendMessage(jid, {
    text: initialText
  })

  for (const step of steps) {
    await new Promise(resolve =>
      setTimeout(resolve, step.delay || 700)
    )

    try {
      await sock.sendMessage(jid, {
        text: step.text,
        edit: sent.key
      })
    } catch (_) {}
  }

  return sent
}

const QUOTES = [
  {
    text: 'Kesuksesan adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan.',
    author: 'Colin Powell'
  },
  {
    text: 'Jangan takut gagal. Takutlah untuk tidak mencoba.',
    author: 'Anonim'
  },
  {
    text: 'Hidup itu seperti sepeda. Untuk menjaga keseimbangan, kamu harus terus bergerak.',
    author: 'Albert Einstein'
  },
  {
    text: 'Bermimpilah setinggi langit. Jika engkau jatuh, engkau akan jatuh di antara bintang-bintang.',
    author: 'Soekarno'
  },
  {
    text: 'Kegagalan adalah kesempatan untuk memulai lagi dengan lebih cerdas.',
    author: 'Henry Ford'
  },
  {
    text: 'Yang terbaik belum datang. Teruslah berusaha.',
    author: 'Anonim'
  },
  {
    text: 'Jangan bandingkan prosesmu dengan orang lain. Setiap bunga mekar di waktunya sendiri.',
    author: 'Anonim'
  },
  {
    text: 'Kerja keras mengalahkan bakat ketika bakat tidak bekerja keras.',
    author: 'Tim Notke'
  },
  {
    text: 'Belajarlah dari masa lalu, hiduplah untuk masa kini, dan rencanakan untuk masa depan.',
    author: 'Anonim'
  },
  {
    text: 'Keberanian bukanlah tidak adanya rasa takut, melainkan kemampuan untuk mengatasinya.',
    author: 'Nelson Mandela'
  }
]

async function handleMessage(sock, msg, startTime) {
  try {
    if (!msg?.message) return

    const jid = msg.key.remoteJid

    if (!jid || jid === 'status@broadcast') return

    const text = getText(msg)

    if (!text) return

    const parts = text.trim().split(/\s+/)
    const command = parts[0].toLowerCase()
    const args = parts.slice(1).join(' ')

    // ================= RATE LIMIT =================

    const now = Date.now()
    const last = lastCommand.get(jid) || 0

    if (
      now - last < RATE_LIMIT_MS &&
      command.startsWith('!')
    ) {
      return
    }

    if (command.startsWith('!')) {
      lastCommand.set(jid, now)
    }

    // ================= RUNTIME =================

    const getRuntime = () => {
      const total = Math.floor(
        (Date.now() - (startTime || Date.now())) / 1000
      )

      const hours = Math.floor(total / 3600)
      const minutes = Math.floor((total % 3600) / 60)

      return `${hours}j ${minutes}m ${total % 60}d`
    }

    // ================= MAIN MENU =================

    if (command === '!menu' || command === '!help') {
      const menuText = `
━───[ *${BOT_NAME}* ]───━

┌─ *[ STICKER & MEDIA ]*
│ • *!s* / *!sticker* : Gambar → Stiker
│ • *!ts <teks>* : Teks → Stiker
│ • *!toimg* : Stiker → Gambar
│ • *!rvo* : Bongkar pesan View Once (reply)
└───────────────────

┌─ *[ DOWNLOADER ]*
│ • *!tt <url>* : TikTok (tanpa watermark)
│ • *!ig <url>* : Instagram Reel/Post
│ • *!yt <url>* : YouTube Video
│ • *!ytmp3 <url>* / *!play* : YouTube Audio
│ • *!spotify <url>* : Spotify Audio
└───────────────────

┌─ *[ FUN, AI & FAKE QUOTE ]*
│ • *!ai <pertanyaan>* : Tanya AI (Teks)
│ • *!aiimg <prompt>* : AI Image Generator
│ • *!aiedit <prompt>* : AI Image Editor (fal.ai)
│ • *!iqc <teks>* : Fake Quote iPhone Style
│ • *!spam <teks> <jml>* : Kirim teks berulang
│ • *!quotes* : Quote random
│ • *!tts <teks>* : Text-to-Speech
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

━───[ Ketik *!panduan* untuk panduan ]───━
`.trim()

      await sock.sendMessage(
        jid,
        { text: menuText },
        { quoted: msg }
      )

      return
    }

    // ================= HELP DETAIL =================

    if (command === '!panduan') {
      const helpText = `
━───[ *PANDUAN PENGGUNAAN* ]───━

STIKER & VIEW ONCE
• Kirim gambar + caption *!s*, atau reply gambar dengan *!s*
• *!ts Halo Bro* → stiker teks
• Reply stiker + *!toimg* → ubah ke gambar
• Reply foto/video *View Once* + *!rvo* → bongkar isi media

DOWNLOADER
• *!tt https://vt.tiktok.com/xxx*
• *!ig https://www.instagram.com/reel/xxx*
• *!yt / !ytmp3 / !play* + link YouTube
• *!spotify* + link Spotify

AI, FUN, FAKE QUOTE & SPAM
• *!ai Apa itu quantum computing?*
• *!aiimg futuristic cyberpunk city at night*
• *!aiedit ubah baju jadi jas hitam* (Reply foto)
• *!iqc halo bang* → Fake Quote iPhone Style
• *!spam maaf 20*
• *!quotes*
• *!tts Selamat pagi semuanya*
• *!translate en Halo dunia*
• *!cuaca Jakarta*
• *!short https://example.com/panjang*

GRUP (Admin saja)
• *!hidetag Pengumuman penting*
• *!tagall*
• Reply chat member + *!kick*
• *!add 081234567890*

━─────────────────────────━
`.trim()

      await sock.sendMessage(
        jid,
        { text: helpText },
        { quoted: msg }
      )

      return
    }

    // ================= IQC =================

    if (command === '!iqc') {
      if (!args) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Teks IQC belum diisi.\n\n' +
              '*Contoh:*\n' +
              '!iqc sewa bot dm'
          },
          { quoted: msg }
        )

        return
      }

      try {
        await sock.sendMessage(jid, {
          react: {
            text: '⏳',
            key: msg.key
          }
        })

        const now = new Date()

        const time = now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })

        const carrierName = 'INDOSAT OORE...'
        const batteryPercentage =
          Math.floor(Math.random() * 40) + 60

        const signalStrength = 4
        const emojiStyle = 'apple'

        const iqcUrl =
          'https://brat.siputzx.my.id/iphone-quoted' +
          `?time=${encodeURIComponent(time)}` +
          `&messageText=${encodeURIComponent(args)}` +
          `&carrierName=${encodeURIComponent(carrierName)}` +
          `&batteryPercentage=${batteryPercentage}` +
          `&signalStrength=${signalStrength}` +
          `&emojiStyle=${encodeURIComponent(emojiStyle)}`

        console.log('[IQC]', iqcUrl)

        await sock.sendMessage(
          jid,
          {
            image: {
              url: iqcUrl
            },
            caption: ''
          },
          { quoted: msg }
        )

        await sock.sendMessage(jid, {
          react: {
            text: '✅',
            key: msg.key
          }
        })
      } catch (err) {
        console.log('[IQC ERROR]', err)

        await sock.sendMessage(
          jid,
          {
            text:
              `*[ IQC GAGAL ]*\n\n` +
              `Terjadi kesalahan saat membuat gambar IQC.\n\n` +
              `Error: ${err.message || 'Unknown error'}`
          },
          { quoted: msg }
        )
      }

      return
    }

    // ================= TIKTOK =================

    if (command === '!tt' || command === '!tiktok') {
      if (!args && !text.match(/tiktok\.com/i)) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'URL TikTok belum diisi.\n\n' +
              '*Contoh:*\n' +
              '!tt https://vt.tiktok.com/xxxx/'
          },
          { quoted: msg }
        )

        return
      }

      const statusMsg = await sendLoadingStatus(
        sock,
        jid,
        '━ [ ▰▰▱▱▱ ] *Memproses Video TikTok...*',
        [
          {
            text: '━ [ ▰▰▰▰▰ ] *Mengunduh Video...*',
            delay: 700
          }
        ]
      )

      try {
        const result = await tiktokDownload(
          args || text
        )

        if (!result.status) {
          await sock.sendMessage(jid, {
            text:
              `*[ UNDUHAN GAGAL ]*\n${result.message || 'Gagal mengunduh TikTok.'}`,
            edit: statusMsg.key
          })

          return
        }

        const captionText =
          `━───[ *TIKTOK DOWNLOADER* ]───━\n\n` +
          `*Judul* : ${result.title || '-'}\n` +
          `*Kreator* : ${result.author || '-'}`

        await sock.sendMessage(jid, {
          text: '━ [ ▰▰▰▰▰ ] *Pengiriman Selesai!*',
          edit: statusMsg.key
        })

        await sock.sendMessage(
          jid,
          {
            video: result.buffer,
            caption: captionText,
            mimetype: 'video/mp4'
          },
          { quoted: msg }
        )
      } catch (err) {
        console.log('[TIKTOK ERROR]', err)

        await sock.sendMessage(jid, {
          text:
            `*[ ERROR ]* Gagal mengunduh TikTok.\n${err.message || ''}`,
          edit: statusMsg.key
        })
      }

      return
    }

    // ================= INSTAGRAM =================

    if (
      command === '!ig' ||
      command === '!instagram' ||
      command === '!igsnapsave' ||
      command === '!igsavvid' ||
      command === '!igindown'
    ) {
      let targetUrl = args
      let customSource = 'snapsave'

      if (command === '!igsnapsave') {
        customSource = 'snapsave'
      }

      if (command === '!igsavvid') {
        customSource = 'savevid'
      }

      if (command === '!igindown') {
        customSource = 'indown'
      }

      if (!targetUrl && text.includes('http')) {
        const matchUrl = text.match(
          /https?:\/\/[^\s]+/
        )

        if (matchUrl) {
          targetUrl = matchUrl[0]
        }
      }

      if (!targetUrl) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'URL Instagram belum diisi.\n\n' +
              '*Contoh:*\n' +
              '!ig https://www.instagram.com/reel/xxxx/'
          },
          { quoted: msg }
        )

        return
      }

      const statusMsg = await sendLoadingStatus(
        sock,
        jid,
        '━ [ ▰▱▱▱▱ ] *Menghubungkan ke Instagram...*',
        [
          {
            text: '━ [ ▰▰▰▰▰ ] *Mengambil Data Media...*',
            delay: 900
          }
        ]
      )

      try {
        setInstagramSource(customSource)

        const result =
          await scrapeInstagram(targetUrl)

        if (!result.status) {
          await sock.sendMessage(jid, {
            text:
              `*[ UNDUHAN GAGAL ]*\n` +
              `${result.error || 'Gagal mengunduh media Instagram.'}`,
            edit: statusMsg.key
          })

          return
        }

        const data = result.data || {}
        const downloads = data.downloads || []

        if (!downloads.length) {
          await sock.sendMessage(jid, {
            text:
              '*[ UNDUHAN GAGAL ]*\n' +
              'Tidak ada media ditemukan pada tautan tersebut.',
            edit: statusMsg.key
          })

          return
        }

        await sock.sendMessage(jid, {
          text:
            '━ [ ▰▰▰▰▰ ] *Mengirim Media...*',
          edit: statusMsg.key
        })

        const captionText =
          `━───[ *INSTAGRAM DOWNLOADER* ]───━\n\n` +
          `*Judul* : ${data.title || 'Instagram Media'}`

        for (let i = 0; i < downloads.length; i++) {
          const media = downloads[i]

          if (!media?.url) continue

          const isPhoto =
            media.type === 'PHOTO' ||
            /\.(jpe?g|png|webp)(\?|$)/i.test(
              media.url
            )

          if (isPhoto) {
            await sock.sendMessage(
              jid,
              {
                image: {
                  url: media.url
                },
                caption:
                  i === 0
                    ? captionText
                    : undefined
              },
              { quoted: msg }
            )
          } else {
            await sock.sendMessage(
              jid,
              {
                video: {
                  url: media.url
                },
                caption:
                  i === 0
                    ? captionText
                    : undefined,
                mimetype: 'video/mp4'
              },
              { quoted: msg }
            )
          }
        }
      } catch (err) {
        console.log('[ERROR INSTAGRAM]', err)

        await sock.sendMessage(jid, {
          text:
            '*[ ERROR ]* Terjadi kesalahan sistem saat memproses Instagram.',
          edit: statusMsg.key
        })
      }

      return
    }

    // ================= YOUTUBE =================

    if (
      command === '!yt' ||
      command === '!yt360' ||
      command === '!yt720' ||
      command === '!yt1080' ||
      command === '!play' ||
      command === '!ytmp3'
    ) {
      if (!args) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'URL YouTube belum diisi.\n\n' +
              '*Format:*\n' +
              '• !yt <url> (Video)\n' +
              '• !ytmp3 / !play <url> (Audio)'
          },
          { quoted: msg }
        )

        return
      }

      const formatType =
        command === '!ytmp3' ||
        command === '!play'
          ? 'mp3'
          : 'mp4'

      const statusMsg =
        await sendLoadingStatus(
          sock,
          jid,
          `━ [ ▰▱▱▱▱ ] *Menghubungkan YouTube (${formatType.toUpperCase()})...*`,
          [
            {
              text:
                '━ [ ▰▰▰▰▰ ] *Mengonversi & Mengunduh Media...*',
              delay: 1000
            }
          ]
        )

      try {
        const result =
          await scrapeYouTube(
            args,
            formatType
          )

        if (!result.status) {
          await sock.sendMessage(jid, {
            text:
              `*[ UNDUHAN GAGAL ]*\n${result.message || 'Gagal mengunduh YouTube.'}`,
            edit: statusMsg.key
          })

          return
        }

        const resultData =
          result.result || {}

        const title =
          resultData.title || 'YouTube'

        const downloads =
          resultData.downloads || []

        const downloadItem =
          downloads[0]

        if (
          !downloadItem ||
          !downloadItem.url
        ) {
          await sock.sendMessage(jid, {
            text:
              '*[ UNDUHAN GAGAL ]* Tautan unduhan tidak tersedia.',
            edit: statusMsg.key
          })

          return
        }

        await sock.sendMessage(jid, {
          text:
            '━ [ ▰▰▰▰▰ ] *Mengirim Media...*',
          edit: statusMsg.key
        })

        if (
          downloadItem.isLocal &&
          fs.existsSync(downloadItem.url)
        ) {
          const buffer =
            fs.readFileSync(
              downloadItem.url
            )

          try {
            fs.unlinkSync(
              downloadItem.url
            )
          } catch (_) {}

          if (formatType === 'mp3') {
            await sock.sendMessage(
              jid,
              {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: false
              },
              { quoted: msg }
            )
          } else {
            const captionText =
              `━───[ *YOUTUBE DOWNLOADER* ]───━\n\n` +
              `*Judul* : ${title}`

            await sock.sendMessage(
              jid,
              {
                video: buffer,
                caption: captionText,
                mimetype: 'video/mp4'
              },
              { quoted: msg }
            )
          }
        } else {
          if (formatType === 'mp3') {
            await sock.sendMessage(
              jid,
              {
                audio: {
                  url: downloadItem.url
                },
                mimetype: 'audio/mpeg',
                ptt: false
              },
              { quoted: msg }
            )
          } else {
            const captionText =
              `━───[ *YOUTUBE DOWNLOADER* ]───━\n\n` +
              `*Judul* : ${title}`

            await sock.sendMessage(
              jid,
              {
                video: {
                  url: downloadItem.url
                },
                caption: captionText,
                mimetype: 'video/mp4'
              },
              { quoted: msg }
            )
          }
        }
      } catch (err) {
        console.log('[ERROR YT]', err)

        await sock.sendMessage(jid, {
          text:
            '*[ ERROR ]* Terjadi kesalahan sistem saat mengunduh YouTube.',
          edit: statusMsg.key
        })
      }

      return
    }

    // ================= SPOTIFY =================

    if (
      command === '!spotify' ||
      command === '!sp'
    ) {
      if (!args) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'URL Spotify belum diisi.\n\n' +
              '*Contoh:*\n' +
              '!spotify https://open.spotify.com/track/xxxx'
          },
          { quoted: msg }
        )

        return
      }

      const statusMsg =
        await sendLoadingStatus(
          sock,
          jid,
          '━ [ ▰▱▱▱▱ ] *Menghubungkan ke Spotify...*',
          [
            {
              text:
                '━ [ ▰▰▰▱▱ ] *Mengekstrak Audio...*',
              delay: 800
            },
            {
              text:
                '━ [ ▰▰▰▰▰ ] *Mengunduh File...*',
              delay: 800
            }
          ]
        )

      try {
        const result =
          await downloadSpotify(args)

        if (!result.status) {
          await sock.sendMessage(jid, {
            text:
              `*[ UNDUHAN GAGAL ]*\n` +
              `${result.error || result.message || 'Gagal mengunduh.'}`,
            edit: statusMsg.key
          })

          return
        }

        const data =
          result.data ||
          result.result ||
          result

        const title =
          data.title || 'Spotify Song'

        const sourceUrl =
          data.sourceUrl || args

        const thumbnail =
          data.thumbnail ||
          data.cover ||
          ''

        let audioUrl = null

        if (
          Array.isArray(data.downloads) &&
          data.downloads.length
        ) {
          audioUrl =
            data.downloads[0]?.url
        } else {
          audioUrl =
            data.download ||
            data.url ||
            data.music
        }

        if (!audioUrl) {
          await sock.sendMessage(jid, {
            text:
              '*[ UNDUHAN GAGAL ]*\n' +
              'Tautan unduhan audio tidak ditemukan.',
            edit: statusMsg.key
          })

          return
        }

        const captionText =
          `━───[ *SPOTIFY DOWNLOADER* ]───━\n\n` +
          `*Judul* : ${title}\n` +
          `*Tautan* : ${sourceUrl}`

        await sock.sendMessage(jid, {
          text:
            '━ [ ▰▰▰▰▰ ] *Mengirim Audio...*',
          edit: statusMsg.key
        })

        if (thumbnail) {
          try {
            await sock.sendMessage(
              jid,
              {
                image: {
                  url: thumbnail
                },
                caption: captionText
              },
              { quoted: msg }
            )
          } catch (_) {
            await sock.sendMessage(
              jid,
              {
                text: captionText
              },
              { quoted: msg }
            )
          }
        } else {
          await sock.sendMessage(
            jid,
            {
              text: captionText
            },
            { quoted: msg }
          )
        }

        await sock.sendMessage(
          jid,
          {
            audio: {
              url: audioUrl
            },
            mimetype: 'audio/mpeg',
            ptt: false
          },
          { quoted: msg }
        )
      } catch (err) {
        console.log('[ERROR SPOTIFY]', err)

        await sock.sendMessage(jid, {
          text:
            '*[ ERROR ]* Terjadi kesalahan sistem pada Spotify.',
          edit: statusMsg.key
        })
      }

      return
    }

    // ================= STICKER =================

    if (
      command === '!s' ||
      command === '!sticker' ||
      command === '!stiker'
    ) {
      const m =
        unwrapMessage(msg.message)

      const quoted =
        getQuotedMessage(msg)

      const imageMessage =
        m?.imageMessage ||
        quoted?.imageMessage

      if (!imageMessage) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Kirim atau balas gambar dengan menyertakan perintah *!s*'
          },
          { quoted: msg }
        )

        return
      }

      try {
        const buffer =
          await downloadMedia(
            imageMessage,
            'image'
          )

        const sticker =
          await makeSticker(
            buffer,
            args
          )

        await sock.sendMessage(
          jid,
          {
            sticker
          },
          { quoted: msg }
        )
      } catch (err) {
        console.log(
          '[STICKER ERROR]',
          err.message
        )

        await sock.sendMessage(
          jid,
          {
            text:
              `*[ GAGAL ]* Tidak bisa membuat stiker.\n` +
              `${
                err.message?.includes('Font')
                  ? 'Font sistem tidak ditemukan.'
                  : err.message
              }`
          },
          { quoted: msg }
        )
      }

      return
    }

    // ================= TEXT STICKER =================

    if (
      command === '!ts' ||
      command === '!textsticker'
    ) {
      if (!args) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Sertakan teks untuk stiker.\n\n' +
              '*Contoh:* !ts Halo Dunia'
          },
          { quoted: msg }
        )

        return
      }

      try {
        const sticker =
          await makeTextSticker(args)

        await sock.sendMessage(
          jid,
          {
            sticker
          },
          { quoted: msg }
        )
      } catch (err) {
        console.log(
          '[TEXT STICKER ERROR]',
          err.message
        )

        await sock.sendMessage(
          jid,
          {
            text:
              `*[ GAGAL ]* ${
                err.message?.includes('Font')
                  ? 'Font sistem tidak ditemukan.'
                  : err.message
              }`
          },
          { quoted: msg }
        )
      }

      return
    }

    // ================= STICKER TO IMAGE =================

    if (command === '!toimg') {
      const quoted =
        getQuotedMessage(msg)

      if (!quoted?.stickerMessage) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Balas stiker dengan perintah *!toimg*'
          },
          { quoted: msg }
        )

        return
      }

      try {
        const buffer =
          await downloadMedia(
            quoted.stickerMessage,
            'sticker'
          )

        const image =
          await stickerToImage(buffer)

        await sock.sendMessage(
          jid,
          {
            image,
            caption:
              '*Konversi Stiker → Gambar Berhasil!*'
          },
          { quoted: msg }
        )
      } catch (err) {
        await sock.sendMessage(
          jid,
          {
            text:
              `*[ GAGAL ]* ${err.message}`
          },
          { quoted: msg }
        )
      }

      return
    }

    // ================= READ VIEW ONCE =================

    if (
      command === '!rvo' ||
      command === '!readviewonce'
    ) {
      const quoted =
        getQuotedMessage(msg)

      if (!quoted) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Balas (reply) pesan foto/video *View Once* dengan perintah *!rvo*'
          },
          { quoted: msg }
        )

        return
      }

      const isViewOnce =
        quoted.imageMessage?.viewOnce ||
        quoted.videoMessage?.viewOnce ||
        quoted.viewOnceMessageV2

      if (!isViewOnce) {
        const innerMsg =
          unwrapMessage(quoted)

        const isVOAlt =
          innerMsg?.imageMessage?.viewOnce ||
          innerMsg?.videoMessage?.viewOnce

        if (!isVOAlt) {
          await sock.sendMessage(
            jid,
            {
              text:
                '*[ PERINTAH GAGAL ]*\n' +
                'Pesan yang kamu balas bukan merupakan pesan *View Once* (sekali lihat)!'
            },
            { quoted: msg }
          )

          return
        }
      }

      try {
        const inner =
          unwrapMessage(quoted)

        const targetMedia =
          quoted.imageMessage ||
          quoted.videoMessage ||
          inner?.imageMessage ||
          inner?.videoMessage

        if (!targetMedia) {
          throw new Error(
            'Media View Once tidak ditemukan.'
          )
        }

        const mediaType =
          targetMedia.mimetype?.includes('video')
            ? 'video'
            : 'image'

        const buffer =
          await downloadMedia(
            targetMedia,
            mediaType
          )

        const captionText =
          targetMedia.caption
            ? `*RVO - View Once Opened*\n\n${targetMedia.caption}`
            : '*RVO - View Once Opened*'

        if (mediaType === 'video') {
          await sock.sendMessage(
            jid,
            {
              video: buffer,
              caption: captionText,
              mimetype: 'video/mp4'
            },
            { quoted: msg }
          )
        } else {
          await sock.sendMessage(
            jid,
            {
              image: buffer,
              caption: captionText
            },
            { quoted: msg }
          )
        }
      } catch (err) {
        console.log(
          '[RVO ERROR]',
          err
        )

        await sock.sendMessage(
          jid,
          {
            text:
              `*[ GAGAL ]* Tidak dapat membuka media View Once: ${err.message}`
          },
          { quoted: msg }
        )
      }

      return
    }

    // ================= OWNER =================

    if (command === '!owner') {
      const info =
        `━───[ *INFORMASI PEMILIK* ]───━\n\n` +
        `• *Nama Bot* : ${BOT_NAME}\n` +
        `• *Pemilik* : ${OWNER}\n` +
        `• *Dibuat Pada* : ${CREATED_DATE}\n` +
        `• *Waktu Aktif Bot* : ${getRuntime()}\n\n` +
        `Terima kasih sudah memakai ${BOT_NAME}!`

      await sock.sendMessage(
        jid,
        {
          text: info.trim()
        },
        { quoted: msg }
      )

      return
    }

    // ================= PING =================

    if (command === '!ping') {
      const start = Date.now()

      const sent =
        await sock.sendMessage(
          jid,
          {
            text:
              '━ [ ▰▱▱▱▱ ] *Menghitung Ping...*'
          }
        )

      const diff =
        Date.now() - start

      await sock.sendMessage(
        jid,
        {
          text:
            `*PONG!* 🏓\n` +
            `Respon Server: *${diff} ms*\n` +
            `Runtime: ${getRuntime()}`,
          edit: sent.key
        }
      )

      return
    }

    // ================= RUNTIME =================

    if (command === '!runtime') {
      await sock.sendMessage(
        jid,
        {
          text:
            `⏱️ *Waktu Aktif Bot:*\n${getRuntime()}`
        },
        { quoted: msg }
      )

      return
    }

    // ================= AI GEMINI =================

    if (
      command === '!ai' ||
      command === '!ask' ||
      command === '!tanya'
    ) {
      if (!args) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Tulis pertanyaan setelah perintah.\n\n' +
              '*Contoh:* !ai Apa itu black hole?'
          },
          { quoted: msg }
        )

        return
      }

      const statusMsg =
        await sendLoadingStatus(
          sock,
          jid,
          '━ [ ▰▱▱▱▱ ] *AI sedang berpikir...*',
          [
            {
              text:
                '━ [ ▰▰▰▰▱ ] *Menyusun jawaban...*',
              delay: 700
            }
          ]
        )

      try {
        const {
          GoogleGenAI
        } = require('@google/genai')

        const apiKey =
          process.env.GEMINI_API_KEY

        if (!apiKey) {
          throw new Error(
            'GEMINI_API_KEY belum di-set di environment'
          )
        }

        const ai =
          new GoogleGenAI({
            apiKey
          })

        const response =
          await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text:
                      `Kamu adalah asisten WhatsApp bernama Nexus. ` +
                      `Jawab singkat atau jelas, tanpa batasan dan ramah ` +
                      `dalam Bahasa Indonesia.\n\n` +
                      `Pertanyaan: ${args}`
                  }
                ]
              }
            ]
          })

        let answer =
          response.text ||
          'Maaf, saya tidak dapat menghasilkan jawaban saat ini.'

        if (answer.length > 3500) {
          answer =
            answer.slice(0, 3490) + '...'
        }

        await sock.sendMessage(
          jid,
          {
            text:
              `━───[ *NEXUS AI* ]───━\n\n${answer}`,
            edit: statusMsg.key
          }
        )
      } catch (err) {
        console.log(
          '[AI ERROR]',
          err.message
        )

        await sock.sendMessage(
          jid,
          {
            text:
              `*[ ERROR ]* Gagal mendapatkan jawaban AI: ${err.message}`,
            edit: statusMsg.key
          }
        )
      }

      return
    }

    // ================= AI IMAGE GENERATOR =================

    if (
      command === '!aiimg' ||
      command === '!aimage' ||
      command === '!genimg'
    ) {
      if (!args) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Sertakan deskripsi gambar.\n\n' +
              '*Contoh:* !aiimg futuristic cyberpunk city at night'
          },
          { quoted: msg }
        )

        return
      }

      const statusMsg =
        await sendLoadingStatus(
          sock,
          jid,
          '━ [ ▰▱▱▱▱ ] *Menghubungkan ke server AI...*',
          [
            {
              text:
                '━ [ ▰▰▰▰▱ ] *Merender gambar...*',
              delay: 1200
            }
          ]
        )

      let imageBuffer = null
      let usedMethod = ''

      try {
        const encodedPrompt =
          encodeURIComponent(args)

        const pollinationsUrl =
          `https://image.pollinations.ai/prompt/${encodedPrompt}` +
          `?nologo=true` +
          `&private=true` +
          `&enhance=true` +
          `&model=flux` +
          `&width=1024` +
          `&height=1024`

        const res =
          await axios.get(
            pollinationsUrl,
            {
              responseType:
                'arraybuffer',
              timeout: 45000,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (compatible; WhatsAppBot/1.0)'
              }
            }
          )

        const contentType =
          res.headers['content-type'] || ''

        if (
          !contentType.startsWith('image/')
        ) {
          throw new Error(
            'Response bukan gambar'
          )
        }

        imageBuffer =
          Buffer.from(res.data)

        usedMethod =
          'Pollinations AI (Flux)'
      } catch (pollErr) {
        console.log(
          '[POLLINATIONS GAGAL]',
          pollErr.message
        )
      }

      if (!imageBuffer) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ GAGAL GENERATE GAMBAR ]*\n\n' +
              'Server sedang sibuk. Coba lagi dalam beberapa saat.',
            edit: statusMsg.key
          }
        )

        return
      }

      await sock.sendMessage(
        jid,
        {
          text:
            '━ [ ▰▰▰▰▰ ] *Mengirim hasil gambar...*',
          edit: statusMsg.key
        }
      )

      const captionText =
        `━───[ *AI IMAGE GENERATOR* ]───━\n\n` +
        `*Server* : ${usedMethod}\n` +
        `*Prompt* : ${args}`

      await sock.sendMessage(
        jid,
        {
          image: imageBuffer,
          caption: captionText
        },
        { quoted: msg }
      )

      return
    }

    // ================= AI IMAGE EDITOR =================

    if (
      command === '!aiedit' ||
      command === '!editimg' ||
      command === '!img2img'
    ) {
      const quoted =
        msg.message?.extendedTextMessage
          ?.contextInfo
          ?.quotedMessage

      const isQuotedImage =
        quoted?.imageMessage ||
        quoted?.viewOnceMessageV2
          ?.message?.imageMessage ||
        quoted?.viewOnceMessage
          ?.message?.imageMessage

      if (!isQuotedImage) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Reply ke gambar yang mau diedit, lalu ketik perintah.\n\n' +
              '*Contoh:*\n' +
              'Reply foto → `!aiedit ubah background menjadi malam`'
          },
          { quoted: msg }
        )

        return
      }

      if (!args) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Sertakan deskripsi perubahan.\n\n' +
              '*Contoh:* `!aiedit ubah background menjadi malam`'
          },
          { quoted: msg }
        )

        return
      }

      const statusMsg =
        await sendLoadingStatus(
          sock,
          jid,
          '━ [ ▰▱▱▱▱ ] *Mengambil gambar...*',
          [
            {
              text:
                '━ [ ▰▰▰▰▱ ] *Mengupload gambar...*',
              delay: 1800
            },
            {
              text:
                '━ [ ▰▰▰▰▱ ] *Sedang mengedit dengan fal.ai...*',
              delay: 2500
            }
          ]
        )

      try {
        const contextInfo =
          msg.message
            ?.extendedTextMessage
            ?.contextInfo

        const quotedMsg = {
          key: {
            remoteJid: jid,
            id: contextInfo?.stanzaId,
            fromMe: false,
            participant:
              contextInfo?.participant
          },
          message: quoted
        }

        const imageBuffer =
          await downloadMediaMessage(
            quotedMsg,
            'buffer',
            {},
            {
              logger: console,
              reuploadRequest:
                sock.updateMediaMessage
            }
          )

        const imageBlob =
          new Blob(
            [imageBuffer],
            {
              type: 'image/jpeg'
            }
          )

        const falKey =
          process.env.FAL_KEY

        if (!falKey) {
          throw new Error(
            'FAL_KEY belum di-set di environment'
          )
        }

        fal.config({
          credentials: falKey
        })

        const uploadedUrl =
          await fal.storage.upload(
            imageBlob
          )

        const result =
          await fal.subscribe(
            'fal-ai/flux-pro/kontext',
            {
              input: {
                prompt: args,
                image_url: uploadedUrl
              },
              logs: false
            }
          )

        const resultUrl =
          result.data?.images?.[0]?.url ||
          result.images?.[0]?.url

        if (!resultUrl) {
          throw new Error(
            'Respon fal.ai tidak menghasilkan URL gambar.'
          )
        }

        const finalRes =
          await axios.get(
            resultUrl,
            {
              responseType:
                'arraybuffer',
              timeout: 30000
            }
          )

        const resultBuffer =
          Buffer.from(
            finalRes.data
          )

        await sock.sendMessage(
          jid,
          {
            text:
              '━ [ ▰▰▰▰▰ ] *Mengirim hasil edit...*',
            edit: statusMsg.key
          }
        )

        const caption =
          `━───[ *AI IMAGE EDITOR* ]───━\n\n` +
          `*Engine* : fal.ai (FLUX Kontext)\n` +
          `*Prompt* : ${args}`

        await sock.sendMessage(
          jid,
          {
            image: resultBuffer,
            caption
          },
          { quoted: msg }
        )
      } catch (err) {
        console.error(
          '[AIEDIT ERROR]',
          err
        )

        let errorDetails =
          err?.message ||
          'Unknown error'

        if (err?.body) {
          try {
            errorDetails =
              JSON.stringify(
                err.body,
                null,
                2
              )
          } catch (_) {}
        }

        await sock.sendMessage(
          jid,
          {
            text:
              `*[ GAGAL EDIT GAMBAR ]*\n\n` +
              `\`\`\`${errorDetails}\`\`\``,
            edit: statusMsg.key
          }
        )
      }

      return
    }

    // ================= SPAM =================

    if (
      command === '!send1000' ||
      command === '!send' ||
      command === '!spam'
    ) {
      const partsSpam =
        args.trim()
          ? args.trim().split(/\s+/)
          : []

      let count = 10
      let textToRepeat = args

      const lastArg =
        partsSpam[
          partsSpam.length - 1
        ]

      if (
        !isNaN(lastArg) &&
        partsSpam.length > 1
      ) {
        count = parseInt(
          lastArg,
          10
        )

        textToRepeat =
          partsSpam
            .slice(0, -1)
            .join(' ')
      }

      if (!textToRepeat) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Format: *!spam <teks> <jumlah>*\n\n' +
              '*Contoh:* !spam maaf 20'
          },
          { quoted: msg }
        )

        return
      }

      if (count > 100) count = 100
      if (count < 1) count = 1

      let finalResult = ''

      for (
        let i = 1;
        i <= count;
        i++
      ) {
        finalResult +=
          `${i}. ${textToRepeat}\n`
      }

      await sock.sendMessage(
        jid,
        {
          text: finalResult.trim()
        },
        { quoted: msg }
      )

      return
    }

    // ================= QUOTES =================

    if (
      command === '!quotes' ||
      command === '!quote' ||
      command === '!katabijak'
    ) {
      const q =
        QUOTES[
          Math.floor(
            Math.random() *
              QUOTES.length
          )
        ]

      await sock.sendMessage(
        jid,
        {
          text:
            `━───[ *QUOTE* ]───━\n\n` +
            `_"${q.text}"_\n\n` +
            `— *${q.author}*`
        },
        { quoted: msg }
      )

      return
    }

    // ================= TTS =================

    if (
      command === '!tts' ||
      command === '!say'
    ) {
      if (!args) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Tulis teks yang mau diubah jadi suara.\n\n' +
              '*Contoh:* !tts Selamat pagi semuanya'
          },
          { quoted: msg }
        )

        return
      }

      const statusMsg =
        await sendLoadingStatus(
          sock,
          jid,
          '━ [ ▰▱▱▱▱ ] *Membuat suara...*',
          []
        )

      try {
        const lang = 'id'
        const textToSpeak =
          args.slice(0, 200)

        const ttsUrl =
          `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=${lang}&client=tw-ob`

        const {
          data
        } = await axios.get(
          ttsUrl,
          {
            responseType:
              'arraybuffer',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
          }
        )

        const buffer =
          Buffer.from(data)

        await sock.sendMessage(
          jid,
          {
            audio: buffer,
            mimetype: 'audio/mpeg',
            ptt: true
          },
          { quoted: msg }
        )

        try {
          await sock.sendMessage(
            jid,
            {
              text:
                'Voice note siap!',
              edit: statusMsg.key
            }
          )
        } catch (_) {}
      } catch (err) {
        console.log(
          '[TTS ERROR]',
          err.message
        )

        await sock.sendMessage(
          jid,
          {
            text:
              '*[ GAGAL ]* Tidak bisa membuat voice note saat ini.',
            edit: statusMsg.key
          }
        )
      }

      return
    }

    // ================= TRANSLATE =================

    if (
      command === '!translate' ||
      command === '!tr'
    ) {
      if (!args) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Format: *!translate <kode_bahasa> <teks>*\n\n' +
              'Contoh:\n' +
              '• !tr en Halo dunia\n' +
              '• !tr ja Good morning'
          },
          { quoted: msg }
        )

        return
      }

      const partsTr =
        args.trim().split(/\s+/)

      let targetLang = 'id'
      let textToTranslate = args

      if (
        partsTr[0]?.length === 2 &&
        /^[a-z]{2}$/i.test(
          partsTr[0]
        )
      ) {
        targetLang =
          partsTr[0].toLowerCase()

        textToTranslate =
          partsTr
            .slice(1)
            .join(' ')
      }

      if (!textToTranslate) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]* Teks yang mau diterjemahkan kosong.'
          },
          { quoted: msg }
        )

        return
      }

      try {
        const url =
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`

        const {
          data
        } = await axios.get(
          url,
          {
            timeout: 10000
          }
        )

        let translated = ''

        if (
          Array.isArray(data) &&
          Array.isArray(data[0])
        ) {
          translated =
            data[0]
              .map(item => item?.[0] || '')
              .join('')
        }

        if (!translated) {
          await sock.sendMessage(
            jid,
            {
              text:
                '*[ GAGAL ]* Tidak bisa menerjemahkan teks tersebut.'
            },
            { quoted: msg }
          )

          return
        }

        const detected =
          data[2] || 'auto'

        await sock.sendMessage(
          jid,
          {
            text:
              `━───[ *TRANSLATE* ]───━\n\n` +
              `*Dari* : ${detected}\n` +
              `*Ke* : ${targetLang}\n\n` +
              `*Hasil:*\n` +
              `${translated}`
          },
          { quoted: msg }
        )
      } catch (err) {
        console.log(
          '[TRANSLATE ERROR]',
          err.message
        )

        await sock.sendMessage(
          jid,
          {
            text:
              '*[ ERROR ]* Gagal menerjemahkan.'
          },
          { quoted: msg }
        )
      }

      return
    }

    // ================= CUACA =================

    if (
      command === '!cuaca' ||
      command === '!weather'
    ) {
      if (!args) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Sertakan nama kota.\n\n' +
              '*Contoh:* !cuaca Jakarta'
          },
          { quoted: msg }
        )

        return
      }

      try {
        const geo =
          await axios.get(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(args)}&count=1&language=id&format=json`,
            {
              timeout: 10000
            }
          )

        if (
          !geo.data?.results?.length
        ) {
          await sock.sendMessage(
            jid,
            {
              text:
                `*[ TIDAK DITEMUKAN ]*\n` +
                `Kota "${args}" tidak ditemukan.`
            },
            { quoted: msg }
          )

          return
        }

        const place =
          geo.data.results[0]

        const {
          latitude,
          longitude,
          name,
          country,
          admin1
        } = place

        const weather =
          await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`,
            {
              timeout: 10000
            }
          )

        const cur =
          weather.data?.current

        if (!cur) {
          throw new Error(
            'Data cuaca tidak tersedia.'
          )
        }

        const code =
          cur.weather_code

        const weatherDesc = {
          0: 'Cerah',
          1: 'Sebagian cerah',
          2: 'Berawan sebagian',
          3: 'Berawan',
          45: 'Berkabut',
          48: 'Berkabut',
          51: 'Gerimis ringan',
          53: 'Gerimis',
          55: 'Gerimis lebat',
          61: 'Hujan ringan',
          63: 'Hujan',
          65: 'Hujan lebat',
          71: 'Salju ringan',
          73: 'Salju',
          75: 'Salju lebat',
          80: 'Hujan singkat',
          81: 'Hujan singkat',
          82: 'Hujan deras',
          95: 'Badai petir',
          96: 'Badai petir dengan hujan es',
          99: 'Badai petir dengan hujan es'
        }

        const desc =
          weatherDesc[code] ||
          `Kode cuaca ${code}`

        const textCuaca = `
━───[ *CUACA HARI INI* ]───━

Lokasi : ${name}${admin1 ? ', ' + admin1 : ''}${country ? ' • ' + country : ''}
Suhu : ${cur.temperature_2m}°C
Kelembapan : ${cur.relative_humidity_2m}%
Angin : ${cur.wind_speed_10m} km/j
Kondisi : ${desc}
`.trim()

        await sock.sendMessage(
          jid,
          {
            text: textCuaca
          },
          { quoted: msg }
        )
      } catch (err) {
        console.log(
          '[CUACA ERROR]',
          err.message
        )

        await sock.sendMessage(
          jid,
          {
            text:
              '*[ ERROR ]* Gagal mengambil data cuaca.'
          },
          { quoted: msg }
        )
      }

      return
    }

    // ================= SHORT URL =================

    if (
      command === '!short' ||
      command === '!shortlink' ||
      command === '!tiny'
    ) {
      if (
        !args ||
        !/^https?:\/\//i.test(
          args.trim()
        )
      ) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Berikan URL yang valid.\n\n' +
              '*Contoh:* !short https://example.com'
          },
          { quoted: msg }
        )

        return
      }

      try {
        const {
          data
        } = await axios.get(
          `https://is.gd/create.php?format=simple&url=${encodeURIComponent(args)}`,
          {
            timeout: 10000,
            responseType: 'text',
            transformResponse: [
              d => d
            ]
          }
        )

        const shortUrl =
          String(data || '').trim()

        if (
          shortUrl &&
          /^https?:\/\//i.test(
            shortUrl
          )
        ) {
          await sock.sendMessage(
            jid,
            {
              text:
                `━───[ *SHORT LINK* ]───━\n\n` +
                `*Asli:*\n` +
                `${args}\n\n` +
                `*Pendek:*\n` +
                `${shortUrl}`
            },
            { quoted: msg }
          )
        } else {
          await sock.sendMessage(
            jid,
            {
              text:
                '*[ GAGAL ]* Tidak bisa memendekkan URL tersebut.'
            },
            { quoted: msg }
          )
        }
      } catch (err) {
        console.log(
          '[SHORT ERROR]',
          err.message
        )

        await sock.sendMessage(
          jid,
          {
            text:
              '*[ ERROR ]* Gagal memendekkan link.'
          },
          { quoted: msg }
        )
      }

      return
    }

    // ================= GROUP INFO =================

    if (command === '!groupinfo') {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Perintah ini hanya dapat digunakan di dalam grup.'
          },
          { quoted: msg }
        )

        return
      }

      try {
        const metadata =
          await sock.groupMetadata(jid)

        const admins =
          metadata.participants.filter(
            p =>
              p.admin === 'admin' ||
              p.admin === 'superadmin'
          ).length

        const infoText =
          `━───[ *INFORMASI GRUP* ]───━\n\n` +
          `*Nama Grup* : ${metadata.subject}\n` +
          `*Total Anggota* : ${metadata.participants.length}\n` +
          `*Total Admin* : ${admins}\n` +
          `*Dibuat* : ${
            metadata.creation
              ? new Date(
                  metadata.creation * 1000
                ).toLocaleDateString(
                  'id-ID'
                )
              : '-'
          }`

        await sock.sendMessage(
          jid,
          {
            text: infoText
          },
          { quoted: msg }
        )
      } catch (e) {
        console.log(
          '[GROUPINFO ERROR]',
          e
        )

        await sock.sendMessage(
          jid,
          {
            text:
              '*[ ERROR ]* Gagal mengambil info grup.'
          },
          { quoted: msg }
        )
      }

      return
    }

    // ================= ADMINS =================

    if (command === '!admins') {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Perintah ini hanya dapat digunakan di dalam grup.'
          },
          { quoted: msg }
        )

        return
      }

      try {
        const metadata =
          await sock.groupMetadata(jid)

        const admins =
          metadata.participants.filter(
            p =>
              p.admin === 'admin' ||
              p.admin === 'superadmin'
          )

        let teks =
          `━───[ *DAFTAR ADMIN GRUP* ]───━\n\n`

        for (const admin of admins) {
          teks +=
            `• @${admin.id.split('@')[0]}\n`
        }

        await sock.sendMessage(
          jid,
          {
            text: teks.trim(),
            mentions:
              admins.map(a => a.id)
          },
          { quoted: msg }
        )
      } catch (e) {
        console.log(
          '[ADMINS ERROR]',
          e
        )

        await sock.sendMessage(
          jid,
          {
            text:
              '*[ ERROR ]* Gagal mengambil daftar admin.'
          },
          { quoted: msg }
        )
      }

      return
    }

    // ================= TAG ALL / HIDETAG =================

    if (
      command === '!tagall' ||
      command === '!hidetag'
    ) {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Perintah ini hanya dapat digunakan di dalam grup.'
          },
          { quoted: msg }
        )

        return
      }

      const sender =
        msg.key.participant ||
        msg.key.remoteJid

      const admin =
        await isGroupAdmin(
          sock,
          jid,
          sender
        )

      if (!admin) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Perintah ini hanya dapat digunakan oleh Admin grup.'
          },
          { quoted: msg }
        )

        return
      }

      try {
        const metadata =
          await sock.groupMetadata(jid)

        const mentions =
          metadata.participants.map(
            p => p.id
          )

        if (command === '!hidetag') {
          await sock.sendMessage(
            jid,
            {
              text:
                args ||
                '*PENGUMUMAN GRUP*',
              mentions
            }
          )

          return
        }

        let teks = args
          ? `*PENGUMUMAN:* ${args}\n\n`
          : '*PANGGILAN ANGGOTA GRUP:*\n\n'

        for (
          const p of metadata.participants
        ) {
          teks +=
            `• @${p.id.split('@')[0]}\n`
        }

        await sock.sendMessage(
          jid,
          {
            text: teks.trim(),
            mentions
          }
        )
      } catch (e) {
        console.log(
          '[TAGALL ERROR]',
          e
        )

        await sock.sendMessage(
          jid,
          {
            text:
              '*[ ERROR ]* Gagal men-tag anggota.'
          },
          { quoted: msg }
        )
      }

      return
    }

    // ================= KICK =================

    if (command === '!kick') {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Hanya bisa digunakan di grup.'
          },
          { quoted: msg }
        )

        return
      }

      const sender =
        msg.key.participant ||
        msg.key.remoteJid

      if (
        !(await isGroupAdmin(
          sock,
          jid,
          sender
        ))
      ) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Hanya Admin yang boleh menggunakan perintah ini.'
          },
          { quoted: msg }
        )

        return
      }

      if (
        !(await isBotAdmin(
          sock,
          jid
        ))
      ) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Bot harus menjadi Admin untuk mengeluarkan anggota.'
          },
          { quoted: msg }
        )

        return
      }

      const context =
        msg.message
          ?.extendedTextMessage
          ?.contextInfo

      let targetJid =
        context?.mentionedJid?.[0] ||
        context?.participant

      if (!targetJid) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Reply chat member atau mention (@) member yang mau dikeluarkan.'
          },
          { quoted: msg }
        )

        return
      }

      try {
        await sock.groupParticipantsUpdate(
          jid,
          [targetJid],
          'remove'
        )

        await sock.sendMessage(
          jid,
          {
            text:
              `*[ KICK BERHASIL ]*\n` +
              `Berhasil mengeluarkan @${targetJid.split('@')[0]}`,
            mentions: [targetJid]
          },
          { quoted: msg }
        )
      } catch (e) {
        console.log(
          '[KICK ERROR]',
          e
        )

        await sock.sendMessage(
          jid,
          {
            text:
              `*[ GAGAL ]* ${
                e.message ||
                'Tidak bisa mengeluarkan member.'
              }`
          },
          { quoted: msg }
        )
      }

      return
    }

    // ================= ADD =================

    if (command === '!add') {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Hanya bisa digunakan di grup.'
          },
          { quoted: msg }
        )

        return
      }

      const sender =
        msg.key.participant ||
        msg.key.remoteJid

      if (
        !(await isGroupAdmin(
          sock,
          jid,
          sender
        ))
      ) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Hanya Admin yang boleh menggunakan perintah ini.'
          },
          { quoted: msg }
        )

        return
      }

      if (
        !(await isBotAdmin(
          sock,
          jid
        ))
      ) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Bot harus menjadi Admin untuk menambah anggota.'
          },
          { quoted: msg }
        )

        return
      }

      if (!args) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\n' +
              'Sertakan nomor.\n\n' +
              '*Contoh:* !add 081234567890'
          },
          { quoted: msg }
        )

        return
      }

      let cleanNumber =
        args.replace(
          /[^0-9]/g,
          ''
        )

      if (
        cleanNumber.startsWith('0')
      ) {
        cleanNumber =
          '62' +
          cleanNumber.slice(1)
      }

      if (
        cleanNumber.startsWith('8')
      ) {
        cleanNumber =
          '62' +
          cleanNumber
      }

      if (
        !cleanNumber ||
        cleanNumber.length < 8
      ) {
        await sock.sendMessage(
          jid,
          {
            text:
              '*[ PERINTAH GAGAL ]*\nNomor tidak valid.'
          },
          { quoted: msg }
        )

        return
      }

      const targetJid =
        `${cleanNumber}@s.whatsapp.net`

      try {
        await sock.groupParticipantsUpdate(
          jid,
          [targetJid],
          'add'
        )

        await sock.sendMessage(
          jid,
          {
            text:
              `*[ ADD BERHASIL ]*\n` +
              `Berhasil menambahkan @${cleanNumber}`,
            mentions: [targetJid]
          },
          { quoted: msg }
        )
      } catch (e) {
        console.log(
          '[ADD ERROR]',
          e
        )

        await sock.sendMessage(
          jid,
          {
            text:
              '*[ GAGAL ]* Tidak bisa menambahkan nomor tersebut.\n' +
              'Pastikan nomor aktif di WhatsApp.'
          },
          { quoted: msg }
        )
      }

      return
    }
  } catch (error) {
    console.log(
      '[ERROR HANDLER]',
      error?.stack || error?.message || error
    )
  }
}

module.exports = {
  handleMessage
}