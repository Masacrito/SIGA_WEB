import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '@/api/auth'
import { fijarToken } from '@/api/http'
import type { LoginBody, UsuarioSesion } from '@/api/tipos'

const CLAVE_TOKEN = 'siga.token'

function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN)
  } catch {
    return null
  }
}

function guardarToken(valor: string | null) {
  try {
    if (valor) localStorage.setItem(CLAVE_TOKEN, valor)
    else localStorage.removeItem(CLAVE_TOKEN)
  } catch {
    /* modo privado o almacenamiento bloqueado: la sesión dura lo que la pestaña */
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(leerToken())
  const usuario = ref<UsuarioSesion | null>(null)
  /** true cuando ya se intentó recuperar la sesión al abrir la app */
  const inicializado = ref(false)

  fijarToken(token.value)

  const autenticado = computed(() => !!token.value && !!usuario.value)
  const permisos = computed(() => new Set(usuario.value?.permisos ?? []))

  /**
   * ¿Puede hacer esto? Se decide por permiso, nunca por nombre de rol.
   * es_super_admin pasa siempre (igual que el middleware del backend).
   */
  function puede(permiso?: string | string[]): boolean {
    if (!permiso) return true
    if (usuario.value?.es_super_admin) return true
    const lista = Array.isArray(permiso) ? permiso : [permiso]
    return lista.some((p) => permisos.value.has(p))
  }

  function fijarSesion(nuevoToken: string | null, nuevoUsuario: UsuarioSesion | null) {
    token.value = nuevoToken
    usuario.value = nuevoUsuario
    fijarToken(nuevoToken)
    guardarToken(nuevoToken)
  }

  async function iniciarSesion(datos: LoginBody) {
    const r = await api.login(datos)
    fijarSesion(r.token ?? null, r.usuario ?? null)
  }

  /** Al abrir la app: si hay token guardado, se valida contra /me. */
  async function recuperarSesion() {
    if (inicializado.value) return
    try {
      if (token.value) usuario.value = await api.me()
    } catch {
      fijarSesion(null, null)
    } finally {
      inicializado.value = true
    }
  }

  /** Tras cambiar permisos del propio rol: el menú se rearma con lo nuevo. */
  async function refrescarUsuario() {
    usuario.value = await api.me()
  }

  async function cerrarSesion() {
    try {
      if (token.value) await api.logout()
    } catch {
      /* si el token ya no servía, igual se limpia localmente */
    } finally {
      fijarSesion(null, null)
    }
  }

  /** Lo llama el interceptor de axios ante un 401. */
  function sesionExpirada() {
    fijarSesion(null, null)
  }

  return {
    token,
    usuario,
    inicializado,
    autenticado,
    permisos,
    puede,
    iniciarSesion,
    recuperarSesion,
    refrescarUsuario,
    cerrarSesion,
    sesionExpirada,
  }
})
