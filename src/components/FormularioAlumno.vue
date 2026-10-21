<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  catalogo,
  crearAlumno,
  editarAlumno,
  type AlumnoAdmin,
  type AlumnoInput,
  type Grupo,
} from '@/api/admin'
import { erroresDeCampos, mensajeDeError } from '@/api/http'
import { avisar } from '@/composables/avisos'
import { etiquetaGrupo } from '@/composables/riesgo'
import VentanaFormulario from '@/components/VentanaFormulario.vue'
import CampoFormulario from '@/components/CampoFormulario.vue'

/**
 * Alta y edición manual de un alumno. El grupo es su inscripción del periodo
 * activo: es lo que lo pone en la lista que ve el docente en la app.
 */
type AlumnoEditable = Pick<AlumnoAdmin, 'id' | 'matricula' | 'nombre' | 'activo'> & {
  situacion_academica?: AlumnoAdmin['situacion_academica'] | null
  grupo?: Pick<Grupo, 'id'> | null
}

const abierto = defineModel<boolean>('abierto', { required: true })
const props = defineProps<{ alumno?: AlumnoEditable | null; grupoInicial?: number }>()
const emit = defineEmits<{ guardado: [alumno: AlumnoAdmin] }>()

const SITUACIONES = ['regular', 'irregular', 'recursador', 'extemporaneo'] as const
const grupos = ref<Grupo[]>([])
const form = reactive({
  matricula: '',
  nombre: '',
  grupo_id: 0,
  situacion_academica: 'regular' as (typeof SITUACIONES)[number],
  activo: true,
})
const errores = ref<Record<string, string>>({})
const guardando = ref(false)
const editando = computed(() => !!props.alumno)

watch(abierto, async (si) => {
  if (!si) return
  const a = props.alumno
  Object.assign(form, {
    matricula: a?.matricula ?? '',
    nombre: a?.nombre ?? '',
    grupo_id: a?.grupo?.id ?? props.grupoInicial ?? 0,
    situacion_academica: a?.situacion_academica ?? 'regular',
    activo: a?.activo ?? true,
  })
  errores.value = {}
  if (!grupos.value.length) {
    try {
      const activo = (await catalogo.periodos()).find((p) => p.estado === 'activo')
      grupos.value = activo ? await catalogo.grupos(activo.id) : []
    } catch (e) {
      avisar(mensajeDeError(e), 'error')
    }
  }
})

async function guardar() {
  guardando.value = true
  errores.value = {}
  const cuerpo: AlumnoInput = {
    matricula: form.matricula,
    nombre: form.nombre,
    grupo_id: form.grupo_id || undefined,
    situacion_academica: form.situacion_academica,
    activo: form.activo,
  }
  try {
    const a = props.alumno ? await editarAlumno(props.alumno.id, cuerpo) : await crearAlumno(cuerpo)
    abierto.value = false
    avisar(props.alumno ? 'Alumno actualizado.' : `${a.nombre} inscrito.`)
    emit('guardado', a)
  } catch (e) {
    errores.value = erroresDeCampos(e)
    if (!Object.keys(errores.value).length) avisar(mensajeDeError(e), 'error')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <VentanaFormulario
    v-model:abierto="abierto"
    :titulo="editando ? `Editar a ${alumno?.nombre}` : 'Nuevo alumno'"
    :descripcion="
      editando ? undefined : 'Queda inscrito en el grupo y aparece en la lista de sus docentes.'
    "
    @enviar="guardar"
  >
    <CampoFormulario
      id="a-nombre"
      etiqueta="Nombre completo"
      :error="errores.nombre"
      ayuda="Apellidos primero, como en lista: Hernández López Ximena."
    >
      <template #default="{ invalido, describe }">
        <input
          id="a-nombre"
          v-model="form.nombre"
          class="campo"
          :class="{ 'campo-error': invalido }"
          :aria-invalid="invalido"
          :aria-describedby="describe"
          autocomplete="off"
          required
        />
      </template>
    </CampoFormulario>
    <CampoFormulario id="a-matricula" etiqueta="Matrícula" :error="errores.matricula">
      <template #default="{ invalido, describe }">
        <input
          id="a-matricula"
          v-model.trim="form.matricula"
          class="campo font-mono"
          :class="{ 'campo-error': invalido }"
          :aria-invalid="invalido"
          :aria-describedby="describe"
          inputmode="numeric"
          autocomplete="off"
          required
        />
      </template>
    </CampoFormulario>
    <div class="grid gap-4 sm:grid-cols-2">
      <CampoFormulario
        id="a-grupo"
        etiqueta="Grupo"
        :error="errores.grupo_id"
        :ayuda="editando ? 'Cambiarlo conserva su asistencia anterior.' : undefined"
      >
        <template #default="{ invalido, describe }">
          <select
            id="a-grupo"
            v-model="form.grupo_id"
            class="campo"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
            :required="!editando"
          >
            <option :value="0" :disabled="!editando">
              {{ editando ? 'Sin inscripción' : 'Elige un grupo' }}
            </option>
            <option v-for="g in grupos" :key="g.id" :value="g.id">{{ etiquetaGrupo(g) }}</option>
          </select>
        </template>
      </CampoFormulario>
      <CampoFormulario id="a-situacion" etiqueta="Situación" :error="errores.situacion_academica">
        <template #default="{ invalido, describe }">
          <select
            id="a-situacion"
            v-model="form.situacion_academica"
            class="campo"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
          >
            <option v-for="s in SITUACIONES" :key="s" :value="s">{{ s }}</option>
          </select>
        </template>
      </CampoFormulario>
    </div>
    <label v-if="editando" class="flex cursor-pointer items-start gap-2.5 text-sm text-tinta-700">
      <input v-model="form.activo" type="checkbox" class="mt-0.5 size-4 accent-marca-800" />
      <span>
        Alumno activo
        <span class="block text-[13px] text-tinta-500">
          Desmárcalo para darlo de baja: deja de contar en el semáforo, pero su historial se queda.
        </span>
      </span>
    </label>

    <template #acciones>
      <button type="button" class="btn-secundario" @click="abierto = false">Cancelar</button>
      <button type="submit" class="btn-primario" :disabled="guardando">
        {{ guardando ? 'Guardando' : editando ? 'Guardar cambios' : 'Inscribir alumno' }}
      </button>
    </template>
  </VentanaFormulario>
</template>
