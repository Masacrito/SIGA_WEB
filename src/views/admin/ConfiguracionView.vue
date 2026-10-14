<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  guardarConfiguracion,
  guardarUmbrales,
  listarConfiguraciones,
  listarUmbrales,
  type Configuracion,
  type UmbralRiesgo,
} from '@/api/admin'
import { mensajeDeError } from '@/api/http'
import { avisar } from '@/composables/avisos'

/**
 * CU-19: rangos del semáforo y parámetros generales.
 * Los tres niveles deben cubrir 0–100 sin huecos, así que aquí solo se editan
 * los dos cortes (bajo→medio y medio→alto); el backend vuelve a validarlo.
 */
const umbrales = ref<UmbralRiesgo[]>([])
const configs = ref<Configuracion[]>([])
const cargando = ref(true)
const errorCarga = ref('')

const cortes = reactive({ medio: 0, alto: 0 })
const faltas = reactive<Record<number, number | ''>>({})
const valores = reactive<Record<string, string>>({})

function tomarUmbrales(us: UmbralRiesgo[]) {
  umbrales.value = us
  cortes.medio = us[1]?.porcentaje_min ?? 10
  cortes.alto = us[2]?.porcentaje_min ?? 20
  for (const u of us) faltas[u.id] = u.faltas_consecutivas ?? ''
}

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    const [us, cs] = await Promise.all([listarUmbrales(), listarConfiguraciones()])
    tomarUmbrales(us)
    configs.value = cs
    for (const c of cs) valores[c.clave] = c.valor
  } catch (e) {
    errorCarga.value = mensajeDeError(e)
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

const NOMBRES = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' } as const
const rango = (u: UmbralRiesgo) =>
  ({ bajo: [0, cortes.medio], medio: [cortes.medio, cortes.alto], alto: [cortes.alto, 100] })[
    u.nivel
  ]

const errorCortes = computed(() => {
  if (!(cortes.medio > 0 && cortes.medio < cortes.alto && cortes.alto < 100))
    return 'Los cortes deben ir en orden: 0 < medio < alto < 100.'
  return ''
})
const umbralesCambiaron = computed(
  () =>
    umbrales.value[1]?.porcentaje_min !== cortes.medio ||
    umbrales.value[2]?.porcentaje_min !== cortes.alto ||
    umbrales.value.some((u) => (u.faltas_consecutivas ?? '') !== faltas[u.id]),
)
const guardandoUmbrales = ref(false)

async function guardarSemaforo() {
  if (errorCortes.value) return
  guardandoUmbrales.value = true
  try {
    tomarUmbrales(
      await guardarUmbrales(
        umbrales.value.map((u) => {
          const [min, max] = rango(u)
          return {
            id: u.id,
            porcentaje_min: min,
            porcentaje_max: max,
            faltas_consecutivas: faltas[u.id] === '' ? null : Number(faltas[u.id]),
          }
        }),
      ),
    )
    avisar('Semáforo actualizado.')
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  } finally {
    guardandoUmbrales.value = false
  }
}

// Parámetros generales: cada uno se guarda por separado
const ETIQUETAS: Record<string, string> = {
  escala_calificacion: 'Escala de calificación',
  zona_horaria: 'Zona horaria del plantel',
  retardos_equivalen_falta: 'Retardos que cuentan como una falta',
}
const guardandoClave = ref('')

async function guardarParametro(c: Configuracion) {
  guardandoClave.value = c.clave
  try {
    const nueva = await guardarConfiguracion(c.clave, valores[c.clave] ?? '')
    configs.value = configs.value.map((x) => (x.clave === nueva.clave ? nueva : x))
    avisar(`${ETIQUETAS[c.clave] ?? c.clave}: guardado.`)
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  } finally {
    guardandoClave.value = ''
  }
}
</script>

<template>
  <div>
    <p v-if="cargando" role="status" class="text-sm text-tinta-500">Cargando configuración…</p>

    <div v-else-if="errorCarga" role="alert" class="max-w-xl border-t border-linea pt-6">
      <p class="text-[15px] text-tinta-800">{{ errorCarga }}</p>
      <button type="button" class="btn-secundario mt-4" @click="cargar">Reintentar</button>
    </div>

    <div v-else class="grid max-w-5xl gap-10 lg:grid-cols-2">
      <section aria-labelledby="titulo-semaforo" class="min-w-0">
        <h2 id="titulo-semaforo" class="text-base font-semibold text-tinta-900">
          Semáforo de riesgo
        </h2>
        <p class="mt-1 text-sm text-tinta-500">
          Porcentaje de inasistencia del alumno. El valor exacto de un corte cuenta en el nivel de
          arriba.
        </p>

        <!-- Barra 0–100: muestra los cortes tal como quedarían -->
        <div class="mt-4 flex h-3 overflow-hidden rounded-full" aria-hidden="true">
          <div
            v-for="u in umbrales"
            :key="u.id"
            :style="{
              width: `${Math.max(0, rango(u)[1]! - rango(u)[0]!)}%`,
              background: u.color_hex,
            }"
          />
        </div>

        <form
          class="mt-4 rounded-lg border border-linea bg-white"
          @submit.prevent="guardarSemaforo"
        >
          <div class="relative overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-linea text-left text-tinta-900">
                  <th scope="col" class="px-4 py-3 font-semibold">Nivel</th>
                  <th scope="col" class="px-4 py-3 font-semibold">Desde</th>
                  <th scope="col" class="px-4 py-3 font-semibold">Hasta</th>
                  <th scope="col" class="px-4 py-3 font-semibold">
                    Faltas seguidas
                    <span class="block text-xs font-normal text-tinta-500">opcional</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-linea">
                <tr v-for="u in umbrales" :key="u.id">
                  <th scope="row" class="px-4 py-3 text-left font-medium text-tinta-900">
                    <span
                      class="mr-2 inline-block size-2.5 rounded-full"
                      :style="{ background: u.color_hex }"
                    />
                    {{ NOMBRES[u.nivel] }}
                  </th>
                  <td class="px-4 py-2 tabular-nums">
                    <template v-if="u.nivel === 'bajo'">0 %</template>
                    <template v-else>{{ rango(u)[0] }} %</template>
                  </td>
                  <td class="px-4 py-2">
                    <label v-if="u.nivel !== 'alto'" class="flex items-center gap-1.5">
                      <span class="sr-only"
                        >Hasta qué porcentaje es nivel {{ NOMBRES[u.nivel] }}</span
                      >
                      <input
                        v-if="u.nivel === 'bajo'"
                        v-model.number="cortes.medio"
                        type="number"
                        min="0.5"
                        max="99"
                        step="0.5"
                        class="campo w-20 px-2 py-1.5 tabular-nums"
                      />
                      <input
                        v-else
                        v-model.number="cortes.alto"
                        type="number"
                        min="1"
                        max="99.5"
                        step="0.5"
                        class="campo w-20 px-2 py-1.5 tabular-nums"
                      />
                      %
                    </label>
                    <span v-else class="tabular-nums">100 %</span>
                  </td>
                  <td class="px-4 py-2">
                    <label>
                      <span class="sr-only"
                        >Faltas seguidas que mandan a nivel {{ NOMBRES[u.nivel] }}</span
                      >
                      <input
                        v-model.number="faltas[u.id]"
                        type="number"
                        min="1"
                        max="60"
                        placeholder="—"
                        class="campo w-20 px-2 py-1.5 tabular-nums"
                      />
                    </label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-t border-linea bg-tinta-50/60 px-4 py-3"
          >
            <p
              class="text-[13px]"
              :class="errorCortes ? 'text-riesgo-alto' : 'text-tinta-500'"
              aria-live="polite"
            >
              {{ errorCortes || 'Aplica a todos los grupos.' }}
            </p>
            <button
              type="submit"
              class="btn-primario"
              :disabled="!!errorCortes || !umbralesCambiaron || guardandoUmbrales"
            >
              {{ guardandoUmbrales ? 'Guardando' : 'Guardar semáforo' }}
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="titulo-parametros" class="min-w-0">
        <h2 id="titulo-parametros" class="text-base font-semibold text-tinta-900">
          Parámetros generales
        </h2>
        <ul class="mt-4 divide-y divide-linea rounded-lg border border-linea bg-white">
          <li v-for="c in configs" :key="c.clave">
            <form class="px-4 py-4" @submit.prevent="guardarParametro(c)">
              <label :for="`conf-${c.clave}`" class="etiqueta">{{
                ETIQUETAS[c.clave] ?? c.clave
              }}</label>
              <p v-if="c.descripcion" class="-mt-1 mb-2 text-[13px] text-tinta-500">
                {{ c.descripcion }}
              </p>
              <div class="flex gap-2">
                <select
                  v-if="c.clave === 'escala_calificacion'"
                  :id="`conf-${c.clave}`"
                  v-model="valores[c.clave]"
                  class="campo"
                >
                  <option value="10">0 a 10</option>
                  <option value="100">0 a 100</option>
                </select>
                <input
                  v-else
                  :id="`conf-${c.clave}`"
                  v-model.trim="valores[c.clave]"
                  :type="c.tipo_dato === 'entero' || c.tipo_dato === 'decimal' ? 'number' : 'text'"
                  class="campo"
                  :class="{ 'font-mono': c.tipo_dato === 'texto' }"
                />
                <button
                  type="submit"
                  class="btn-secundario shrink-0"
                  :disabled="valores[c.clave] === c.valor || guardandoClave === c.clave"
                >
                  Guardar
                </button>
              </div>
            </form>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
