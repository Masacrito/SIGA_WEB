<script setup lang="ts">
import { ref, watch } from 'vue'
import { justificar, type RegistroHistorial } from '@/api/seguimiento'
import { erroresDeCampos, mensajeDeError } from '@/api/http'
import { avisar } from '@/composables/avisos'
import { ESTADOS, fechaCorta } from '@/composables/riesgo'
import VentanaFormulario from './VentanaFormulario.vue'
import CampoFormulario from './CampoFormulario.vue'

/**
 * Justificante de un día: casi siempre cubre todas sus faltas y retardos de esa
 * fecha (una cita médica, un trámite), así que vienen todas marcadas. Una
 * petición por clase; si alguna falla, las demás se quedan guardadas.
 */
const abierto = defineModel<boolean>('abierto', { required: true })
const props = defineProps<{ fecha: string; clases: RegistroHistorial[] }>()
const emit = defineEmits<{ guardado: [] }>()

const elegidas = ref<number[]>([])
const motivo = ref('')
const evidencia = ref('')
const errores = ref<Record<string, string>>({})
const enviando = ref(false)

watch(abierto, (si) => {
  if (!si) return
  elegidas.value = props.clases.map((c) => c.id)
  motivo.value = ''
  evidencia.value = ''
  errores.value = {}
})

async function enviar() {
  errores.value = {}
  if (!elegidas.value.length) {
    errores.value.clases = 'Elige al menos una clase.'
    return
  }
  if (!motivo.value.trim()) {
    errores.value.motivo = 'Escribe el motivo del justificante.'
    return
  }
  enviando.value = true
  let hechas = 0
  try {
    for (const id of elegidas.value) {
      await justificar(id, motivo.value.trim(), evidencia.value.trim())
      hechas++
    }
    avisar(hechas === 1 ? 'Clase justificada.' : `${hechas} clases justificadas.`)
    abierto.value = false
  } catch (e) {
    errores.value = erroresDeCampos(e)
    if (!Object.keys(errores.value).length) {
      avisar((hechas ? `Se justificaron ${hechas}; ` : '') + mensajeDeError(e), 'error')
    }
  } finally {
    enviando.value = false
    if (hechas) emit('guardado')
  }
}
</script>

<template>
  <VentanaFormulario
    v-model:abierto="abierto"
    titulo="Justificar inasistencia"
    :descripcion="`Del ${fechaCorta(fecha)}. Sigue contando como clase, ya no como falta.`"
    @enviar="enviar"
  >
    <fieldset>
      <legend class="etiqueta">Clases que cubre</legend>
      <ul class="space-y-1.5" :aria-describedby="errores.clases ? 'just-clases-error' : undefined">
        <li v-for="c in clases" :key="c.id">
          <label class="flex cursor-pointer items-center gap-3 text-sm">
            <input
              v-model="elegidas"
              type="checkbox"
              :value="c.id"
              class="size-4 accent-marca-800"
            />
            <span
              class="rounded px-1.5 py-0.5 text-xs font-semibold"
              :class="ESTADOS[c.estado].clase"
            >
              {{ ESTADOS[c.estado].etiqueta }}
            </span>
            <span class="font-mono text-xs text-tinta-500">{{ c.hora_inicio }}</span>
            <span class="text-tinta-800">{{ c.materia.nombre }}</span>
          </label>
        </li>
      </ul>
      <p v-if="errores.clases" id="just-clases-error" class="mt-1.5 text-[13px] text-riesgo-alto">
        {{ errores.clases }}
      </p>
    </fieldset>

    <CampoFormulario id="just-motivo" etiqueta="Motivo" :error="errores.motivo">
      <template #default="{ invalido, describe }">
        <input
          id="just-motivo"
          v-model="motivo"
          type="text"
          maxlength="255"
          class="campo"
          :class="{ 'campo-error': invalido }"
          :aria-invalid="invalido"
          :aria-describedby="describe"
          placeholder="Por ejemplo: consulta médica (constancia del IMSS)"
        />
      </template>
    </CampoFormulario>

    <CampoFormulario
      id="just-evidencia"
      etiqueta="Liga a la evidencia (opcional)"
      :error="errores.evidencia_url"
      ayuda="Si el justificante está escaneado en una carpeta compartida."
    >
      <template #default="{ invalido, describe }">
        <input
          id="just-evidencia"
          v-model="evidencia"
          type="url"
          maxlength="255"
          class="campo"
          :class="{ 'campo-error': invalido }"
          :aria-invalid="invalido"
          :aria-describedby="describe"
          placeholder="https://"
        />
      </template>
    </CampoFormulario>

    <template #acciones>
      <button type="button" class="btn-secundario" @click="abierto = false">Cancelar</button>
      <button type="submit" class="btn-primario" :disabled="enviando">
        {{ enviando ? 'Guardando…' : 'Justificar' }}
      </button>
    </template>
  </VentanaFormulario>
</template>
