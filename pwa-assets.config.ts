import { combinePresetAndAppleSplashScreens, createAppleSplashScreens, defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const preset = {
  ...minimal2023Preset,
  maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#1F2A44' } },
  apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#1F2A44' } },
}

// Écrans de lancement iOS (sans eux, l'app installée démarre sur un écran blanc).
export default defineConfig({
  preset: combinePresetAndAppleSplashScreens(preset, createAppleSplashScreens({
    padding: 0.62,
    resizeOptions: { background: '#F4F6FA', fit: 'contain' },
    linkMediaOptions: { log: false, addMediaScreen: true, basePath: '/', xhtml: false },
    png: { compressionLevel: 9, quality: 70 },
  }, [
    'iPhone SE 4.7"', 'iPhone XR', 'iPhone X', 'iPhone 11 Pro Max', 'iPhone 12', 'iPhone 12 mini', 'iPhone 12 Pro Max',
    'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max', 'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
    'iPhone 17', 'iPhone 17 Pro', 'iPhone 17 Pro Max', 'iPhone Air',
  ])),
  images: ['public/logo.svg'],
})
