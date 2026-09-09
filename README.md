<div align="center">NEXUS BOT

WhatsApp Bot berbasis Node.js & Baileys

Bot WhatsApp dengan fitur sticker maker, media downloader, group management, dan system utilities.



</div><br>Tentang

NEXUS BOT adalah WhatsApp Bot berbasis Node.js dan Baileys yang dirancang untuk berjalan pada Android maupun Windows.

Bot menggunakan WhatsApp Pairing Code untuk proses autentikasi, sehingga pengguna tidak perlu melakukan pemindaian QR secara manual.

Platform yang didukung:

- Android — Termux
- Windows — Node.js

---

Fitur

Sticker

Command| Keterangan
"!s"| Mengubah gambar menjadi stiker
"!ts <teks>"| Membuat stiker dari teks
"!toimg"| Mengubah stiker menjadi gambar

Media Downloader

Command| Keterangan
"!tt <url>"| Download video TikTok
"!yt <url>"| Download YouTube hingga 360p
"!yt720 <url>"| Download YouTube hingga 720p
"!yt1080 <url>"| Download YouTube hingga 1080p
"!ytmp3 <url>"| Download audio YouTube
"!spotify <url>"| Download audio dari URL Spotify

«Ketersediaan download bergantung pada sumber media, perubahan platform, koneksi internet, dan layanan pihak ketiga.»

Group Management

Command| Keterangan
"!groupinfo"| Menampilkan informasi grup
"!admins"| Menampilkan daftar admin
"!tagall"| Mention seluruh anggota
"!hidetag <pesan>"| Mention seluruh anggota tanpa menampilkan daftar mention
"!kick"| Mengeluarkan anggota dari grup
"!add <nomor>"| Menambahkan anggota menggunakan nomor internasional

«Command yang membutuhkan hak administrator hanya dapat digunakan apabila bot memiliki izin admin.»

Utilities

Command| Keterangan
"!menu"| Menampilkan menu command
"!help"| Menampilkan bantuan
"!ping"| Mengecek response time bot
"!runtime"| Menampilkan uptime bot
"!owner"| Menampilkan informasi owner

---

Requirements

Pastikan perangkat sudah memiliki:

- Node.js
- npm
- Git
- Koneksi internet
- Nomor WhatsApp khusus untuk bot

Dependencies

Baileys
Axios
Express
JSDOM
node-fetch
Pino

---

Installation

Android — Termux

1. Update package

Buka Termux lalu jalankan:

pkg update && pkg upgrade

2. Install Git & Node.js

pkg install git nodejs

Cek instalasi:

node -v
npm -v
git --version

3. Clone repository

git clone https://github.com/dirrzzx948-png/Bot-WA-Nexus.git

Masuk ke folder project:

cd Bot-WA-Nexus

4. Install dependencies

npm install

5. Jalankan bot

npm start

Jika berhasil, bot akan menjalankan:

node index.js

---

Windows

1. Install Node.js

Install Node.js pada komputer Windows.

Kemudian buka:

- Command Prompt
- PowerShell
- Windows Terminal

Cek instalasi:

node -v
npm -v

2. Install Git

git --version

3. Clone repository

git clone https://github.com/dirrzzx948-png/Bot-WA-Nexus.git

Masuk ke folder project:

cd Bot-WA-Nexus

4. Install dependencies

npm install

5. Jalankan bot

npm start

---

WhatsApp Pairing

Saat bot pertama kali dijalankan dan belum memiliki session, terminal akan meminta nomor WhatsApp.

Gunakan format nomor internasional:

628123456789

Jangan menggunakan:

08123456789

Setelah nomor dimasukkan, bot akan menampilkan Pairing Code.

Pada WhatsApp:

WhatsApp
→ Perangkat Tertaut
→ Tautkan Perangkat
→ Tautkan dengan nomor telepon / kode

Masukkan Pairing Code yang ditampilkan pada terminal.

Setelah berhasil, session akan tersimpan di:

session/

NEXUS BOT menggunakan:

useMultiFileAuthState('./session')

Penting

Jangan membagikan folder "session/".

Folder tersebut berisi data autentikasi WhatsApp. Jangan mengunggahnya ke repository publik atau memberikannya kepada orang lain.

