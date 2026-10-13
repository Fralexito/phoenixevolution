// Configuración de Astro.
// `base` DEBE coincidir con el nombre del repositorio en GitHub Pages:
// https://fralexito.github.io/phoenixevolution/
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
// Ronda 243: el CSS obedece a «Ajustes → Animaciones» (no solo a lo que diga el sistema operativo). Ver tools/movimiento-postcss.mjs.
import movimientoSegunAjustes from './tools/movimiento-postcss.mjs';

export default defineConfig({
  site: 'https://fralexito.github.io',
  // PES_BASE solo la usa la vista previa (/phoenixevolution/fase-beta-1-0); sin ella, la web oficial.
  base: process.env.PES_BASE || '/phoenixevolution',
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()], css: { postcss: { plugins: [movimientoSegunAjustes()] } } },
});
