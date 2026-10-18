// Clanes (migración 043): lógica PURA (sin red ni DOM) para validar formularios y normalizar lo que devuelven las RPC.
// Las reglas reales viven en la base de datos; aquí solo se adelantan mensajes claros y se protege la pantalla de datos raros.
export const LIMITES = { nombreMin: 3, nombreMax: 24, etiquetaMin: 2, etiquetaMax: 5, descripcionMax: 200, motivoMax: 200 };
export const ROLES = {
  capitan:    { etiqueta: 'Capitán',    icono: 'fa-crown',  clase: 'text-amber-300 border-amber-400/40' },
  subcapitan: { etiqueta: 'Subcapitán', icono: 'fa-shield', clase: 'text-cyan-300 border-cyan-400/40' },
  miembro:    { etiqueta: 'Miembro',    icono: 'fa-user',   clase: 'text-gray-300 border-galaxy-border' },
};
const txt = (v, max) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Valida el formulario de creación. → { ok, error?, valores? } */
export function validarClan({ nombre, etiqueta, descripcion } = {}) {
  const n = txt(nombre, 200), e = String(etiqueta ?? '').trim().toUpperCase(), d = txt(descripcion, 1000);
  if (n.length < LIMITES.nombreMin || n.length > LIMITES.nombreMax) return { ok: false, error: `El nombre debe tener entre ${LIMITES.nombreMin} y ${LIMITES.nombreMax} caracteres.` };
  if (!/^[A-Z0-9]+$/.test(e) || e.length < LIMITES.etiquetaMin || e.length > LIMITES.etiquetaMax) return { ok: false, error: `La etiqueta son ${LIMITES.etiquetaMin}–${LIMITES.etiquetaMax} letras o números, sin espacios (ej.: PHX).` };
  if (d.length > LIMITES.descripcionMax) return { ok: false, error: `La descripción admite hasta ${LIMITES.descripcionMax} caracteres.` };
  return { ok: true, valores: { nombre: n, etiqueta: e, descripcion: d } };
}
/** Mismo cálculo que la BD: votos necesarios = más del 70 % de los adultos. */
export const votosNecesarios = (adultos) => Math.floor((Math.max(0, adultos) * 70) / 100) + 1;

export function normalizarClanLista(l) {
  return (Array.isArray(l) ? l : []).filter((c) => c && c.id).map((c) => ({ id: num(c.id), nombre: txt(c.nombre, 40), etiqueta: txt(c.etiqueta, 6), descripcion: txt(c.descripcion, 300), miembros: num(c.miembros), capitan: txt(c.capitan, 40), oculto: !!c.oculto }));
}
/** Normaliza mi_clan(): { clan:null, invitaciones, enviadas } o la ficha completa. Nunca lanza con datos incompletos. */
export function normalizarMiClan(d) {
  const o = d && typeof d === 'object' ? d : {};
  const persona = (m) => ({ id: String(m.usuario_id ?? ''), username: txt(m.username, 40), nombre: txt(m.nombre || m.username, 60), avatar: m.avatar_url ?? '' });
  if (!o.clan) return { enClan: false, invitaciones: (o.invitaciones ?? []).map((s) => ({ id: num(s.id), clan: num(s.clan_id), nombre: txt(s.nombre, 40), etiqueta: txt(s.etiqueta, 6), miembros: num(s.miembros) })),
                        enviadas: (o.enviadas ?? []).map((s) => ({ id: num(s.id), clan: num(s.clan_id), nombre: txt(s.nombre, 40), etiqueta: txt(s.etiqueta, 6) })) };
  const v = o.votacion;
  return {
    enClan: true, rol: ROLES[o.mi_rol] ? o.mi_rol : 'miembro', maximo: num(o.maximo) || 15, adultos: num(o.adultos),
    clan: { id: num(o.clan.id), nombre: txt(o.clan.nombre, 40), etiqueta: txt(o.clan.etiqueta, 6), descripcion: txt(o.clan.descripcion, 300), oculto: !!o.clan.oculto },
    miembros: (o.miembros ?? []).map((m) => ({ ...persona(m), rol: ROLES[m.rol] ? m.rol : 'miembro', desde: m.desde ?? null, adulto: !!m.adulto, elegible: !!m.elegible })),
    solicitudes: (o.solicitudes ?? []).map((s) => ({ ...persona(s), id: num(s.id), usuario: String(s.usuario_id ?? ''), tipo: s.tipo === 'invitacion' ? 'invitacion' : 'solicitud' })),
    destitucion: { pedidos: num(o.destitucion?.pedidos), necesarios: num(o.destitucion?.necesarios), yoPedi: !!o.destitucion?.yo_pedi },
    votacion: v ? { id: num(v.id), motivo: v.motivo === 'destitucion' ? 'destitucion' : 'vacante', cierraAt: v.cierra_at ?? null, necesarios: num(v.necesarios), miVoto: v.mi_voto ? String(v.mi_voto) : null,
                    candidatos: (v.candidatos ?? []).map((c) => ({ ...persona(c), votos: num(c.votos) })) } : null,
  };
}
/** Permisos de interfaz (solo para mostrar/ocultar botones; la BD vuelve a validar todo). */
export const puede = (rol) => ({ invitar: rol === 'capitan' || rol === 'subcapitan', responder: rol === 'capitan' || rol === 'subcapitan', editar: rol === 'capitan', nombrar: rol === 'capitan', ceder: rol === 'capitan', expulsar: rol === 'capitan' || rol === 'subcapitan' });
/** Tiempo restante de una votación: «12 h 5 min», «cerrando…». */
export function restante(cierraAt, ahora = Date.now()) {
  const t = Date.parse(cierraAt); if (!Number.isFinite(t)) return '';
  const m = Math.floor((t - ahora) / 60000); if (m <= 0) return 'cerrando…';
  const h = Math.floor(m / 60); return h ? `${h} h ${m % 60} min` : `${m} min`;
}
export const textoMotivo = (m) => (m === 'destitucion' ? 'Votación de destitución' : 'Elección de capitán');
