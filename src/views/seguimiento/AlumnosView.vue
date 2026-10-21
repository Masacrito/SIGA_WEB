<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { PhMagnifyingGlass, PhUserPlus } from '@phosphor-icons/vue'
import {
  buscarAlumnos,
  catalogo,
  listaDeGrupo,
  type Alumno,
  type AlumnoAdmin,
  type Grupo,
} from '@/api/admin'
import { mensajeDeError } from '@/api/http'
import { etiquetaGrupo } from '@/composables/riesgo'
import { useAuthStore } from '@/stores/auth'
import FormularioAlumno from '@/components/FormularioAlumno.vue'

/**
 * Buscador de alumnos de mis grupos → expediente. Con gestionar_catalogos,
 * además: ver la lista completa de un grupo y dar de alta alumnos.
 */
const auth = useAuthStore()
const router = useRouter()
const administra = auth.puede('gestionar_catalogos')
const busqueda = ref('')
const resultados = ref<Alumno[]>([])
const buscando = ref(false)
const error = ref('')
let pausa: ReturnType<typeof setTimeout> | undefined
let ultima = 0

// Lista de un grupo (administrador)
const grupos = ref<Grupo[]>([])
const grupoId = ref<number | ''>('')
onMounted(async () => {
  if (!administra) return
  try {
    const activo = (await catalogo.periodos()).find((p) => p.estado === 'activo')
    grupos.value = activo ? await catalogo.grupos(activo.id) : []
  } catch {
    // Sin catálogo de grupos queda solo el buscador
  }
})

async function buscar() {
  const t = busqueda.value.trim()
  if (grupoId.value && !t) {
    const esta = ++ultima
    buscando.value = true
    error.value = ''
    try {
      const r = await listaDeGrupo(grupoId.value)
      if (esta === ultima) resultados.value = r
    } catch (e) {
      error.value = mensajeDeError(e)
    } finally {
      buscando.value = false
    }
    return
  }
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
watch(grupoId, () => {
  busqueda.value = ''
  buscar()
})

const nuevoAbierto = ref(false)
function inscrito(a: AlumnoAdmin) {
  if (grupoId.value && a.grupo?.id === grupoId.value) buscar()
  else router.push({ name: 'expediente', params: { id: a.id } })
}
</script>

<template>
  <div class="max-w-3xl">
    <div v-if="administra" class="mb-4 flex flex-wrap items-end gap-3">
      <div class="min-w-[12rem]">
        <label for="lista-grupo" class="etiqueta">Lista de un grupo</label>
        <select id="lista-grupo" v-model="grupoId" class="campo">
          <option value="">Todos (buscar)</option>
          <option v-for="g in grupos" :key="g.id" :value="g.id">{{ etiquetaGrupo(g) }}</option>
        </select>
      </div>
      <button type="button" class="btn-primario ml-auto" @click="nuevoAbierto = true">
        <PhUserPlus :size="16" weight="bold" />
        Nuevo alumno
      </button>
    </div>
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
      <template v-if="busqueda.trim().length < 3 && !(grupoId && !busqueda.trim())"
        >Escribe al menos 3 letras o números.</template
      >
      <template v-else-if="buscando">Buscando…</template>
      <template v-else-if="error">{{ error }}</template>
      <template v-else-if="!resultados.length">{{
        grupoId && !busqueda.trim()
          ? 'Este grupo todavía no tiene alumnos inscritos.'
          : 'Nadie de tus grupos coincide.'
      }}</template>
      <template v-else-if="resultados.length === 50 && !grupoId"
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

    <FormularioAlumno
      v-if="administra"
      v-model:abierto="nuevoAbierto"
      :grupo-inicial="grupoId || undefined"
      @guardado="inscrito"
    />
  </div>
</template>
