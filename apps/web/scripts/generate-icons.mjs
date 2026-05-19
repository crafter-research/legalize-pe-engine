import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '../public')
const iconsDir = join(publicDir, 'icons')

await mkdir(iconsDir, { recursive: true })

const favicon = join(publicDir, 'favicon.svg')

const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
  await sharp(favicon).resize(size, size).png().toFile(join(iconsDir, name))
  console.log(`Generated ${name}`)
}

// Generate maskable icon with padding (safe zone is 80% of icon)
const maskableSize = 512
const padding = Math.round(maskableSize * 0.1) // 10% padding each side
const innerSize = maskableSize - padding * 2

await sharp(favicon)
  .resize(innerSize, innerSize)
  .extend({
    top: padding,
    bottom: padding,
    left: padding,
    right: padding,
    background: '#000000',
  })
  .png()
  .toFile(join(iconsDir, 'icon-maskable-512x512.png'))
console.log('Generated icon-maskable-512x512.png')

console.log('All icons generated!')
