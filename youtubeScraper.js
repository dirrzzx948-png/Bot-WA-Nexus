const { exec } = require('child_process');

function scrapeYouTube(url, mode = '360p') {
    return new Promise((resolve, reject) => {
        // Beri waktu timeout hingga 3 menit untuk proses download
        exec(`python youtube_scraper.py "${url}" "${mode}"`, { maxBuffer: 1024 * 1024 * 50, timeout: 180000 }, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (e) {
                reject("Gagal parsing output dari Python");
            }
        });
    });
}

module.exports = { scrapeYouTube };
