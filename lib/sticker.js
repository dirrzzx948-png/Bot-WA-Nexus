const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const util = require('util')
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')

const execFileAsync = util.promisify(execFile)

function findFont() {
  const fonts = [
    '/system/fonts/Roboto-Regular.ttf',
    '/system/fonts/NotoSans-Regular.ttf',
    '/system/fonts/DroidSans.ttf'
  ]
  return fonts.find(file => fs.existsSync(file))
}

function wrapText(text, maxChars = 14) {
  const words = text.trim().split(/\s+/)
  const lines = []
  let line = ''

  for (const word of words) {
    const test = (line + ' ' + word).trim()
    if (test.length <= maxChars) {
      line = test
      continue
    }
    if (line) lines.push(line)
    if (word.length > maxChars) {
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars))
      }
      line = ''
    } else {
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.join('\n')
}

async function downloadMedia(message, type) {
  const stream = await downloadContentFromMessage(message, type)
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function makeSticker(input, text = '') {
  const dir = os.tmpdir()
  const id = Date.now()
  const inputFile = path.join(dir, `input_${id}.jpg`)
  const outputFile = path.join(dir, `sticker_${id}.webp`)
  const textFile = path.join(dir, `text_${id}.txt`)

  fs.writeFileSync(inputFile, input)

  try {
    const filters = [
      'scale=512:512:force_original_aspect_ratio=decrease',
      'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0'
    ]

    if (text) {
      const font = findFont()
      if (!font) throw new Error('Font Android tidak ditemukan.')

      const wrapped = wrapText(text, 14)
      fs.writeFileSync(textFile, wrapped, 'utf8')
      filters.push(
        `drawtext=fontfile=${font}:textfile=${textFile}:fontcolor=white:fontsize=42:line_spacing=8:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-text_h-25`
      )
    }

    filters.push('format=rgba')

    await execFileAsync('ffmpeg', [
      '-y', '-i', inputFile,
      '-vf', filters.join(','),
      '-vcodec', 'libwebp',
      '-lossless', '0',
      '-q:v', '50',
      '-preset', 'picture',
      outputFile
    ])

    return fs.readFileSync(outputFile)
  } finally {
    if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile)
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile)
    if (fs.existsSync(textFile)) fs.unlinkSync(textFile)
  }
}

async function makeTextSticker(text) {
  const dir = os.tmpdir()
  const id = Date.now()
  const outputFile = path.join(dir, `textsticker_${id}.webp`)
  const textFile = path.join(dir, `text_${id}.txt`)

  const font = findFont()
  if (!font) throw new Error('Font Android tidak ditemukan.')

  const wrapped = wrapText(text, 12)
  fs.writeFileSync(textFile, wrapped, 'utf8')

  try {
    await execFileAsync('ffmpeg', [
      '-y', '-f', 'lavfi',
      '-i', 'color=c=black@0:s=512x512',
      '-vf', `drawtext=fontfile=${font}:textfile=${textFile}:fontcolor=white:fontsize=64:line_spacing=14:borderw=4:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2`,
      '-frames:v', '1',
      '-vcodec', 'libwebp',
      '-lossless', '0',
      '-q:v', '45',
      '-preset', 'picture',
      outputFile
    ])

    return fs.readFileSync(outputFile)
  } finally {
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile)
    if (fs.existsSync(textFile)) fs.unlinkSync(textFile)
  }
}

async function stickerToImage(input) {
  const dir = os.tmpdir()
  const id = Date.now()
  const inputFile = path.join(dir, `sticker_${id}.webp`)
  const outputFile = path.join(dir, `image_${id}.png`)

  fs.writeFileSync(inputFile, input)

  try {
    await execFileAsync('ffmpeg', ['-y', '-i', inputFile, '-frames:v', '1', outputFile])
    return fs.readFileSync(outputFile)
  } finally {
    if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile)
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile)
  }
}

module.exports = {
  downloadMedia,
  makeSticker,
  makeTextSticker,
  stickerToImage
}
