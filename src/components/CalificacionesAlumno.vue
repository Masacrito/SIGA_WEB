<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PhPencilSimple } from '@phosphor-icons/vue'
import { calificaciones, corregirCalificacion, type Calificacion } from '@/api/seguimiento'
import { erroresDeCampos, mensajeDeError } from '@/api/http'
import { avisar } from '@/composables/avisos'
import { useAuthStore } from '@/stores/auth'
import VentanaFormulario from './VentanaFormulario.vue'
import CampoFormulario from './CampoFormulario.vue'

/** Boleta del periodo activo: materia × parcial. Quien puede editar, corrige una celda. */
const props = defineProps<{ alumnoId: number }>()
const puedeEditar = useAuthStore().puede('editar_calificaciones')
const PARCIALES = [1, 2, 3] as const

const lista = ref<Calificacion[]>([])
const cargando = ref(true)
const error = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    lista.value = await calificaciones(props.alumnoId)
  } catch (e) {
    error.value = mensajeDeError(e)
  } finally {
    cargando.value = false
  }
}
watch(() => props.alumnoId, cargar, { immediate: true })

/** Una fila por materia; "regular" y "cursadora" del mismo parcial van en filas aparte. */
const filas = computed(() => {
  const m = new Map<
    string,
    { materia: Calificacion['materia']; tipo: string; p: Record<number, Calificacion> }
  >()
  for (const c of lista.value) {
    const clave = `${c.materia.id}-${c.tipo}`
    const fila = m.get(clave) ?? { materia: c.materia, tipo: c.tipo, p: {} }
    fila.p[c.parcial] = c
    m.set(clave, fila)
  }
  return [...m.values()]
})
const parcialesConDatos = computed(() =>
  PARCIALES.filter((n) => lista.value.some((c) => c.parcial === n)),
)
/** Reprobada: NA, o menos de 6 (escala 10) / 60 (escala 100). Se resalta con negritas, no solo color. */
function reprobada(c: Calificacion) {
  if (c.materia.tipo_evaluacion === 'alfanumerica') return c.calificacion === 'NA'
  const n = Number(c.calificacion)
  return n < (n > 10 ? 60 : 6) // ponytail: deduce la escala del valor; un 8 en escala 100 no se marcaría
}

// Corrección
const editando = ref<Calificacion | null>(null)
const abierto = ref(false)
const valor = ref('')
const errorCampo = ref('')
const guardando = ref(false)

function editar(c: Calificacion) {
  editando.value = c
  valor.value = c.calificacion
  errorCampo.value = ''
  abierto.value = true
}

