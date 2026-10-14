import { http } from './http'
import type { Esquemas } from './tipos'

export type Permiso = Required<Esquemas['Permiso']>
export type Rol = Required<Omit<Esquemas['Rol'], 'permisos'>> & { permisos: Permiso[] }

export const listarRoles = () => http.get<Rol[]>('/roles').then((r) => r.data)
export const listarPermisos = () => http.get<Permiso[]>('/permisos').then((r) => r.data)
export const guardarPermisosDeRol = (rolId: number, permisoIds: number[]) =>
  http.put<Rol>(`/roles/${rolId}/permisos`, { permiso_ids: permisoIds }).then((r) => r.data)
