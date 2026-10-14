/**
 * Marca del producto e institución, en un solo lugar.
 *
 * El sistema se presenta como SIGA. COBACH 35 es el plantel piloto, pero la
 * interfaz no lleva el nombre del colegio: así el mismo front sirve para otra
 * institución cambiando solo `INSTITUCION` (y, si hace falta, los colores de
 * @theme en src/assets/main.css).
 */
export const PRODUCTO = {
  nombre: 'SIGA',
  descripcion: 'Seguimiento de asistencias',
} as const

export const INSTITUCION = {
  plantel: 'Plantel 35',
  sede: 'Tuxtla Norte',
} as const

export const SUBTITULO_INSTITUCION = `${INSTITUCION.plantel}, ${INSTITUCION.sede}`
