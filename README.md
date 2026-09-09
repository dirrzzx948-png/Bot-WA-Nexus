NEXUS BOT

WhatsApp Bot berbasis Node.js dan Baileys dengan berbagai fitur untuk stiker, pengunduhan media, manajemen grup, serta utilitas sistem.

NEXUS BOT dirancang agar dapat dijalankan pada Android melalui Termux maupun pada Windows menggunakan Node.js. Proses autentikasi menggunakan WhatsApp Pairing Code sehingga tidak membutuhkan pemindaian QR secara manual.

Fitur

1. Sticker Tools

Perintah| Fungsi
"!s"| Mengonversi gambar menjadi stiker WhatsApp. Dapat digunakan melalui caption atau dengan membalas pesan gambar.
"!ts <teks>"| Membuat stiker berbasis teks secara otomatis.
"!toimg"| Mengonversi stiker WhatsApp menjadi gambar JPG/PNG.

2. Media Downloader

Perintah| Fungsi
"!tt <url>"| Mengunduh video TikTok berdasarkan tautan yang diberikan.
"!yt <url>"| Mengunduh video YouTube dengan kualitas standar hingga 360p.
"!yt720 <url>"| Mengunduh video YouTube hingga kualitas 720p HD.
"!yt1080 <url>"| Mengunduh video YouTube hingga kualitas 1080p Full HD.
"!ytmp3 <url>"| Mengunduh dan mengekstrak audio dari video YouTube.
"!spotify <url>"| Mengunduh audio berdasarkan URL track Spotify.

Ketersediaan dan keberhasilan pengunduhan dapat bergantung pada sumber media, perubahan platform, koneksi internet, serta layanan yang digunakan oleh bot.

3. Group Management

Perintah| Fungsi
"!groupinfo"| Menampilkan informasi dan statistik grup WhatsApp.
"!admins"| Menampilkan daftar anggota yang memiliki hak akses admin.
"!tagall"| Menyebutkan seluruh anggota grup dalam satu pesan.
"!hidetag <pesan>"| Mengirim pengumuman dengan melakukan mention anggota tanpa menampilkan daftar mention pada teks pesan.
"!kick"| Mengeluarkan anggota dari grup dengan membalas pesan target.
"!add <nomor>"| Menambahkan nomor ke grup menggunakan format nomor internasional.

Perintah manajemen grup membutuhkan bot memiliki izin admin apabila tindakan tersebut memerlukan hak administrator WhatsApp.

4. System & Utilities

Perintah| Fungsi
"!menu"| Menampilkan daftar perintah yang tersedia.
"!help"| Menampilkan panduan penggunaan perintah dan modul bot.
"!ping"| Mengukur waktu respons bot.
"!runtime"| Menampilkan durasi bot sejak pertama kali dijalankan.
"!owner"| Menampilkan informasi pemilik atau pengelola bot.

---

Persyaratan

Sebelum menjalankan bot, pastikan perangkat telah memiliki:

- Node.js
- npm
- Git
- Koneksi internet aktif
- Nomor WhatsApp khusus untuk bot atau nomor biasa

Repository menggunakan Node.js dan package manager npm. Dependensi utama yang digunakan antara lain Baileys, Axios, Express, JSDOM, node-fetch, dan Pino.

---

Instalasi di Android

Untuk Android, bot dapat dijalankan menggunakan Termux.

1. Instal Termux

Gunakan Termux dari sumber resmi yang terpercaya dan buka aplikasinya.

Kemudian perbarui paket:

pkg update && pkg upgrade

2. Instal Git dan Node.js

pkg install git nodejs

Periksa instalasi:

node -v
npm -v
git --version

Jika ketiga perintah tersebut menampilkan versi, berarti persyaratan dasar sudah tersedia.

3. Clone Repository

Clone repository NEXUS BOT:

git clone https://github.com/dirrzzx948-png/Bot-WA-Nexus.git

Masuk ke folder:

