import { defineConfig, presetAttributify, presetIcons, presetWind3 } from 'unocss'

export default defineConfig({
  presets: [
    presetWind3(),
    presetAttributify(),
    presetIcons({
      scale: 1.1,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
  // Ensure scanned icons are available even if class names are split across templates
  safelist: [
    'i-lucide-git-compare',
    'i-lucide-file-json',
    'i-lucide-list-tree',
    'i-lucide-file-output',
    'i-lucide-shield-check',
    'i-lucide-upload',
    'i-lucide-align-left',
    'i-lucide-trash-2',
    'i-lucide-play',
    'i-lucide-copy',
    'i-lucide-download',
    'i-lucide-chevron-right',
    'i-lucide-sun',
    'i-lucide-moon',
  ],
})
