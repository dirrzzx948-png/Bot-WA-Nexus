import sys
import json
import os
import time
import yt_dlp

def download_youtube(url, mode="360p"):
    # Buat folder temp jika belum ada
    output_dir = "./temp"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    timestamp = int(time.time())
    
    # Konfigurasi pilihan kualitas
    if mode == "1080p":
        fmt = "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best"
        ext = "mp4"
    elif mode == "720p":
        fmt = "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best"
        ext = "mp4"
    elif mode == "360p":
        fmt = "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best"
        ext = "mp4"
    elif mode == "audio":
        fmt = "bestaudio/best"
        ext = "mp3"
    else:
        fmt = "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best"
        ext = "mp4"

    filename = f"yt_{timestamp}.{ext}"
    output_path = os.path.join(output_dir, filename)

    ydl_opts = {
        'format': fmt,
        'outtmpl': output_path,
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get('title', 'YouTube Media')

        return {
            "status": True,
            "data": {
                "title": title,
                "filePath": output_path,
                "type": mode
            }
        }
    except Exception as e:
        return {
            "status": False,
            "error": str(e)
        }

if __name__ == "__main__":
    url_input = sys.argv[1] if len(sys.argv) > 1 else ""
    mode_input = sys.argv[2] if len(sys.argv) > 2 else "360p"
    
    if not url_input:
        print(json.dumps({"status": False, "error": "URL tidak ditemukan"}))
    else:
        res = download_youtube(url_input, mode_input)
        print(json.dumps(res))
