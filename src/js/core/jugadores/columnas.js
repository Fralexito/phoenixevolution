// Columnas de «jugadores» para LISTAS (Inicio, Database, Premios…): todas MENOS «foto».
// «foto» es la foto antigua guardada como texto dentro de la tabla (hasta 275 KB por jugador). Desde que las fichas suben la foto
// a Storage se usa «foto_url» (y playerCard la prefiere). Pedir «*» descargaba esos KB en cada visita sin mostrarlos (19-oct-2026).
// Si añades una columna a la tabla y la necesitas en una lista, añádela aquí.
export const COLUMNAS_LISTA = 'id, nombre, club, ovr, posicion, pac, dri, sho, def, pas, phy, quote, created_at, atq, fin, pot, efe, reg, cor, cre, pre, pos, ant, rit, men, perfil_id, foto_url, descripcion, foto_aspecto, apodo, altura_cm, peso_kg, pie, biografia, ciudad, miembro_desde, estilo_juego, logros, redes';
