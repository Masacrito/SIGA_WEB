import { http } from './http'
import type { Esquemas } from './tipos'

/** Paso 1: semáforo, historial y expediente (contrato openapi.yaml v1.5.0). */

export type Nivel = 'bajo' | 'medio' | 'alto'
export type Grupo = Required<Esquemas['Grupo']>
export type SemaforoAlumno = Required<Omit<Esquemas['SemaforoAlumno'], 'alumno' | 'grupo'>> & {
  alumno: Required<Esquemas['Alumno']>
  grupo: Grupo
}
export type Riesgo = Required<Esquemas['RiesgoAlumno']>
export type Expediente = Required<Esquemas['Alumno']> & {
  grupo: Grupo | null
  riesgo: Riesgo | null
  tutores: (Required<Esquemas['PadreTutor']> & {
    parentesco: string | null
    es_principal: boolean
  })[]
}
export type RegistroHistorial = Required<Esquemas['AsistenciaHistorial']> & {
  alumno: { id: number; matricula: string; nombre: string }
  materia: { id: number; clave: string; nombre: string }
  grupo: Grupo
}
export type EstadoAsistencia = RegistroHistorial['estado']

export const semaforo = (filtros: { grupo_id?: number; nivel?: Nivel } = {}) =>
  http.get<SemaforoAlumno[]>('/semaforo-riesgo', { params: filtros }).then((r) => r.data)

export const expediente = (alumnoId: number) =>
  http.get<Expediente>(`/alumnos/${alumnoId}`).then((r) => r.data)

export const historial = (filtros: {
  alumno_id?: number
  grupo_id?: number
  materia_id?: number
  fecha_inicio?: string
  fecha_fin?: string
}) =>
  http.get<RegistroHistorial[]>('/asistencias/historial', { params: filtros }).then((r) => r.data)

/** Para el docente: sus grupos salen de sus horarios. */
export const gruposDeMisHorarios = () =>
  http
    .get<{ grupo: Grupo }[]>('/mis-horarios')
    .then((r) => [...new Map(r.data.map((h) => [h.grupo.id, h.grupo])).values()])