async function guardar() {
  if (!editando.value) return
  guardando.value = true
  errorCampo.value = ''
  try {
    const nueva = await corregirCalificacion(editando.value.id, valor.value)
    lista.value = lista.value.map((c) => (c.id === nueva.id ? nueva : c))
    avisar('Calificación corregida.')
    abierto.value = false
  } catch (e) {
    errorCampo.value = erroresDeCampos(e).calificacion ?? mensajeDeError(e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <section aria-labelledby="titulo-calificaciones" class="mt-8">
    <h3 id="titulo-calificaciones" class="text-base font-semibold text-tinta-900">
      Calificaciones
    </h3>
    <p v-if="cargando" role="status" class="mt-3 text-sm text-tinta-500">
      Cargando calificaciones…
    </p>
    <p v-else-if="error" role="alert" class="mt-3 text-sm text-tinta-800">
      {{ error }}
      <button type="button" class="ml-2 font-medium text-marca-700 underline" @click="cargar">
        Reintentar
      </button>
    </p>
    <p v-else-if="!filas.length" class="mt-3 text-sm text-tinta-500">
      Sin calificaciones registradas en el periodo.
    </p>
    <div v-else class="relative mt-3 overflow-x-auto rounded-lg border border-linea bg-white">
      <table class="w-full min-w-[28rem] text-sm">
        <thead>
          <tr class="border-b border-linea text-left text-tinta-900">
            <th scope="col" class="px-4 py-2.5 font-semibold">Materia</th>
            <th
              v-for="n in parcialesConDatos"
              :key="n"
              scope="col"
              class="w-28 px-4 py-2.5 text-right font-semibold"
            >
              Parcial {{ n }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-linea tabular-nums">
          <tr v-for="f in filas" :key="`${f.materia.id}-${f.tipo}`">
            <th scope="row" class="px-4 py-2.5 text-left font-normal text-tinta-900">
              {{ f.materia.nombre }}
              <span v-if="f.tipo === 'cursadora'" class="text-xs text-tinta-500">(cursadora)</span>
            </th>
            <td v-for="n in parcialesConDatos" :key="n" class="px-2 py-1.5 text-right">
              <template v-if="f.p[n]">
                <component
                  :is="puedeEditar ? 'button' : 'span'"
                  :type="puedeEditar ? 'button' : undefined"
                  class="group inline-flex items-center gap-1.5 rounded-md px-2 py-1"
                  :class="[
                    puedeEditar && 'hover:bg-marca-50 focus-visible:bg-marca-50',
                    reprobada(f.p[n]!) ? 'font-semibold text-[#b02020]' : 'text-tinta-900',
                  ]"
                  :aria-label="
                    puedeEditar
                      ? `Corregir ${f.materia.nombre}, parcial ${n}: ${f.p[n]!.calificacion}`
                      : undefined
                  "
                  :title="
                    f.p[n]!.editado_por
                      ? `Corregida a mano por ${f.p[n]!.editado_por!.nombre}`
                      : undefined
                  "
                  @click="puedeEditar && editar(f.p[n]!)"
                >
                  <span
                    v-if="f.p[n]!.origen === 'manual'"
                    class="size-1.5 rounded-full bg-marca-500"
                    aria-hidden="true"
                  />
                  {{ f.p[n]!.calificacion }}
                  <PhPencilSimple
                    v-if="puedeEditar"
                    :size="13"
                    class="text-tinta-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </component>
              </template>
              <span v-else class="px-2 text-tinta-300" aria-label="Sin calificación">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p
      v-if="filas.some((f) => Object.values(f.p).some((c) => c.origen === 'manual'))"
      class="mt-2 text-xs text-tinta-500"
    >
      <span class="mr-1 inline-block size-1.5 rounded-full bg-marca-500 align-middle" /> corregida a
      mano (pasa el cursor para ver quién).
    </p>

    <VentanaFormulario
      v-model:abierto="abierto"
      titulo="Corregir calificación"
      :descripcion="
        editando ? `${editando.materia.nombre}, parcial ${editando.parcial}` : undefined
      "
      @enviar="guardar"
    >
      <CampoFormulario
        id="cal-valor"
        etiqueta="Calificación"
        :error="errorCampo"
        :ayuda="
          editando?.materia.tipo_evaluacion === 'alfanumerica'
            ? 'A (acreditada) o NA (no acreditada).'
            : 'Número de la escala configurada, con un decimal como máximo.'
        "
      >
        <template #default="{ invalido, describe }">
          <select
            v-if="editando?.materia.tipo_evaluacion === 'alfanumerica'"
            id="cal-valor"
            v-model="valor"
            class="campo"
            :aria-describedby="describe"
          >
            <option value="A">A — acreditada</option>
            <option value="NA">NA — no acreditada</option>
          </select>
          <input
            v-else
            id="cal-valor"
            v-model="valor"
            inputmode="decimal"
            maxlength="5"
            class="campo w-32 font-mono"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
            autocomplete="off"
          />
        </template>
      </CampoFormulario>
      <p class="text-[13px] text-tinta-500">Queda registrado quién la corrigió.</p>
      <template #acciones>
        <button type="button" class="btn-secundario" @click="abierto = false">Cancelar</button>
        <button type="submit" class="btn-primario" :disabled="guardando">
          {{ guardando ? 'Guardando…' : 'Guardar' }}
        </button>
      </template>
    </VentanaFormulario>
  </section>
</template>
