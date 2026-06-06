import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Mascot grid (same as VS Code extension)
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

function makePng(size) {
  const BG = [201, 100, 66, 255]
  const BG2 = [185, 87, 58, 255]
  const FG = [245, 244, 239, 255]
  const img = Buffer.alloc(size * size * 4)
  const radius = Math.round(size * 0.2)

  const inCorner = (x, y) => {
    const cxs = [radius, size - radius]
    const cys = [radius, size - radius]
    for (const cx of cxs) for (const cy of cys) {
      const nearX = (cx === radius && x < radius) || (cx !== radius && x > size - radius)
      const nearY = (cy === radius && y < radius) || (cy !== radius && y > size - radius)
      if (nearX && nearY) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy > radius * radius) return true }
    }
    return false
  }

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4
    if (inCorner(x, y)) { img[i + 3] = 0; continue }
    const t = y / size
    img[i] = Math.round(BG[0] * (1 - t) + BG2[0] * t)
    img[i + 1] = Math.round(BG[1] * (1 - t) + BG2[1] * t)
    img[i + 2] = Math.round(BG[2] * (1 - t) + BG2[2] * t)
    img[i + 3] = 255
  }

  const cell = Math.floor(size * 0.75 / 16)
  const offset = Math.round((size - 16 * cell) / 2)
  for (let gy = 0; gy < 16; gy++) for (let gx = 0; gx < 16; gx++) {
    if (M[gy][gx] === '1') {
      for (let dy = 0; dy < cell; dy++) for (let dx = 0; dx < cell; dx++) {
        const px = offset + gx * cell + dx, py = offset + gy * cell + dy
        if (px >= 0 && py >= 0 && px < size && py < size) {
          const i = (py * size + px) * 4
          img[i] = FG[0]; img[i + 1] = FG[1]; img[i + 2] = FG[2]; img[i + 3] = FG[3]
        }
      }
    }
  }

  // Encode PNG
  function crc32(buf) { let c = ~0; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)) } return (~c) >>> 0 }
  function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const tb = Buffer.from(type, 'ascii'); const body = Buffer.concat([tb, data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]) }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; img.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4) }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const outDir = join(__dirname, 'icons')
mkdirSync(outDir, { recursive: true })
for (const size of [16, 48, 128]) {
  const png = makePng(size)
  writeFileSync(join(outDir, `icon${size}.png`), png)
  console.log(`icon${size}.png (${png.length} bytes)`)
}
