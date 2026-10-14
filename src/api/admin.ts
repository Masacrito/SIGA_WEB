import { http } from './http'
import type { Esquemas } from './tipos'

/** Paso 2: usuarios, catálogos, padres/tutores y configuración (contrato openapi.yaml v1.4.0). */

export type Usuario = Required<Esquemas['Usuario']>
export type UsuarioInput = Esquemas['UsuarioInput']
export type Grupo = Required<Esquemas['Grupo']>
export type GrupoInput = Esquemas['GrupoInput']
export type Plantel = Required<Esquemas['Plantel']>
export type Grado = Required<Esquemas['Grado']>
export type Materia = Required<Esquemas['Materia']>
export type PeriodoEscolar = Required<Esquemas['PeriodoEscolar']>
export type PadreTutor = Required<Omit<Esquemas['PadreTutor'], 'alumnos_count'>> & {
  alumnos_count?: number
}
export type PadreTutorInput = Esquemas['PadreTutorInput']
export type PadreDeAlumno = PadreTutor & { parentesco: string | null; es_principal: boolean }
export type Alumno = Required<Esquemas['Alumno']>
export type UmbralRiesgo = Required<Esquemas['UmbralRiesgo']>
export type Configuracion = Required<Esquemas['Configuracion']>

const datos = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

// Usuarios (CU-10) y grupos de orientador (CU-18)
export const listarUsuarios = () => datos(http.get<Usuario[]>('/usuarios'))
export const crearUsuario = (u: UsuarioInput) => datos(http.post<Usuario>('/usuarios', u))
export const editarUsuario = (id: number, u: UsuarioInput) =>
  datos(http.put<Usuario>(`/usuarios/${id}`, u))
export const desactivarUsuario = (id: number) => http.delete(`/usuarios/${id}`)
export const gruposDeOrientador = (id: number) =>
  datos(http.get<Grupo[]>(`/orientadores/${id}/grupos`))
export const asignarGrupo = (id: number, grupoId: number) =>
  datos(http.post<Grupo>(`/orientadores/${id}/grupos`, { grupo_id: grupoId }))
export const quitarGrupo = (id: number, grupoId: number) =>
  http.delete(`/orientadores/${id}/grupos/${grupoId}`)

// Catálogos (CU-11)
export const catalogo = {
  planteles: () => datos(http.get<Plantel[]>('/catalogos/planteles')),
  grados: () => datos(http.get<Grado[]>('/catalogos/grados')),
  materias: () => datos(http.get<Materia[]>('/catalogos/materias')),
  periodos: () => datos(http.get<PeriodoEscolar[]>('/catalogos/periodos-escolares')),
  grupos: (periodoId?: number) =>
    datos(http.get<Grupo[]>('/catalogos/grupos', { params: { periodo_id: periodoId } })),
}
export const crearEnCatalogo = <T>(ruta: string, cuerpo: object) =>
  datos(http.post<T>(`/catalogos/${ruta}`, cuerpo))

// Padres/tutores (CU-09)
export const listarTutores = (buscar?: string) =>
  datos(http.get<PadreTutor[]>('/padres-tutores', { params: { buscar: buscar || undefined } }))
export const crearTutor = (t: PadreTutorInput) => datos(http.post<PadreTutor>('/padres-tutores', t))
export const editarTutor = (id: number, t: PadreTutorInput) =>
  datos(http.put<PadreTutor>(`/padres-tutores/${id}`, t))
export const buscarAlumnos = (filtros: { matricula?: string; nombre?: string }) =>
  datos(http.get<Alumno[]>('/alumnos', { params: filtros }))
export const tutoresDeAlumno = (alumnoId: number) =>
  datos(http.get<PadreDeAlumno[]>(`/alumnos/${alumnoId}/padres`))
export const vincularTutor = (
  alumnoId: number,
  v: { padre_tutor_id: number; parentesco?: string; es_principal?: boolean },
) => http.post(`/alumnos/${alumnoId}/padres`, v)
export const desvincularTutor = (alumnoId: number, tutorId: number) =>
  http.delete(`/alumnos/${alumnoId}/padres/${tutorId}`)

// Configuración (CU-19)
export const listarUmbrales = () => datos(http.get<UmbralRiesgo[]>('/umbrales-riesgo'))
export const guardarUmbrales = (umbrales: Partial<UmbralRiesgo>[]) =>
  datos(http.put<UmbralRiesgo[]>('/umbrales-riesgo', { umbrales }))
export const listarConfiguraciones = () => datos(http.get<Configuracion[]>('/configuraciones'))
export const guardarConfiguracion = (clave: string, valor: string) =>
  datos(http.put<Configuracion>('/configuraciones', { clave, valor }))
