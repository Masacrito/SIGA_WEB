import axios, { AxiosError } from 'axios'
import type { ErrorApi } from './tipos'

/**
 * Cliente único para toda la app. Mismo contrato para backend real y mock:
 * solo cambia VITE_API_URL (.env vs .env.mock).
 */
const URL_POR_DEFECTO =
  import.meta.env.MODE === 'mock' ? 'http://127.0.0.1:4010' : 'http://127.0.0.1:8000/api'

export const http = axios.create({
  // .env es opcional: sin VITE_API_URL se usa el backend local (o Prism con --mode mock)
  baseURL: import.meta.env.VITE_API_URL || URL_POR_DEFECTO,
  headers: { Accept: 'application/json' },
  timeout: 20_000,
})

let token: string | null = null
let alExpirarSesion: (() => void) | null = null

export function fijarToken(nuevo: string | null) {
  token = nuevo
}

/** El store de auth registra aquí qué hacer con un 401 (limpiar sesión y mandar al login). */
export function registrarAlExpirarSesion(fn: () => void) {
  alExpirarSesion = fn
}

http.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ErrorApi>) => {
    // 401 en cualquier ruta que no sea el propio login = token vencido o revocado
    if (error.response?.status === 401 && !error.config?.url?.endsWith('/login')) {
      alExpirarSesion?.()
    }
    return Promise.reject(error)
  },
)

/** Mensaje entendible para mostrar al usuario, sea cual sea el error. */
export function mensajeDeError(e: unknown): string {
  if (axios.isAxiosError<ErrorApi>(e)) {
    if (!e.response) return 'No se pudo conectar con el servidor. Revisa tu conexión.'
    const { status, data } = e.response
    if (status === 422 && data?.errors) {
      return Object.values(data.errors).flat()[0] ?? data.message
    }
    if (data?.message) return data.message
    if (status === 403) return 'No tienes permiso para realizar esta acción.'
    if (status >= 500) return 'Error del servidor. Intenta de nuevo en un momento.'
  }
  return 'Ocurrió un error inesperado.'
}

/** Errores por campo de un 422, para pintarlos debajo de cada input. */
export function erroresDeCampos(e: unknown): Record<string, string> {
  if (axios.isAxiosError<ErrorApi>(e) && e.response?.status === 422 && e.response.data?.errors) {
    return Object.fromEntries(
      Object.entries(e.response.data.errors).map(([campo, msgs]) => [campo, msgs[0] ?? '']),
    )
  }
  return {}
}
