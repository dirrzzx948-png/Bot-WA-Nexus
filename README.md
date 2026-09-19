# 🤖 Bot-WA-Nexus

Bot WhatsApp berbasis Node.js + Baileys untuk Termux / Linux.  
Fitur downloader, stiker, AI, cuaca, translate, TTS, dan command grup.

## 📲 Instalasi Termux (Android)

```bash
pkg update -y && pkg upgrade -y
pkg install nodejs git ffmpeg -y
git clone https://github.com/dirrzzx948-png/Bot-WA-Nexus.git
cd Bot-WA-Nexus
npm install
npm start
```

Saat pertama kali jalan, masukkan nomor WhatsApp bot (contoh: `6281234567890`).  
Kode pairing akan muncul di terminal — masukkan di WhatsApp > Perangkat Tertaut.

## 🖥️ Linux / VPS

```bash
# Pastikan Node.js 18+ dan ffmpeg terpasang
git clone https://github.com/dirrzzx948-png/Bot-WA-Nexus.git
cd Bot-WA-Nexus
npm install
npm start
```

## 📋 Daftar Perintah

### Sticker
| Perintah | Keterangan |
|----------|------------|
| `!s` / `!sticker` | Ubah gambar jadi stiker (kirim/reply gambar) |
| `!ts <teks>` | Buat stiker dari teks |
| `!toimg` | Ubah stiker jadi gambar (reply stiker) |

### Downloader
| Perintah | Keterangan |
|----------|------------|
| `!tt <url>` | Download TikTok (tanpa watermark) |
| `!ig <url>` | Download Instagram Reel / Post |
| `!yt <url>` | Download video YouTube |
| `!ytmp3` / `!play <url>` | Download audio YouTube |
| `!spotify <url>` | Download audio Spotify |

### Fun & Tools
| Perintah | Keterangan |
|----------|------------|
| `!ai <pertanyaan>` | Tanya AI |
| `!quotes` | Quote random |
| `!tts <teks>` | Text-to-Speech (jadi voice note) |
| `!translate <kode> <teks>` | Terjemah bahasa (`!tr en Halo`) |
| `!cuaca <kota>` | Cek cuaca |
| `!short <url>` | Perpendek link |

### Sistem
| Perintah | Keterangan |
|----------|------------|
| `!menu` / `!help` | Tampilkan menu |
| `!ping` | Cek latency |
| `!runtime` | Waktu aktif bot |
| `!owner` | Info pemilik |

### Grup (Admin saja)
| Perintah | Keterangan |
|----------|------------|
| `!groupinfo` | Info grup |
| `!admins` | Daftar admin |
| `!tagall` | Panggil semua member |
| `!hidetag <pesan>` | Pengumuman tanpa tag terlihat |
| `!kick` | Kick member (reply / mention) |
| `!add <nomor>` | Tambah member |

## ⚙️ Catatan

- Session disimpan di folder `session/`. Jangan hapus kecuali mau login ulang.
- Fitur stiker teks membutuhkan font sistem (tersedia di Termux/Android).
- Beberapa downloader bergantung pada API pihak ketiga — jika gagal, coba lagi beberapa saat.
- Rate limit sederhana diterapkan agar bot tidak spam.

## 🛠️ Script

```bash
npm start   # Jalankan bot
```

---
Dibuat dengan ❤️ untuk komunitas WhatsApp bot.
