<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'
import {
  gruposDeMisHorarios,
  historial,
  semaforo,
  type Grupo,
  type RegistroHistorial,
} from '@/api/seguimiento'
import { mensajeDeError } from '@/api/http'
import { ESTADOS, etiquetaGrupo, fechaCorta } from '@/composables/riesgo'
import { useAuthStore } from '@/stores/auth'

/** CU-05: la lista de un grupo en un día, clase por clase. */
const auth = useAuthStore()

const grupos = ref<Grupo[]>([])
const grupoId = ref<number | ''>('')
const fecha = ref(diaHabil(new Date(), -1))
const registros = ref<RegistroHistorial[]>([])
const cargando = ref(true)
const error = ref('')

/** Día hábil anterior/siguiente a d (salta sábado y domingo), como "YYYY-MM-DD". */
function diaHabil(d: Date, paso: number): string {
  const x = new Date(d)
  do x.setDate(x.getDate() + paso)
  while (x.getDay() === 0 || x.getDay() === 6)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
const mover = (paso: number) => (fecha.value = diaHabil(new Date(`${fecha.value}T12:00:00`), paso))
// No se avanza a días que aún no pasan
const sinSiguiente = computed(
  () => diaHabil(new Date(`${fecha.value}T12:00:00`), 1) > diaHabil(new Date(), -1),
)

onMounted(async () => {
  try {
    // Mis grupos: el orientador/administrador los toma del semáforo; el docente, de sus horarios.
    // shortcut: el semáforo calcula todo solo para sacar la lista de grupos (~0.2 s con un plantel); con varios planteles, un GET /mis-grupos
    const lista = auth.puede('ver_semaforo_riesgo')
      ? [...new Map((await semaforo()).map((f) => [f.grupo.id, f.grupo])).values()]
      : await gruposDeMisHorarios()
    grupos.value = lista.sort((a, b) => etiquetaGrupo(a).localeCompare(etiquetaGrupo(b)))
    grupoId.value = grupos.value[0]?.id ?? ''
    if (!grupoId.value) cargando.value = false
  } catch (e) {
    error.value = mensajeDeError(e)
    cargando.value = false
  }
})

let ultima = 0
watch([grupoId, fecha], async () => {
  if (!grupoId.value) return
  const esta = ++ultima
  cargando.value = true
  error.value = ''
  try {
    const r = await historial({
      grupo_id: grupoId.value,
      fecha_inicio: fecha.value,
      fecha_fin: fecha.value,
    })
    if (esta === ultima) registros.value = r
  } catch (e) {
    error.value = mensajeDeError(e)
  } finally {
    if (esta === ultima) cargando.value = false
  }
})

/** Columnas = clases del día (hora + materia); filas = alumnos. */
const clases = computed(() =>
  [...new Map(registros.value.map((r) => [`${r.hora_inicio}|${r.materia.id}`, r])).values()].sort(
    (a, b) => a.hora_inicio.localeCompare(b.hora_inicio),
  ),
)
const alumnos = computed(() =>
  [...new Map(registros.value.map((r) => [r.alumno.id, r.alumno])).values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  ),
)
const celdas = computed(
  () => new Map(registros.value.map((r) => [`${r.alumno.id}|${r.hora_inicio}|${r.materia.id}`, r])),
)
const registroDe = (alumnoId: number, c: RegistroHistorial) =>
  celdas.value.get(`${alumnoId}|${c.hora_inicio}|${c.materia.id}`)
const titulo = (r: RegistroHistorial) =>
  ESTADOS[r.estado].etiqueta +
  (r.motivo_justificacion ? ` — ${r.motivo_justificacion}` : '') +
  (r.origen === 'offline' ? ' (capturada sin señal)' : '')
const faltasEn = (c: RegistroHistorial) =>
  registros.value.filter(
    (r) =>
      r.hora_inicio === c.hora_inicio && r.materia.id === c.materia.id && r.estado === 'ausente',
  ).length
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label for="grupo-historial" class="etiqueta">Grupo</label>
        <select
          id="grupo-historial"
          v-model="grupoId"
          class="campo w-auto pr-8"
          :disabled="!grupos.length"
        >
          <option v-for="g in grupos" :key="g.id" :value="g.id">{{ etiquetaGrupo(g) }}</option>
        </select>
      </div>
      <div>
        <label for="fecha-historial" class="etiqueta">Día</label>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="btn-secundario px-2.5"
            aria-label="Día hábil anterior"
            @click="mover(-1)"
          >
            <PhCaretLeft :size="16" weight="bold" />
          </button>
          <input id="fecha-historial" v-model="fecha" type="date" class="campo w-auto" />
          <button
            type="button"
            class="btn-secundario px-2.5"
            aria-label="Día hábil siguiente"
            :disabled="sinSiguiente"
            @click="mover(1)"
          >
            <PhCaretRight :size="16" weight="bold" />
          </button>
        </div>
      </div>
      <p class="pb-2.5 text-sm text-tinta-600 first-letter:uppercase">{{ fechaCorta(fecha) }}</p>
    </div>

    <div
      v-if="error"
      role="alert"
      class="mt-6 max-w-xl border-t border-linea pt-6 text-[15px] text-tinta-800"
    >
      {{ error }}
    </div>
    <p v-else-if="!grupos.length && !cargando" class="mt-6 text-[15px] text-tinta-600">
      No tienes grupos asignados.
    </p>
    <p v-else-if="cargando" role="status" class="mt-6 text-sm text-tinta-500">Cargando la lista…</p>
    <p v-else-if="!registros.length" class="mt-6 text-[15px] text-tinta-600">
      Ese día no se pasó lista en este grupo (fin de semana, suspensión o aún no hay registros).
    </p>

    <div v-else class="relative mt-6 overflow-x-auto rounded-lg border border-linea bg-white">
      <table class="w-full text-sm" :style="{ minWidth: `${16 + clases.length * 6}rem` }">
        <caption class="sr-only">
          Asistencia de
          {{
            etiquetaGrupo(grupos.find((g) => g.id === grupoId)!)
          }}
          el
          {{
            fechaCorta(fecha)
          }}
        </caption>
        <thead>
          <tr class="border-b border-linea text-tinta-900">
            <th scope="col" class="sticky left-0 z-[1] bg-white px-4 py-3 text-left font-semibold">
              Alumno
            </th>
            <th
              v-for="c in clases"
              :key="c.hora_inicio + c.materia.id"
              scope="col"
              class="px-2 py-3 text-center font-semibold"
            >
              <span class="block font-mono text-xs font-normal text-tinta-500">{{
                c.hora_inicio
              }}</span>
              <span class="block text-xs" :title="c.materia.nombre">{{ c.materia.clave }}</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-linea">
          <tr v-for="a in alumnos" :key="a.id" class="hover:bg-tinta-50/60">
            <th scope="row" class="sticky left-0 z-[1] bg-white px-4 py-2 text-left font-normal">
              <!-- El docente no tiene consultar_alumnos: para él el nombre no es enlace -->
              <RouterLink
                v-if="auth.puede('consultar_alumnos')"
                :to="{ name: 'expediente', params: { id: a.id } }"
                class="text-tinta-900 hover:text-marca-700 hover:underline"
              >
                {{ a.nombre }}
              </RouterLink>
              <span v-else class="text-tinta-900">{{ a.nombre }}</span>
            </th>
            <td
              v-for="c in clases"
              :key="c.hora_inicio + c.materia.id"
              class="px-2 py-2 text-center"
            >
              <span
                v-if="registroDe(a.id, c)"
                class="inline-grid size-7 place-items-center rounded-md text-xs font-semibold"
                :class="ESTADOS[registroDe(a.id, c)!.estado].clase"
                :title="titulo(registroDe(a.id, c)!)"
              >
                {{ ESTADOS[registroDe(a.id, c)!.estado].letra
                }}<span class="sr-only">{{ ESTADOS[registroDe(a.id, c)!.estado].etiqueta }}</span>
              </span>
              <span v-else class="text-tinta-300" title="Sin registro">—</span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t border-linea text-xs text-tinta-500">
            <th scope="row" class="sticky left-0 bg-white px-4 py-2 text-left font-normal">
              Faltas por clase
            </th>
            <td
              v-for="c in clases"
              :key="c.hora_inicio + c.materia.id"
              class="px-2 py-2 text-center tabular-nums"
            >
              {{ faltasEn(c) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p v-if="registros.length" class="mt-3 text-xs text-tinta-500">
      ✓ presente · R retardo · F falta · J justificada.
      {{ auth.puede('consultar_alumnos') ? 'Toca un nombre para ver su expediente.' : '' }}
    </p>
  </div>
</template>