cd Bot-WA-Nexus

4. Instal Dependensi

Jalankan:

npm install

Tunggu sampai seluruh dependensi selesai dipasang.

5. Jalankan Bot

npm start

Repository menyediakan script "start" yang menjalankan "node index.js".

---

Login WhatsApp di Android

Saat bot dijalankan untuk pertama kali dan belum memiliki sesi WhatsApp, bot akan meminta nomor WhatsApp melalui terminal.

Masukkan nomor dalam format internasional.

Contoh:

628123456789

Jangan menggunakan format:

08123456789

Bot kemudian akan menampilkan Pairing Code.

Buka WhatsApp pada perangkat yang akan digunakan sebagai akun bot, kemudian masuk ke menu perangkat tertaut dan gunakan opsi untuk menautkan perangkat menggunakan kode.

Setelah proses berhasil, sesi akan disimpan di folder:

session/

Pada repository, autentikasi menggunakan "useMultiFileAuthState('./session')", sehingga kredensial sesi disimpan secara lokal.

Jangan membagikan folder "session" kepada orang lain karena berisi data autentikasi akun WhatsApp.

---

Instalasi di Windows

1. Instal Node.js

Instal Node.js pada komputer Windows.

Setelah selesai, buka:

- Command Prompt
- PowerShell
- Windows Terminal

Kemudian periksa:

node -v
npm -v

2. Instal Git

Pastikan Git sudah tersedia:

git --version

3. Clone Repository

Jalankan:

git clone https://github.com/dirrzzx948-png/Bot-WA-Nexus.git

Masuk ke folder:

cd Bot-WA-Nexus

4. Instal Dependensi

npm install

5. Jalankan Bot

npm start

Jika berhasil, bot akan mulai melakukan koneksi ke WhatsApp.

---

Cara Menjalankan Kembali

Setelah sesi WhatsApp berhasil dibuat, bot dapat dijalankan kembali tanpa melakukan pairing ulang selama sesi masih valid.

Android:

cd Bot-WA-Nexus
npm start

Windows:

cd Bot-WA-Nexus
npm start

Pastikan folder "session" tidak dihapus.

---

Cara Menggunakan Bot

Setelah bot terhubung ke WhatsApp, kirim perintah melalui chat WhatsApp.

Stiker

Membuat stiker dari gambar

Kirim gambar dengan caption:

!s

Atau balas/reply gambar menggunakan:

!s

Membuat stiker teks

!ts Halo dunia

Mengubah stiker menjadi gambar

Balas/reply sebuah stiker:

!toimg

---

Download Media

TikTok

!tt https://contoh-url-tiktok

YouTube 360p

!yt https://youtube.com/watch?v=xxxx

YouTube 720p

!yt720 https://youtube.com/watch?v=xxxx

YouTube 1080p

!yt1080 https://youtube.com/watch?v=xxxx

YouTube Audio

!ytmp3 https://youtube.com/watch?v=xxxx

Spotify

!spotify https://open.spotify.com/track/xxxx

Gunakan fitur pengunduhan hanya untuk konten yang memang boleh Anda unduh dan gunakan. Jangan gunakan bot untuk melanggar hak cipta atau ketentuan layanan platform.

---

Manajemen Grup

Perintah berikut digunakan di dalam grup WhatsApp.

Informasi Grup

!groupinfo

Menampilkan informasi dasar dan statistik grup.

Daftar Admin

!admins

Menampilkan anggota yang memiliki status admin.

Mention Semua Anggota

!tagall

Menyebutkan seluruh anggota grup.

Hidden Tag

!hidetag Pengumuman penting

Mengirim pesan kepada seluruh anggota dengan mention yang tidak ditampilkan sebagai daftar nama pada isi pesan.

Mengeluarkan Anggota

Reply pesan anggota yang ingin dikeluarkan, kemudian gunakan:

!kick

Bot harus memiliki izin administrator grup untuk melakukan tindakan tersebut.

Menambahkan Anggota

