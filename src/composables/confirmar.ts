import { ref } from 'vue'

/**
 * Confirmación con <dialog> nativo (DialogoConfirmar.vue, montado una vez en el layout).
 * Uso: if (await confirmar({ titulo, mensaje })) { ... }
 */
export interface Confirmacion {
  titulo: string
  mensaje?: string
  detalle?: string[]
  aceptar?: string
  peligro?: boolean
}

export const pendiente = ref<(Confirmacion & { responder: (si: boolean) => void }) | null>(null)

export function confirmar(opciones: Confirmacion): Promise<boolean> {
  return new Promise((resolve) => {
    pendiente.value = {
      ...opciones,
      responder: (si) => {
        pendiente.value = null
        resolve(si)
      },
    }
  })
}
