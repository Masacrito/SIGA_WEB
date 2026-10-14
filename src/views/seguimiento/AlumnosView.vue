<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import { buscarAlumnos, type Alumno } from '@/api/admin'
import { mensajeDeError } from '@/api/http'

/** Buscador de alumnos de mis grupos → expediente. */
const busqueda = ref('')
const resultados = ref<Alumno[]>([])
const buscando = ref(false)
const error = ref('')
let pausa: ReturnType<typeof setTimeout> | undefined
let ultima = 0

async function buscar() {
  const t = busqueda.value.trim()
  if (t.length < 3) {
    resultados.value = []
    return
  }
  const esta = ++ultima
  buscando.value = true
  error.value = ''
  try {
    // Puros dígitos = matrícula; si no, nombre (apellidos primero, como en lista)
    const r = await buscarAlumnos(/^\d+$/.test(t) ? { matricula: t } : { nombre: t })
    if (esta === ultima) resultados.value = r
  } catch (e) {
    error.value = mensajeDeError(e)
  } finally {
    buscando.value = false
  }
}
watch(busqueda, () => {
  clearTimeout(pausa)
  pausa = setTimeout(buscar, 300)
})
</script>

<template>
  <div class="max-w-3xl">
    <div class="relative">
      <label for="buscar-alumno" class="etiqueta">Matrícula, apellido o nombre</label>
      <PhMagnifyingGlass
        :size="18"
        weight="bold"
        class="pointer-events-none absolute bottom-3 left-3.5 text-tinta-400"
      />
      <input
        id="buscar-alumno"
        v-model="busqueda"
        type="search"
        class="campo py-3 pl-11 text-base"
        placeholder="Por ejemplo: Hernández, Ximena o 2603500012"
        autocomplete="off"
      />
    </div>
    <p class="mt-2 text-[13px] text-tinta-500" aria-live="polite">
      <template v-if="busqueda.trim().length < 3">Escribe al menos 3 letras o números.</template>
      <template v-else-if="buscando">Buscando…</template>
      <template v-else-if="error">{{ error }}</template>
      <template v-else-if="!resultados.length">Nadie de tus grupos coincide.</template>
      <template v-else-if="resultados.length === 50"
        >Se muestran los primeros 50: afina la búsqueda.</template
      >
      <template v-else
        >{{ resultados.length }} {{ resultados.length === 1 ? 'alumno' : 'alumnos' }}</template
      >
    </p>

    <ul
      v-if="resultados.length"
      class="mt-4 divide-y divide-linea rounded-lg border border-linea bg-white"
    >
      <li
        v-for="(a, i) in resultados"
        :key="a.id"
        class="entrada"
        :style="{ '--i': Math.min(i, 8) }"
      >
        <RouterLink
          :to="{ name: 'expediente', params: { id: a.id } }"
          class="flex items-center justify-between gap-4 px-4 py-3 hover:bg-marca-50"
        >
          <span>
            <span
              class="block font-medium text-tinta-900"
              :class="{ 'text-tinta-500': !a.activo }"
              >{{ a.nombre }}</span
            >
            <span class="block text-xs text-tinta-500">
              {{ a.situacion_academica ?? 'sin inscripción vigente'
              }}<template v-if="!a.activo"> · baja</template>
            </span>
          </span>
          <span class="font-mono text-xs text-tinta-500">{{ a.matricula }}</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
