const { makeSticker, makeTextSticker, stickerToImage, downloadMedia } = require('../lib/sticker')
const { tiktokDownload } = require('../lib/tiktok')
const { scrapeYouTube } = require('../youtubeScraper')
const { downloadSpotify } = require('../spotifyScraper')
const fs = require('fs')

const OWNER = 'Hoidir'
const BOT_NAME = 'NEXUS BOT'
const CREATED_DATE = '7 September 2026'

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
  const metadata = await sock.groupMetadata(jid)
  const participant = metadata.participants.find(p => p.id === sender)
  return participant?.admin === 'admin' || participant?.admin === 'superadmin'
}

async function isBotAdmin(sock, jid) {
  const metadata = await sock.groupMetadata(jid)
  const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
  const participant = metadata.participants.find(p => p.id === botId)
  return participant?.admin === 'admin' || participant?.admin === 'superadmin'
}

async function sendLoadingStatus(sock, jid, initialText, steps = []) {
  const sent = await sock.sendMessage(jid, { text: initialText })
  for (const step of steps) {
    await new Promise(res => setTimeout(res, step.delay || 700))
    await sock.sendMessage(jid, { text: step.text, edit: sent.key })
  }
  return sent
}

async function handleMessage(sock, msg, startTime) {
  try {
    if (!msg?.message) return
    const jid = msg.key.remoteJid
    if (jid === 'status@broadcast') return

    const text = getText(msg)
    if (!text) return

    const parts = text.trim().split(/\s+/)
    const command = parts[0].toLowerCase()
    const args = parts.slice(1).join(' ')

    const getRuntime = () => {
      const total = Math.floor((Date.now() - (startTime || Date.now())) / 1000)
      const hours = Math.floor(total / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      return `${hours}j ${minutes}m ${total % 60}d`
    }

    // ================= MAIN MENU =================
    if (command === '!menu') {
      const menuText = `
━───[ *${BOT_NAME}* ]───━

┌─ *[ STICKER TOOLS ]*
│ • *!s* : Ubah Gambar ke Stiker
│ • *!ts <teks>* : Ubah Teks ke Stiker
│ • *!toimg* : Ubah Stiker ke Gambar
└───────────────────

┌─ *[ DOWNLOADER ]*
│ • *!tt <url>* : Unduh Video TikTok
│ • *!yt <url>* : Unduh YouTube (360p)
│ • *!yt720 <url>* : Unduh YouTube (720p)
│ • *!yt1080 <url>* : Unduh YouTube (1080p)
│ • *!ytmp3 <url>* : Unduh Audio YouTube
│ • *!spotify <url>* : Unduh Audio Spotify
└───────────────────

┌─ *[ SYSTEM & TOOLS ]*
│ • *!ping* : Cek Kecepatan Respon
│ • *!runtime* : Cek Waktu Aktif Bot
│ • *!owner* : Informasi Pemilik
│ • *!help* : Panduan Cara Penggunaan
└───────────────────

┌─ *[ GRUP ]*
│ • *!groupinfo* : Info Detail Grup
│ • *!admins* : Tampilkan Admin Grup
│ • *!tagall* : Panggil Semua Anggota
│ • *!hidetag* : Kirim Pengumuman
│ • *!kick* : Keluarkan Anggota
│ • *!add* : Tambahkan Anggota
└───────────────────

━──────────────────━`
      await sock.sendMessage(jid, { text: menuText.trim() })
      return
    }

    // ================= HELP & PANDUAN =================
    if (command === '!help') {
      const helpText = `
━───[ *PANDUAN & BANTUAN BOT* ]───━

Halo! Bingung cara pakai fiturnya? Berikut panduan lengkapnya:

🖼️ *PANDUAN STIKER*
• *!s* : Kirim gambar lalu beri keterangan *!s*, atau balas/reply gambar yang sudah dikirim dengan ketik *!s*.
• *!ts <teks>* : Ketik *!ts Halo Bro* untuk buat stiker teks.
• *!toimg* : Balas/reply sebuah stiker lalu ketik *!toimg* untuk ubah ke gambar biasa.

📥 *PANDUAN DOWNLOADER*
• *TikTok* : Ketik *!tt https://vt.tiktok.com/xxx*
• *YouTube* : Ketik *!yt <link>* (360p), *!yt720 <link>*, atau *!ytmp3 <link>* untuk musik.
• *Spotify* : Ketik *!spotify https://open.spotify.com/track/xxx*

👥 *PANDUAN GRUP (Khusus Admin)*
• *!hidetag <pesan>* : Kirim pesan pengumuman tanpa kelihatan tag-nya.
• *!tagall* : Panggil seluruh member di grup.
• *!kick* : Balas chat member yang mau dikeluarkan lalu ketik *!kick*.
• *!add <nomor>* : Ketik *!add 081234567890* untuk tambah member baru.

ℹ️ *LAINNYA*
• Ketik *!menu* untuk lihat ringkasan fitur.
• Ketik *!owner* untuk kontak pembuat bot.
━─────────────────────────━`
      await sock.sendMessage(jid, { text: helpText.trim() })
      return
    }

    // ================= TIKTOK DOWNLOADER =================
    if (command === '!tt' || command === '!tiktok') {
      if (!args) {
        await sock.sendMessage(jid, { 
          text: `*[ PERINTAH GAGAL ]*\nURL TikTok belum diisi.\n\n*Contoh:*\n!tiktok https://vt.tiktok.com/xxxx/` 
        })
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
      })
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
          text: `*[ PERINTAH GAGAL ]*\nURL YouTube belum diisi.\n\n*Format Perintah:*\n• !yt <url> (360p)\n• !yt720 <url> (720p)\n• !yt1080 <url> (1080p)\n• !ytmp3 <url> (Audio)` 
        })
        return
      }

      let mode = '360p'
      if (command === '!yt720') mode = '720p'
      if (command === '!yt1080') mode = '1080p'
      if (command === '!ytmp3' || command === '!play') mode = 'audio'

      const statusMsg = await sendLoadingStatus(sock, jid, `━ [ ▰▱▱▱▱ ] *Menghubungkan YouTube (${mode})...*`, [
        { text: `━ [ ▰▰▰▰▰ ] *Mengunduh Media (${mode})...*`, delay: 900 }
      ])

      try {
        const result = await scrapeYouTube(args, mode)

        if (!result.status) {
          await sock.sendMessage(jid, { text: `*[ UNDUHAN GAGAL ]*\n${result.error}`, edit: statusMsg.key })
          return
        }

        const { title, filePath } = result.data

        if (!fs.existsSync(filePath)) {
          await sock.sendMessage(jid, { text: '*[ UNDUHAN GAGAL ]*\nBerkas hasil unduhan tidak ditemukan.', edit: statusMsg.key })
          return
        }

        await sock.sendMessage(jid, { text: '━ [ ▰▰▰▰▰ ] *Mengirim Media...*', edit: statusMsg.key })

        if (mode === 'audio') {
          await sock.sendMessage(jid, {
            audio: fs.readFileSync(filePath),
            mimetype: 'audio/mp4',
            ptt: false
          }, { quoted: msg })
        } else {
          const captionText = `━───[ *YOUTUBE DOWNLOADER* ]───━\n\n*Judul* : ${title}\n*Kualitas* : ${mode}`

          await sock.sendMessage(jid, {
            video: fs.readFileSync(filePath),
            caption: captionText,
            mimetype: 'video/mp4'
          }, { quoted: msg })
        }

        fs.unlinkSync(filePath)

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
        })
        return
      }

      const statusMsg = await sendLoadingStatus(sock, jid, '━ [ ▰▱▱▱▱ ] *Menghubungkan ke Spotify...*', [
        { text: '━ [ ▰▰▰▱▱ ] *Mengekstrak Audio...*', delay: 800 },
        { text: '━ [ ▰▰▰▰▰ ] *Mengunduh File...*', delay: 800 }
      ])

      try {
        const result = await downloadSpotify(args)

        if (!result.status) {
          await sock.sendMessage(jid, { text: `*[ UNDUHAN GAGAL ]*\n${result.error || result.message}`, edit: statusMsg.key })
          return
        }

        const data = result.data
        const audioDownload = data.downloads.find(d => !d.url.includes('spotidown_resolve:') && !d.url.includes('soundloaders_resolve:')) || data.downloads[0]

        if (!audioDownload || !audioDownload.url) {
          await sock.sendMessage(jid, { text: '*[ UNDUHAN GAGAL ]*\nTautan unduhan audio tidak ditemukan.', edit: statusMsg.key })
          return
        }

        const captionText = `━───[ *SPOTIFY DOWNLOADER* ]───━\n\n*Judul* : ${data.title}\n*Tautan* : ${data.sourceUrl}`

        await sock.sendMessage(jid, { text: '━ [ ▰▰▰▰▰ ] *Mengirim Audio...*', edit: statusMsg.key })

        if (data.thumbnail) {
          await sock.sendMessage(jid, {
            image: { url: data.thumbnail },
            caption: captionText
          }, { quoted: msg })
        }

        await sock.sendMessage(jid, {
          audio: { url: audioDownload.url },
          mimetype: 'audio/mp4',
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
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nKirim atau balas gambar dengan menyertakan perintah !s' })
        return
      }

      const buffer = await downloadMedia(imageMessage, 'image')
      const sticker = await makeSticker(buffer, args)
      await sock.sendMessage(jid, { sticker })
      return
    }

    if (command === '!ts' || command === '!textsticker') {
      if (!args) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nSertakan teks untuk stiker.\n\n*Contoh:* !ts Halo Dunia' })
        return
      }
      const sticker = await makeTextSticker(args)
      await sock.sendMessage(jid, { sticker })
      return
    }

    if (command === '!toimg') {
      const quoted = getQuotedMessage(msg)
      if (!quoted?.stickerMessage) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nBalas stiker dengan perintah !toimg' })
        return
      }
      const buffer = await downloadMedia(quoted.stickerMessage, 'sticker')
      const image = await stickerToImage(buffer)
      await sock.sendMessage(jid, { image, caption: '*Konversi Stiker ke Gambar Berhasil!*' })
      return
    }

    // ================= SYSTEM COMMANDS =================
    if (command === '!owner') {
      const info = `━───[ *INFORMASI PEMILIK* ]───━\n\n• *Nama Bot* : ${BOT_NAME}\n• *Pemilik* : ${OWNER}\n• *Dibuat Pada* : ${CREATED_DATE}\n• *Waktu Aktif Bot* : ${getRuntime()}`
      await sock.sendMessage(jid, { text: info.trim() })
      return
    }

    if (command === '!ping') {
      const start = Date.now()
      const sent = await sock.sendMessage(jid, { text: '━ [ ▰▱▱▱▱ ] *Menghitung Ping...*' })
      const diff = Date.now() - start
      await sock.sendMessage(jid, { text: `*PONG!* Respon Server: *${diff} ms*`, edit: sent.key })
      return
    }

    if (command === '!runtime') {
      await sock.sendMessage(jid, { text: `*Waktu Aktif Bot:*\n${getRuntime()}` })
      return
    }

    // ================= GROUP COMMANDS =================
    if (command === '!groupinfo') {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nPerintah ini hanya dapat digunakan di dalam grup.' })
        return
      }
      const metadata = await sock.groupMetadata(jid)
      const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length
      
      const infoText = `━───[ *INFORMASI GRUP* ]───━\n\n*Nama Grup* : ${metadata.subject}\n*Total Anggota* : ${metadata.participants.length}\n*Total Admin* : ${admins}`
      
      await sock.sendMessage(jid, { text: infoText })
      return
    }

    if (command === '!admins') {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nPerintah ini hanya dapat digunakan di dalam grup.' })
        return
      }
      const metadata = await sock.groupMetadata(jid)
      const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
      
      let teks = `━───[ *DAFTAR ADMIN GRUP* ]───━\n\n`
      for (const admin of admins) {
        teks += `• @${admin.id.split('@')[0]}\n`
      }
      
      await sock.sendMessage(jid, { text: teks.trim(), mentions: admins.map(a => a.id) })
      return
    }

    if (command === '!tagall' || command === '!hidetag') {
      if (!jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nPerintah ini hanya dapat digunakan di dalam grup.' })
        return
      }
      const sender = msg.key.participant || msg.key.remoteJid
      const admin = await isGroupAdmin(sock, jid, sender)
      if (!admin) {
        await sock.sendMessage(jid, { text: '*[ PERINTAH GAGAL ]*\nPerintah ini hanya dapat digunakan oleh Admin grup.' })
        return
      }

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
      return
    }

    if (command === '!kick') {
      if (!jid.endsWith('@g.us')) return
      const sender = msg.key.participant || msg.key.remoteJid
      if (!(await isGroupAdmin(sock, jid, sender))) return
      if (!(await isBotAdmin(sock, jid))) return

      let targetJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant
      if (!targetJid) return

      await sock.groupParticipantsUpdate(jid, [targetJid], 'remove')
      await sock.sendMessage(jid, { text: `*[ KICK BERHASIL ]*\nBerhasil mengeluarkan @${targetJid.split('@')[0]}`, mentions: [targetJid] })
      return
    }

    if (command === '!add') {
      if (!jid.endsWith('@g.us')) return
      const sender = msg.key.participant || msg.key.remoteJid
      if (!(await isGroupAdmin(sock, jid, sender))) return
      if (!(await isBotAdmin(sock, jid))) return

      if (!args) return
      let cleanNumber = args.replace(/[^0-9]/g, '')
      if (cleanNumber.startsWith('0')) cleanNumber = '62' + cleanNumber.slice(1)
      const targetJid = `${cleanNumber}@s.whatsapp.net`

      await sock.groupParticipantsUpdate(jid, [targetJid], 'add')
      await sock.sendMessage(jid, { text: `*[ ADD BERHASIL ]*\nBerhasil menambahkan @${cleanNumber}`, mentions: [targetJid] })
      return
    }

  } catch (error) {
    console.log('[ERROR HANDLER]', error.message)
  }
}

module.exports = { handleMessage }
