import { ref } from 'vue'

/** Avisos efímeros (toasts). Uno solo en pantalla a la vez basta para este sistema. */
export interface Aviso {
  id: number
  texto: string
  tipo: 'ok' | 'error'
}

export const avisos = ref<Aviso[]>([])
let siguiente = 0

export function avisar(texto: string, tipo: Aviso['tipo'] = 'ok') {
  const id = ++siguiente
  avisos.value = [{ id, texto, tipo }]
  // Los errores se quedan hasta que el usuario los cierre: no deben pasar desapercibidos
  if (tipo === 'ok') setTimeout(() => cerrarAviso(id), 4000)
}

export function cerrarAviso(id: number) {
  avisos.value = avisos.value.filter((a) => a.id !== id)
}
