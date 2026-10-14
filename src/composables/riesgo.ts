import type { EstadoAsistencia, Grupo, Nivel } from '@/api/seguimiento'

/**
 * Colores de estado. El color nunca va solo: siempre con su etiqueta en texto
 * (verde y ámbar se confunden con daltonismo y el ámbar tiene poco contraste).
 * El texto usa tonos oscuros legibles sobre el fondo pastel, no el color del punto.
 */
export const NIVELES: Record<
  Nivel,
  { etiqueta: string; punto: string; fondo: string; texto: string }
> = {
  bajo: {
    etiqueta: 'Bajo',
    punto: 'var(--color-riesgo-bajo)',
    fondo: 'bg-[#e8f5ec]',
    texto: 'text-[#11743a]',
  },
  medio: {
    etiqueta: 'Medio',
    punto: 'var(--color-riesgo-medio)',
    fondo: 'bg-[#fdf3dc]',
    texto: 'text-[#8a5300]',
  },
  alto: {
    etiqueta: 'Alto',
    punto: 'var(--color-riesgo-alto)',
    fondo: 'bg-[#fdeaea]',
    texto: 'text-[#b02020]',
  },
}

export const ESTADOS: Record<EstadoAsistencia, { etiqueta: string; letra: string; clase: string }> =
  {
    presente: { etiqueta: 'Presente', letra: '✓', clase: 'bg-tinta-50 text-tinta-500' },
    retardo: { etiqueta: 'Retardo', letra: 'R', clase: 'bg-[#fdf3dc] text-[#8a5300]' },
    ausente: { etiqueta: 'Falta', letra: 'F', clase: 'bg-[#fdeaea] text-[#b02020]' },
    justificado: { etiqueta: 'Justificada', letra: 'J', clase: 'bg-marca-50 text-marca-800' },
  }

export const etiquetaGrupo = (g: Pick<Grupo, 'grado' | 'letra' | 'turno'>) =>
  `${g.grado}° ${g.letra} · ${g.turno}`

/** "lunes 12 oct" a partir de "2026-10-12" (mediodía: sin brincos de zona horaria). */
export const fechaCorta = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
