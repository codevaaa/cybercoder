import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/*
 * Generates the CyberCoder extension logo as a real PNG (no deps — pure Node
 * zlib). Draws a pixel "code mascot" in cream on a terracotta rounded square,
 * matching the Claude-Code-style brand. Outputs media/icon.png (256x256).
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const SIZE = 256

// Palette
const BG = [201, 100, 66, 255]      // #C96442 terracotta
const BG2 = [185, 87, 58, 255]      // slightly darker for depth
const FG = [245, 244, 239, 255]     // cream
const TRANSPARENT = [0, 0, 0, 0]

// 16x16 mascot grid (1 = cream pixel). A friendly "code creature".
const M = [
  '0001000000001000',
  '0000100000010000',
  '0001111111111000',
  '0011011111101100',
  '0111111111111110',
  '1111111111111111',
  '1111111111111111',
  '1110011111100111',
  '0000011111100000',
  '0000110000110000',
  '0001100000011000',
  '0000000000000000',
  '0000110000110000',
  '0001111001111000',
  '0011001111001100',
  '0000000000000000',
]

const px = (img, x, y, c) => {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
  const i = (y * SIZE + x) * 4
  img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; img[i + 3] = c[3]
}

// Build RGBA buffer
const img = Buffer.alloc(SIZE * SIZE * 4)

// Rounded-square background
const radius = 52
const inCorner = (x, y) => {
  const cxs = [radius, SIZE - radius]
  const cys = [radius, SIZE - radius]
  for (const cx of cxs) for (const cy of cys) {
    const nearX = (cx === radius && x < radius) || (cx !== radius && x > SIZE - radius)
    const nearY = (cy === radius && y < radius) || (cy !== radius && y > SIZE - radius)
    if (nearX && nearY) {
      const dx = x - cx, dy = y - cy
      if (dx * dx + dy * dy > radius * radius) return true
    }
  }
  return false
}
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    if (inCorner(x, y)) { px(img, x, y, TRANSPARENT); continue }
    // subtle vertical gradient
    const t = y / SIZE
    const c = [
      Math.round(BG[0] * (1 - t) + BG2[0] * t),
      Math.round(BG[1] * (1 - t) + BG2[1] * t),
      Math.round(BG[2] * (1 - t) + BG2[2] * t),
      255,
    ]
    px(img, x, y, c)
  }
}

// Draw mascot centered: 16 cells, each cell = 12px, leaving margin
const cell = 12
const gridPx = 16 * cell // 192
const offset = Math.round((SIZE - gridPx) / 2)
for (let gy = 0; gy < 16; gy++) {
  for (let gx = 0; gx < 16; gx++) {
    if (M[gy][gx] === '1') {
      for (let dy = 0; dy < cell; dy++) for (let dx = 0; dx < cell; dx++) {
        px(img, offset + gx * cell + dx, offset + gy * cell + dy, FG)
      }
    }
  }
}

// Encode PNG
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1))
  }
  return (~c) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0 // 8-bit RGBA

// raw scanlines with filter byte 0
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0
  img.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}
const idat = deflateSync(raw, { level: 9 })

const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])

const out = join(__dirname, '..', 'media', 'icon.png')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, png)
console.log(`Wrote ${out} (${png.length} bytes, ${SIZE}x${SIZE})`)
