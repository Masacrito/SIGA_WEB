<script setup lang="ts">
import { ref, watch } from 'vue'
import { observaciones, registrarObservacion, type Observacion } from '@/api/seguimiento'
import { erroresDeCampos, mensajeDeError } from '@/api/http'
import { avisar } from '@/composables/avisos'
import { fechaCorta } from '@/composables/riesgo'

/** Bitácora tutorial del alumno (CU-08): lo nuevo arriba y un campo para agregar. */
const props = defineProps<{ alumnoId: number }>()

const lista = ref<Observacion[]>([])
const cargando = ref(true)
const error = ref('')
const texto = ref('')
const errorTexto = ref('')
const guardando = ref(false)

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    lista.value = await observaciones(props.alumnoId)
  } catch (e) {
    error.value = mensajeDeError(e)
  } finally {
    cargando.value = false
  }
}
watch(() => props.alumnoId, cargar, { immediate: true })

async function agregar() {
  errorTexto.value = ''
  if (!texto.value.trim()) {
    errorTexto.value = 'Escribe la observación.'
    return
  }
  guardando.value = true
  try {
    lista.value = [await registrarObservacion(props.alumnoId, texto.value), ...lista.value]
    texto.value = ''
    avisar('Observación registrada.')
  } catch (e) {
    errorTexto.value = erroresDeCampos(e).texto ?? mensajeDeError(e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <section aria-labelledby="titulo-bitacora" class="mt-8">
    <h3 id="titulo-bitacora" class="text-base font-semibold text-tinta-900">
      Bitácora de seguimiento
    </h3>
    <form class="mt-3" novalidate @submit.prevent="agregar">
      <label for="bitacora-texto" class="sr-only">Nueva observación</label>
      <textarea
        id="bitacora-texto"
        v-model="texto"
        rows="3"
        maxlength="2000"
        class="campo resize-y"
        :class="{ 'campo-error': errorTexto }"
        :aria-invalid="!!errorTexto"
        :aria-describedby="errorTexto ? 'bitacora-error' : undefined"
        placeholder="Qué se habló, con quién y qué se acordó"
      />
      <div class="mt-2 flex items-start justify-between gap-3">
        <p v-if="errorTexto" id="bitacora-error" class="text-[13px] text-riesgo-alto">
          {{ errorTexto }}
        </p>
        <button type="submit" class="btn-primario ml-auto px-3 py-1.5" :disabled="guardando">
          {{ guardando ? 'Guardando…' : 'Agregar observación' }}
        </button>
      </div>
    </form>

    <p v-if="cargando" role="status" class="mt-3 text-sm text-tinta-500">Cargando bitácora…</p>
    <p v-else-if="error" role="alert" class="mt-3 text-sm text-tinta-800">{{ error }}</p>
    <p v-else-if="!lista.length" class="mt-3 text-sm text-tinta-500">
      Todavía no hay observaciones.
    </p>
    <ol v-else class="mt-4 space-y-4 border-l-2 border-marca-100 pl-4">
      <li v-for="o in lista" :key="o.id">
        <p class="text-xs text-tinta-500">
          <span class="font-medium text-tinta-700 first-letter:uppercase">{{
            fechaCorta(o.fecha)
          }}</span>
          · {{ o.orientador.nombre }}
        </p>
        <p class="mt-0.5 whitespace-pre-line text-sm text-tinta-800">{{ o.texto }}</p>
      </li>
    </ol>
  </section>
</template>
