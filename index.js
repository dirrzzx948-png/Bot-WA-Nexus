require('dotenv').config()
const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const readline = require('readline')
const { handleMessage } = require('./handlers/message')

const BOT_NAME = 'NEXUS BOT'
const startTime = Date.now()

// Fungsi untuk membaca input dari Termux
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function startBot() {
  console.log(`🚀 Memulai ${BOT_NAME}...`)

  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 15000,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false
  })

  // Fitur Pairing Code jika belum login
  if (!sock.authState.creds.registered) {
    const phoneNumber = await question('📱 Masukkan nomor WhatsApp bot (contoh: 628xxx): ')
    const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '')
    
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(cleanedNumber)
        console.log(`\n🔑 Kode Pairing Kamu: \x1b[32m${code}\x1b[0m\n`)
        console.log('Buka WhatsApp → Perangkat Tertaut → Tautkan dengan nomor telepon → masukkan kode di atas.')
      } catch (err) {
        console.log('❌ Gagal mendapatkan kode pairing:', err.message)
      }
    }, 3000)
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'connecting') {
      console.log('📡 Menghubungkan ke WhatsApp...')
    }

    if (connection === 'open') {
      console.log(`✅ ${BOT_NAME} TERHUBUNG!`)
      console.log(`⏱️  Runtime mulai dihitung. Ketik !menu di chat untuk melihat fitur.`)
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      console.log('❌ Koneksi tertutup dengan kode status:', code)

      if (code !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnect dalam 5 detik...')
        setTimeout(startBot, 5000)
      } else {
        console.log('⚠️ Sesi logged out. Hapus folder session dan jalankan ulang.')
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const msg = messages[0]
    if (!msg) return
    try {
      await handleMessage(sock, msg, startTime)
    } catch (err) {
      console.log('[messages.upsert error]', err?.message || err)
    }
  })
}

startBot().catch(err => {
  console.error('Fatal error starting bot:', err)
  process.exit(1)
})
