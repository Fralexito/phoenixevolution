// Versiones de Phoenix Link (migración 128), lógica pura sin DOM → probable con node --test.
// Convierte lo que devuelve `link_versiones_panel()` en algo seguro de pintar y dice en qué estado está cada versión.

/** «0.3.16» → [0,3,16]; inválida → null. */
export function partesVersion(v) {
  const m = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$/.exec(String(v ?? ''));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Compara dos versiones como números (0.3.9 < 0.3.16). Inválidas van al final. */
export function compararVersion(a, b) {
  const x = partesVersion(a), y = partesVersion(b);
  if (!x || !y) return x ? -1 : y ? 1 : 0;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

/** Estado legible de una versión: sin zip · lista (zip ok, sin publicar) · publicada · retirada. */
export function estadoVersion(v) {
  if (v.publicada) return { clave: 'publicada', texto: 'Publicada', tono: 'verde' };
  if (!v.subida) return { clave: 'sin_zip', texto: 'Falta el zip', tono: 'rojo' };
  if (v.retirada_en) return { clave: 'retirada', texto: 'Retirada', tono: 'gris' };
  return { clave: 'lista', texto: 'Lista para publicar', tono: 'ambar' };
}

export const tamanoTexto = (b) => (!Number.isFinite(b) || b <= 0 ? '—' : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);

const ESTADO_INTENTO = { descargando: 'Descargando', instalando: 'Instalando', instalada: 'Instalada', fallo: 'Falló', restaurada: 'Volvió a la anterior' };

/** Respuesta cruda del panel → { versiones (más nueva primero), pcs, ultima (publicada más nueva), esAdmin, resumen }. */
export function normalizarPanel(crudo) {
  const r = crudo && typeof crudo === 'object' ? crudo : {};
  const versiones = (Array.isArray(r.versiones) ? r.versiones : [])
    .filter((v) => v && partesVersion(v.version))
    .map((v) => ({ id: Number(v.id), version: v.version, etapa: String(v.etapa ?? ''), sha256: String(v.sha256 ?? ''), tamano: Number(v.tamano) || 0,
      notas: String(v.notas ?? ''), obligatoria: !!v.obligatoria, subida: !!v.subida, publicada: !!v.publicada, publicada_en: v.publicada_en ?? null,
      retirada_en: v.retirada_en ?? null, creada: v.creada ?? null, pcs: Number(v.pcs) || 0 }))
    .sort((a, b) => compararVersion(b.version, a.version));
  const ultima = versiones.find((v) => v.publicada) ?? null;
  const pcs = (Array.isArray(r.pcs) ? r.pcs : []).filter((p) => p && p.dispositivo).map((p) => {
    const alDia = ultima ? compararVersion(p.version, ultima.version) >= 0 : true;
    return { dispositivo: String(p.dispositivo), pc: String(p.pc ?? 'PC'), usuario: String(p.usuario ?? 'Jugador'), version: String(p.version ?? '?'),
      ultimo_contacto: p.ultimo_contacto ?? null, alDia,
      intento: p.intento_estado ? { version: String(p.intento_version ?? ''), estado: ESTADO_INTENTO[p.intento_estado] ?? String(p.intento_estado),
        problema: p.intento_estado === 'fallo' || p.intento_estado === 'restaurada', detalle: String(p.intento_detalle ?? ''), en: p.intento_en ?? null } : null };
  });
  return { versiones, pcs, ultima, esAdmin: !!r.es_admin,
    resumen: { total: pcs.length, alDia: pcs.filter((p) => p.alDia).length, conProblema: pcs.filter((p) => p.intento?.problema).length } };
}
