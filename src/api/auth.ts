import { http } from './http'
import type { LoginBody, LoginRespuesta, UsuarioSesion } from './tipos'

export async function login(datos: LoginBody) {
  // `dispositivo` nombra el token en personal_access_tokens (el backend lo acepta opcional)
  const { data } = await http.post<LoginRespuesta>('/login', { ...datos, dispositivo: 'web' })
  return data
}

export async function logout() {
  await http.post('/logout')
}

export async function me() {
  const { data } = await http.get<UsuarioSesion>('/me')
  return data
}