!add 628123456789

Gunakan format nomor internasional tanpa tanda "+".

Contoh:

!add 628123456789

Keberhasilan penambahan anggota tetap bergantung pada aturan dan kondisi grup WhatsApp.

---

System Commands

Menu

!menu

Menampilkan daftar perintah bot.

Help

!help

Menampilkan bantuan penggunaan fitur.

Ping

!ping

Digunakan untuk melihat waktu respons bot.

Runtime

!runtime

Menampilkan lama waktu bot telah aktif.

Owner

!owner

Menampilkan informasi pemilik atau pengelola bot.

---

Struktur Repository

Struktur utama repository:

Bot-WA-Nexus/
├── handlers/
├── lib/
├── public/
├── session/
├── temp/
├── utils/
├── httpHelper.js
├── index.js
├── server.js
├── spotify.js
├── spotify.mjs
├── spotifyScraper.js
├── youtubeScraper.js
├── youtube_scraper.py
├── package.json
├── package-lock.json
└── .gitignore

Repository saat ini memang memiliki struktur modul seperti "handlers", "lib", "public", "session", "temp", dan "utils", serta beberapa file scraper untuk media.

---

Session

Folder "session" digunakan untuk menyimpan sesi autentikasi WhatsApp.

Jangan:

- Membagikan folder "session".
- Mengunggah folder "session" ke repository publik.
- Memberikan isi file sesi kepada orang lain.

Jika sesi mengalami masalah atau akun telah logout, Anda dapat menghapus folder sesi lalu menjalankan bot kembali:

Android:

rm -rf session
npm start

Windows PowerShell:

Remove-Item -Recurse -Force session
npm start

Setelah itu proses pairing akan diminta kembali.

---

Update Repository

Jika repository mendapatkan pembaruan, masuk ke folder project kemudian jalankan:

git pull

Setelah pembaruan selesai, instal ulang atau perbarui dependensi jika diperlukan:

npm install

Kemudian jalankan:

npm start

---

Troubleshooting

"node: command not found"

Node.js belum terpasang atau belum masuk ke PATH.

Android:

pkg install nodejs

Windows, instal Node.js kemudian buka terminal baru.

"npm install" gagal

Coba:

npm cache clean --force
npm install

Pastikan koneksi internet stabil.

Bot tidak terhubung

Pastikan:

- Internet aktif.
- Nomor WhatsApp masih dapat digunakan.
- WhatsApp tidak memutuskan perangkat tertaut.
- Folder "session" masih tersedia.

Jika sesi sudah tidak valid, hapus folder "session" dan lakukan pairing kembali.

Bot logout

Jika terminal menampilkan bahwa sesi telah logout, hapus sesi:

rm -rf session

Kemudian:

npm start

Pada Windows PowerShell:

Remove-Item -Recurse -Force session
npm start

---

Catatan Penggunaan

NEXUS BOT merupakan project otomasi WhatsApp yang menggunakan library Baileys.

Gunakan bot secara bertanggung jawab dan jangan melakukan spam, penyalahgunaan fitur grup, atau aktivitas yang dapat mengganggu pengguna lain.

Fitur yang berhubungan dengan layanan pihak ketiga dapat berubah sewaktu-waktu apabila platform tersebut mengubah sistem, API, struktur halaman, atau kebijakan mereka.

---

Teknologi

Project ini menggunakan:

- Node.js
- JavaScript
- Baileys
- Axios
- Express
- JSDOM
- node-fetch
- Pino

Konfigurasi "package.json" repository mendefinisikan project sebagai CommonJS dan menggunakan "index.js" sebagai entry point.

---

Repository

Source code:

https://github.com/dirrzzx948-png/Bot-WA-Nexus

---

License

Project ini menggunakan lisensi yang tercantum pada repository. Periksa file "package.json" atau repository untuk informasi lisensi terbaru.

---

Credits

Developed and maintained by:

dirrzzx948-png

NEXUS BOT
