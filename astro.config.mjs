// Configuración de Astro.
// `base` DEBE coincidir con el nombre del repositorio en GitHub Pages:
// https://fralexito.github.io/phoenixevolution/
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://fralexito.github.io',
  // PES_BASE solo la usa la vista previa (/phoenixevolution/fase-beta); sin ella, la web oficial.
  base: process.env.PES_BASE || '/phoenixevolution',
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
});
