// Configuración de Astro.
// `base` DEBE coincidir con el nombre del repositorio en GitHub Pages:
// https://fralexito.github.io/phoenixevolution/
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://fralexito.github.io',
  base: '/phoenixevolution',
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
});