---

Usage

Setelah bot berhasil terhubung, command dapat digunakan melalui chat WhatsApp.

Sticker

Image → Sticker

Kirim gambar dengan caption:

!s

Atau reply gambar:

!s

Text → Sticker

!ts Halo dunia

Sticker → Image

Reply sebuah sticker:

!toimg

---

Media Downloader

TikTok

!tt https://contoh-url-tiktok

YouTube

!yt https://youtube.com/watch?v=xxxx

YouTube 720p

!yt720 https://youtube.com/watch?v=xxxx

YouTube 1080p

!yt1080 https://youtube.com/watch?v=xxxx

YouTube Audio

!ytmp3 https://youtube.com/watch?v=xxxx

Spotify

!spotify https://open.spotify.com/track/xxxx

«Gunakan fitur download hanya untuk konten yang memang boleh Anda unduh dan gunakan. Jangan gunakan bot untuk melanggar hak cipta atau ketentuan layanan platform.»

---

Group Management

Command berikut digunakan di dalam grup WhatsApp.

Group Information

!groupinfo

Admin List

!admins

Mention All

!tagall

Hidden Mention

!hidetag Pengumuman penting

Kick Member

Reply pesan anggota yang ingin dikeluarkan:

!kick

Bot harus memiliki izin administrator.

Add Member

!add 628123456789

Gunakan nomor internasional tanpa tanda "+".

---

System Commands

Command| Description
"!menu"| Daftar command
"!help"| Bantuan penggunaan
"!ping"| Response time
"!runtime"| Bot uptime
"!owner"| Informasi owner

---

Running Again

Setelah session berhasil dibuat, pairing tidak perlu dilakukan kembali selama session masih valid.

Android

cd Bot-WA-Nexus
npm start

Windows

cd Bot-WA-Nexus
npm start

Pastikan folder "session/" tidak dihapus.

---

Reset Session

Jika WhatsApp logout atau session mengalami masalah, hapus session kemudian jalankan bot kembali.

Android

rm -rf session
npm start

Windows PowerShell

Remove-Item -Recurse -Force session
npm start

Setelah itu bot akan meminta Pairing Code kembali.

---

Update

Masuk ke folder project:

cd Bot-WA-Nexus

Update repository:

git pull

Update dependencies:

npm install

Jalankan kembali:

npm start

---

Troubleshooting

"node: command not found"

Android:

pkg install nodejs

Windows:

Install Node.js kemudian buka terminal baru.

"npm install" gagal

Coba:

npm cache clean --force
npm install

Pastikan koneksi internet stabil.

Bot tidak terhubung

Periksa:

- Internet aktif
- Nomor WhatsApp masih dapat digunakan
- Perangkat bot masih tertaut
- Folder "session/" masih tersedia

Jika session sudah tidak valid, lakukan reset session.

Bot logout

Hapus session:

Android

rm -rf session
npm start

Windows

Remove-Item -Recurse -Force session
npm start

Kemudian lakukan pairing kembali.

---

Project Structure

Bot-WA-Nexus/
│
├── handlers/
├── lib/
├── public/
├── session/
├── temp/
├── utils/
│
├── httpHelper.js
├── index.js
├── server.js
│
├── spotify.js
├── spotify.mjs
├── spotifyScraper.js
│
├── youtubeScraper.js
├── youtube_scraper.py
│
├── package.json
├── package-lock.json
└── .gitignore

---

Technology

Technology| Usage
Node.js| Runtime
JavaScript| Programming language
Baileys| WhatsApp connection
Axios| HTTP requests
Express| Web server
JSDOM| DOM processing
node-fetch| HTTP requests
Pino| Logging

Project menggunakan CommonJS dengan "index.js" sebagai entry point.

---

Repository

Source code:

https://github.com/dirrzzx948-png/Bot-WA-Nexus

---

License

Project menggunakan lisensi yang tercantum pada repository.

Untuk informasi lisensi terbaru, silakan periksa repository atau file terkait di dalam project.

---

Credits

Developed and maintained by

dirrzzx948-png

---

<div align="center">NEXUS BOT

Node.js × Baileys

</div>
