<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { PhInfo, PhMagnifyingGlass } from '@phosphor-icons/vue'
import { semaforo, type Nivel, type SemaforoAlumno } from '@/api/seguimiento'
import { mensajeDeError } from '@/api/http'
import { NIVELES, etiquetaGrupo } from '@/composables/riesgo'
import NivelRiesgo from '@/components/NivelRiesgo.vue'

/**
 * CU-06: alumnos de mis grupos por riesgo de inasistencia. Se pide una vez y
 * se filtra en el navegador (cientos de filas, no miles).
 */
const filas = ref<SemaforoAlumno[]>([])
const cargando = ref(true)
const errorCarga = ref('')

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    filas.value = await semaforo()
  } catch (e) {
    errorCarga.value = mensajeDeError(e)
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

const ORDEN: Nivel[] = ['alto', 'medio', 'bajo']
const grupos = computed(() =>
  [...new Map(filas.value.map((f) => [f.grupo.id, f.grupo])).values()].sort((a, b) =>
    etiquetaGrupo(a).localeCompare(etiquetaGrupo(b)),
  ),
)

const buscar = ref('')
const grupoId = ref<number | ''>('')
const nivel = ref<Nivel | ''>('')

/** Filtro sin el nivel: los conteos de arriba responden a grupo y búsqueda. */
const delGrupo = computed(() => {
  const t = buscar.value.trim().toLowerCase()
  return filas.value.filter(
    (f) =>
      (!grupoId.value || f.grupo.id === grupoId.value) &&
      (!t || f.alumno.nombre.toLowerCase().includes(t) || f.alumno.matricula.includes(t)),
  )
})
const visibles = computed(() =>
  delGrupo.value.filter((f) => !nivel.value || f.nivel_riesgo === nivel.value),
)
const conteo = computed(
  () =>
    Object.fromEntries(
      ORDEN.map((n) => [n, delGrupo.value.filter((f) => f.nivel_riesgo === n).length]),
    ) as Record<Nivel, number>,
)
const pct = (n: number) =>
  delGrupo.value.length ? Math.round((n * 100) / delGrupo.value.length) : 0

const alternarNivel = (n: Nivel) => (nivel.value = nivel.value === n ? '' : n)
</script>

<template>
  <div>
    <p v-if="cargando" role="status" class="text-sm text-tinta-500">Calculando el semáforo…</p>

    <div v-else-if="errorCarga" role="alert" class="max-w-xl border-t border-linea pt-6">
      <p class="text-[15px] text-tinta-800">{{ errorCarga }}</p>
      <button type="button" class="btn-secundario mt-4" @click="cargar">Reintentar</button>
    </div>

    <p
      v-else-if="!filas.length"
      class="max-w-xl border-t border-linea pt-6 text-[15px] text-tinta-600"
    >
      No tienes grupos asignados en el periodo activo. Pide a administración que te los asigne.
    </p>

    <template v-else>
      <!-- Resumen: tres conteos (botones que filtran) y la proporción en una barra -->
      <section aria-label="Resumen por nivel">
        <div class="grid gap-3 sm:grid-cols-3">
          <button
            v-for="n in ORDEN"
            :key="n"
            type="button"
            class="rounded-lg border bg-white px-5 py-4 text-left transition hover:border-tinta-400"
            :class="nivel === n ? 'border-marca-800 ring-1 ring-marca-800' : 'border-linea'"
            :aria-pressed="nivel === n"
            @click="alternarNivel(n)"
          >
            <span class="flex items-center gap-2 text-sm font-medium text-tinta-600">
              <span
                class="size-2.5 rounded-full"
                :style="{ background: NIVELES[n].punto }"
                aria-hidden="true"
              />
              Riesgo {{ NIVELES[n].etiqueta.toLowerCase() }}
            </span>
            <span class="mt-1 block text-3xl font-semibold tabular-nums text-tinta-900">{{
              conteo[n]
            }}</span>
            <span class="text-[13px] text-tinta-500 tabular-nums"
              >{{ pct(conteo[n]) }} % de {{ delGrupo.length }} alumnos</span
            >
          </button>
        </div>
        <div class="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
          <div
            v-for="n in ORDEN"
            v-show="conteo[n]"
            :key="n"
            :title="`${NIVELES[n].etiqueta}: ${conteo[n]}`"
            :style="{ flexGrow: conteo[n], background: NIVELES[n].punto }"
          />
        </div>
      </section>

      <div class="mt-8 flex flex-wrap items-end gap-3">
        <div class="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <label for="buscar-semaforo" class="sr-only">Buscar por nombre o matrícula</label>
          <PhMagnifyingGlass
            :size="16"
            weight="bold"
            class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-tinta-400"
          />
          <input
            id="buscar-semaforo"
            v-model="buscar"
            type="search"
            class="campo pl-9"
            placeholder="Nombre o matrícula"
          />
        </div>
        <div>
          <label for="grupo-semaforo" class="sr-only">Grupo</label>
          <select id="grupo-semaforo" v-model="grupoId" class="campo w-auto pr-8">
            <option value="">Todos mis grupos ({{ grupos.length }})</option>
            <option v-for="g in grupos" :key="g.id" :value="g.id">{{ etiquetaGrupo(g) }}</option>
          </select>
        </div>
        <p class="ml-auto text-sm text-tinta-500 tabular-nums" aria-live="polite">
          {{ visibles.length }} {{ visibles.length === 1 ? 'alumno' : 'alumnos' }}
          <template v-if="nivel">
            en riesgo {{ NIVELES[nivel].etiqueta.toLowerCase() }} ·
            <button
              type="button"
              class="font-medium text-marca-700 underline underline-offset-2"
              @click="nivel = ''"
            >
              ver todos
            </button>
          </template>
        </p>
      </div>

      <div class="relative mt-4 overflow-x-auto rounded-lg border border-linea bg-white">
        <table class="w-full min-w-[46rem] text-sm">
          <caption class="sr-only">
            Alumnos por riesgo de inasistencia, del mayor al menor
          </caption>
          <thead>
            <tr class="border-b border-linea text-left text-tinta-900">
              <th scope="col" class="px-4 py-3 font-semibold">Alumno</th>
              <th scope="col" class="px-4 py-3 font-semibold">Grupo</th>
              <th scope="col" class="px-4 py-3 font-semibold">Inasistencia</th>
              <th scope="col" class="px-4 py-3 font-semibold">Faltas</th>
              <th scope="col" class="px-4 py-3 font-semibold">Nivel</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-linea">
            <tr v-if="!visibles.length">
              <td colspan="5" class="px-4 py-8 text-center text-tinta-500">
                Nadie coincide con el filtro.
              </td>
            </tr>
            <tr v-for="f in visibles" :key="f.alumno.id" class="hover:bg-tinta-50/60">
              <td class="px-4 py-2.5">
                <RouterLink
                  :to="{ name: 'expediente', params: { id: f.alumno.id } }"
                  class="font-medium text-tinta-900 hover:text-marca-700 hover:underline"
                >
                  {{ f.alumno.nombre }}
                </RouterLink>
                <span class="block font-mono text-xs text-tinta-500">{{ f.alumno.matricula }}</span>
              </td>
              <td class="px-4 py-2.5 whitespace-nowrap">
                {{ f.grupo.grado }}° {{ f.grupo.letra }}
              </td>
              <td class="px-4 py-2.5">
                <div class="flex items-center gap-3">
                  <span class="w-14 text-right font-semibold tabular-nums text-tinta-900">
                    {{ f.porcentaje_inasistencia.toFixed(1) }} %
                  </span>
                  <span
                    class="hidden h-1.5 w-24 overflow-hidden rounded-full bg-tinta-100 sm:block"
                    aria-hidden="true"
                  >
                    <span
                      class="block h-full rounded-full"
                      :style="{
                        width: `${Math.min(100, f.porcentaje_inasistencia * 2.5)}%`,
                        background: NIVELES[f.nivel_riesgo].punto,
                      }"
                    />
                  </span>
                </div>
              </td>
              <td class="px-4 py-2.5 text-tinta-600">
                <span class="font-medium tabular-nums text-tinta-900">{{ f.faltas }}</span>
                <span class="tabular-nums"> de {{ f.clases }}</span>
                <span class="block text-xs text-tinta-500 tabular-nums">
                  {{ f.ausencias }} F · {{ f.retardos }} R · {{ f.justificadas }} J
                  <template v-if="f.racha_dias">
                    · {{ f.racha_dias }} {{ f.racha_dias === 1 ? 'día' : 'días' }} seguidos sin
                    venir</template
                  >
                </span>
              </td>
              <td class="px-4 py-2.5"><NivelRiesgo :nivel="f.nivel_riesgo" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="mt-5 flex max-w-3xl gap-2 text-[13px] leading-relaxed text-tinta-500">
        <PhInfo :size="16" weight="bold" class="mt-0.5 shrink-0" />
        <span>
          Inasistencia = faltas entre clases con lista en todo el periodo, aunque el alumno haya
          cambiado de grupo. Las faltas (F) cuentan completas; los retardos (R) se convierten en
          faltas según Configuración (de fábrica, 3 = 1 falta); las justificadas (J) no cuentan. La
          barra se llena con 40 % o más. Las bajas no aparecen.
        </span>
      </p>
    </template>
  </div>
</template>
