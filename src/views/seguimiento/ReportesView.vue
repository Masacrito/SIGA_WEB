<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PhFilePdf, PhMicrosoftExcelLogo } from '@phosphor-icons/vue'
import { descargarReporte, semaforo, type Grupo, type Nivel } from '@/api/seguimiento'
import { mensajeDeError } from '@/api/http'
import { avisar } from '@/composables/avisos'
import { NIVELES, etiquetaGrupo } from '@/composables/riesgo'

/**
 * Reporte por grupo (CU-07): mis grupos con su resumen del semáforo y la
 * descarga en PDF (para imprimir o mandar) o Excel (para trabajarlo).
 */
interface FilaGrupo {
  grupo: Grupo
  alumnos: number
  niveles: Record<Nivel, number>
}

const filas = ref<FilaGrupo[]>([])
const cargando = ref(true)
const error = ref('')
const descargando = ref('') // "<grupo>-<formato>"

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    // ponytail: el semáforo ya trae grupo y nivel de cada alumno; con varios planteles, un GET /mis-grupos con conteos
    const m = new Map<number, FilaGrupo>()
    for (const f of await semaforo()) {
      const fila = m.get(f.grupo.id) ?? {
        grupo: f.grupo,
        alumnos: 0,
        niveles: { alto: 0, medio: 0, bajo: 0 },
      }
      fila.alumnos++
      fila.niveles[f.nivel_riesgo as Nivel]++
      m.set(f.grupo.id, fila)
    }
    filas.value = [...m.values()].sort((a, b) =>
      etiquetaGrupo(a.grupo).localeCompare(etiquetaGrupo(b.grupo), 'es', { numeric: true }),
    )
  } catch (e) {
    error.value = mensajeDeError(e)
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

async function descargar(g: Grupo, formato: 'pdf' | 'excel') {
  descargando.value = `${g.id}-${formato}`
  try {
    avisar(`Descargado: ${await descargarReporte(g.id, formato)}`)
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  } finally {
    descargando.value = ''
  }
}
</script>

<template>
  <div class="max-w-4xl">
    <p class="mb-5 max-w-2xl text-sm text-tinta-600">
      Un renglón por alumno con sus clases, faltas, retardos, justificadas, porcentaje de
      inasistencia, nivel de riesgo y promedio. Mismo cálculo que el semáforo; las bajas no
      aparecen.
    </p>

    <p v-if="cargando" role="status" class="text-sm text-tinta-500">Cargando tus grupos…</p>
    <div v-else-if="error" role="alert">
      <p class="text-[15px] text-tinta-800">{{ error }}</p>
      <button type="button" class="btn-secundario mt-4" @click="cargar">Reintentar</button>
    </div>
    <p v-else-if="!filas.length" class="text-[15px] text-tinta-600">
      No tienes grupos con alumnos en el periodo activo.
    </p>

    <div v-else class="relative overflow-x-auto rounded-lg border border-linea bg-white">
      <table class="w-full min-w-[36rem] text-sm">
        <thead>
          <tr class="border-b border-linea text-left text-tinta-900">
            <th scope="col" class="px-4 py-2.5 font-semibold">Grupo</th>
            <th scope="col" class="px-4 py-2.5 text-right font-semibold">Alumnos</th>
            <th scope="col" class="px-4 py-2.5 font-semibold">Riesgo</th>
            <th scope="col" class="px-4 py-2.5 text-right font-semibold">
              <span class="sr-only">Descargar</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-linea">
          <tr v-for="f in filas" :key="f.grupo.id">
            <th scope="row" class="px-4 py-2.5 text-left font-medium text-tinta-900">
              {{ etiquetaGrupo(f.grupo) }}
            </th>
            <td class="px-4 py-2.5 text-right tabular-nums">{{ f.alumnos }}</td>
            <td class="px-4 py-2.5">
              <span class="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-tinta-700">
                <span
                  v-for="n in ['alto', 'medio', 'bajo'] as const"
                  :key="n"
                  class="inline-flex items-center gap-1"
                >
                  <span
                    class="size-2 rounded-full"
                    :style="{ background: NIVELES[n].punto }"
                    aria-hidden="true"
                  />
                  {{ NIVELES[n].etiqueta }} {{ f.niveles[n] }}
                </span>
              </span>
            </td>
            <td class="px-3 py-1.5">
              <span class="flex justify-end gap-1.5">
                <button
                  type="button"
                  class="btn-secundario px-2.5 py-1.5"
                  :disabled="!!descargando"
                  :aria-label="`Reporte de ${etiquetaGrupo(f.grupo)} en PDF`"
                  @click="descargar(f.grupo, 'pdf')"
                >
                  <PhFilePdf :size="16" weight="bold" />
                  {{ descargando === `${f.grupo.id}-pdf` ? 'Generando…' : 'PDF' }}
                </button>
                <button
                  type="button"
                  class="btn-secundario px-2.5 py-1.5"
                  :disabled="!!descargando"
                  :aria-label="`Reporte de ${etiquetaGrupo(f.grupo)} en Excel`"
                  @click="descargar(f.grupo, 'excel')"
                >
                  <PhMicrosoftExcelLogo :size="16" weight="bold" />
                  {{ descargando === `${f.grupo.id}-excel` ? 'Generando…' : 'Excel' }}
                </button>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
