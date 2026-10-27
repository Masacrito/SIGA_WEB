<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { PhMagnifyingGlass, PhPlus } from '@phosphor-icons/vue'
import { observaciones, registrarObservacion, type Observacion } from '@/api/seguimiento'
import { buscarAlumnos, type Alumno } from '@/api/admin'
import { erroresDeCampos, mensajeDeError } from '@/api/http'
import { avisar } from '@/composables/avisos'
import { fechaCorta } from '@/composables/riesgo'
import VentanaFormulario from '@/components/VentanaFormulario.vue'
import CampoFormulario from '@/components/CampoFormulario.vue'

/**
 * Bitácora tutorial reciente de mis grupos (las 100 últimas). La bitácora
 * completa de un alumno está en su expediente; aquí se ve el día a día y se
 * registra rápido sin ir a buscar el expediente.
 */
const lista = ref<Observacion[]>([])
const cargando = ref(true)
const error = ref('')
const filtro = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    lista.value = await observaciones()
  } catch (e) {
    error.value = mensajeDeError(e)
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const visibles = computed(() => {
  const f = sinAcentos(filtro.value.trim())
  return f
    ? lista.value.filter((o) =>
        sinAcentos(
          `${o.alumno.nombre} ${o.alumno.matricula} ${o.texto} ${o.orientador.nombre}`,
        ).includes(f),
      )
    : lista.value
})

// Nueva observación: elegir alumno (de mis grupos) y escribir
const abierto = ref(false)
const busqueda = ref('')
const encontrados = ref<Alumno[]>([])
const alumnoId = ref<number | null>(null)
const texto = ref('')
const errores = ref<Record<string, string>>({})
const guardando = ref(false)
let pausa: ReturnType<typeof setTimeout> | undefined
let ultima = 0

function nueva() {
  busqueda.value = ''
  encontrados.value = []
  alumnoId.value = null
  texto.value = ''
  errores.value = {}
  abierto.value = true
}

watch(busqueda, (t) => {
  clearTimeout(pausa)
  t = t.trim()
  if (t.length < 3) {
    encontrados.value = alumnoId.value
      ? encontrados.value.filter((a) => a.id === alumnoId.value)
      : []
    return
  }
  pausa = setTimeout(async () => {
    const esta = ++ultima
    try {
      const r = await buscarAlumnos(/^\d+$/.test(t) ? { matricula: t } : { nombre: t })
      if (esta === ultima) encontrados.value = r.filter((a) => a.activo).slice(0, 8)
    } catch (e) {
      if (esta === ultima) errores.value = { alumno_id: mensajeDeError(e) }
    }
  }, 250)
})

async function guardar() {
  errores.value = {}
  if (!alumnoId.value) errores.value.alumno_id = 'Elige al alumno.'
  if (!texto.value.trim()) errores.value.texto = 'Escribe la observación.'
  if (Object.keys(errores.value).length) return
  guardando.value = true
  try {
    lista.value = [await registrarObservacion(alumnoId.value!, texto.value), ...lista.value]
    avisar('Observación registrada.')
    abierto.value = false
  } catch (e) {
    errores.value = erroresDeCampos(e)
    if (!Object.keys(errores.value).length) avisar(mensajeDeError(e), 'error')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <div class="mb-5 flex flex-wrap items-end gap-3">
      <div class="relative min-w-[14rem] flex-1">
        <label for="obs-filtro" class="etiqueta">Filtrar</label>
        <PhMagnifyingGlass
          :size="18"
          weight="bold"
          class="pointer-events-none absolute bottom-2.5 left-3 text-tinta-400"
        />
        <input
          id="obs-filtro"
          v-model="filtro"
          type="search"
          class="campo pl-10"
          placeholder="Alumno, matrícula o texto"
          autocomplete="off"
        />
      </div>
      <button type="button" class="btn-primario" @click="nueva">
        <PhPlus :size="16" weight="bold" />
        Nueva observación
      </button>
    </div>

    <p v-if="cargando" role="status" class="text-sm text-tinta-500">Cargando bitácora…</p>
    <div v-else-if="error" role="alert">
      <p class="text-[15px] text-tinta-800">{{ error }}</p>
      <button type="button" class="btn-secundario mt-4" @click="cargar">Reintentar</button>
    </div>
    <p v-else-if="!lista.length" class="text-[15px] text-tinta-600">
      Todavía no hay observaciones en tus grupos.
    </p>
    <template v-else>
      <p class="mb-2 text-[13px] text-tinta-500" aria-live="polite">
        <template v-if="filtro.trim()">{{ visibles.length }} de {{ lista.length }}</template>
        <template v-else
          >{{ lista.length === 100 ? 'Las 100 más recientes' : `${lista.length} observaciones` }} ·
          la bitácora completa de cada alumno está en su expediente</template
        >
      </p>
      <ul class="divide-y divide-linea rounded-lg border border-linea bg-white">
        <li
          v-for="(o, i) in visibles"
          :key="o.id"
          class="entrada px-4 py-3"
          :style="{ '--i': Math.min(i, 8) }"
        >
          <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <RouterLink
              :to="{ name: 'expediente', params: { id: o.alumno.id } }"
              class="font-medium text-tinta-900 hover:text-marca-700 hover:underline"
              >{{ o.alumno.nombre }}</RouterLink
            >
            <span class="text-xs text-tinta-500">
              <span class="first-letter:uppercase">{{ fechaCorta(o.fecha) }}</span> ·
              {{ o.orientador.nombre }}
            </span>
          </div>
          <p class="mt-1 whitespace-pre-line text-sm text-tinta-700">{{ o.texto }}</p>
        </li>
      </ul>
      <p v-if="!visibles.length" class="mt-3 text-sm text-tinta-500">
        Nada coincide con el filtro.
      </p>
    </template>

    <VentanaFormulario
      v-model:abierto="abierto"
      titulo="Nueva observación"
      descripcion="Queda en la bitácora del alumno, con tu nombre y la fecha de hoy."
      @enviar="guardar"
    >
      <CampoFormulario
        id="obs-alumno"
        etiqueta="Alumno"
        :error="errores.alumno_id"
        ayuda="Apellido, nombre o matrícula (al menos 3 letras o números)."
      >
        <template #default="{ invalido, describe }">
          <input
            id="obs-alumno"
            v-model="busqueda"
            type="search"
            class="campo"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
            autocomplete="off"
          />
        </template>
      </CampoFormulario>
      <fieldset v-if="encontrados.length" class="-mt-2">
        <legend class="sr-only">Elige al alumno</legend>
        <label
          v-for="a in encontrados"
          :key="a.id"
          class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-marca-50"
          :class="{ 'bg-marca-50': alumnoId === a.id }"
        >
          <input
            v-model="alumnoId"
            type="radio"
            name="obs-alumno-elegido"
            :value="a.id"
            class="accent-marca-800"
          />
          <span class="flex-1 text-tinta-900">{{ a.nombre }}</span>
          <span class="font-mono text-xs text-tinta-500">{{ a.matricula }}</span>
        </label>
      </fieldset>
      <CampoFormulario id="obs-texto" etiqueta="Observación" :error="errores.texto">
        <template #default="{ invalido, describe }">
          <textarea
            id="obs-texto"
            v-model="texto"
            rows="4"
            maxlength="2000"
            class="campo resize-y"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
            placeholder="Qué se habló, con quién y qué se acordó"
          />
        </template>
      </CampoFormulario>
      <template #acciones>
        <button type="button" class="btn-secundario" @click="abierto = false">Cancelar</button>
        <button type="submit" class="btn-primario" :disabled="guardando">
          {{ guardando ? 'Guardando…' : 'Registrar' }}
        </button>
      </template>
    </VentanaFormulario>
  </div>
</template>
