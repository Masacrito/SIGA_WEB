import { http } from './http'
import type { Esquemas } from './tipos'

/** Seguimiento: semáforo, historial y expediente (paso 1); observaciones, justificantes, calificaciones y reportes (paso 4). Contrato openapi.yaml v1.7.0. */

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

// ------------------------------------------------------------------ paso 4

export type Observacion = Required<Omit<Esquemas['Observacion'], 'alumno' | 'orientador'>> & {
  alumno: { id: number; matricula: string; nombre: string }
  orientador: { id: number; nombre: string }
}
export type Calificacion = Required<Omit<Esquemas['Calificacion'], 'materia' | 'editado_por'>> & {
  materia: {
    id: number
    clave: string
    nombre: string
    tipo_evaluacion: 'numerica' | 'alfanumerica'
  }
  editado_por: { id: number; nombre: string } | null
}

/** Con alumno, toda su bitácora; sin él, las 100 más recientes de mis grupos. */
export const observaciones = (alumnoId?: number) =>
  http
    .get<Observacion[]>('/observaciones', { params: alumnoId ? { alumno_id: alumnoId } : {} })
    .then((r) => r.data)

export const registrarObservacion = (alumnoId: number, texto: string) =>
  http.post<Observacion>('/observaciones', { alumno_id: alumnoId, texto }).then((r) => r.data)

export const justificar = (asistenciaId: number, motivo: string, evidenciaUrl?: string) =>
  http
    .post(`/asistencias/${asistenciaId}/justificacion`, {
      motivo,
      evidencia_url: evidenciaUrl || null,
    })
    .then((r) => r.data)

export const calificaciones = (alumnoId: number) =>
  http.get<Calificacion[]>(`/alumnos/${alumnoId}/calificaciones`).then((r) => r.data)

export const corregirCalificacion = (id: number, calificacion: string) =>
  http.put<Calificacion>(`/calificaciones/${id}`, { calificacion }).then((r) => r.data)

/** Descarga el reporte con el nombre que manda el servidor (Content-Disposition). */
export async function descargarReporte(grupoId: number, formato: 'pdf' | 'excel') {
  const r = await http
    .get<Blob>('/reportes', {
      params: { grupo_id: grupoId, formato },
      responseType: 'blob',
      timeout: 60_000,
    })
    .catch(async (e) => {
      // Con responseType blob el error también llega como Blob: se lee como JSON para mensajeDeError
      if (e.response?.data instanceof Blob) {
        const texto = await e.response.data.text()
        try {
          e.response.data = JSON.parse(texto)
        } catch {
          e.response.data = {}
        }
      }
      throw e
    })
  const nombre =
    /filename="([^"]+)"/.exec(r.headers['content-disposition'] ?? '')?.[1] ??
    `reporte.${formato === 'excel' ? 'xlsx' : 'pdf'}`
  const url = URL.createObjectURL(r.data)
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return nombre
}
