<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { PhPencilSimple, PhPlus, PhTrash } from '@phosphor-icons/vue'
import {
  catalogo,
  crearHorario,
  editarHorario,
  eliminarHorario,
  listarDocentes,
  listarHorarios,
  type DocenteCatalogo,
  type Grupo,
  type HorarioAdmin,
  type HorarioInput,
  type Materia,
} from '@/api/admin'
import { erroresDeCampos, mensajeDeError } from '@/api/http'
import { avisar } from '@/composables/avisos'
import { confirmar } from '@/composables/confirmar'
import { etiquetaGrupo } from '@/composables/riesgo'
import VentanaFormulario from '@/components/VentanaFormulario.vue'
import CampoFormulario from '@/components/CampoFormulario.vue'

/**
 * Horarios: cada clase es grupo + materia + docente + día + hora. Es lo que
 * le da grupos al docente (los ve en la app) y forma su lista.
 */
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const route = useRoute()
const router = useRouter()

const grupos = ref<Grupo[]>([])
const materias = ref<Materia[]>([])
const docentes = ref<DocenteCatalogo[]>([])
const cargando = ref(true)
const errorCarga = ref('')

type Vista = 'grupo' | 'docente'
const vista = ref<Vista>('grupo')
const grupoId = ref<number | ''>('')
const docenteId = ref<number | ''>('')

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    const periodos = await catalogo.periodos()
    const activo = periodos.find((p) => p.estado === 'activo')
    ;[grupos.value, materias.value, docentes.value] = await Promise.all([
      activo ? catalogo.grupos(activo.id) : Promise.resolve([]),
      catalogo.materias(),
      listarDocentes(),
    ])
    // Llegar con ?usuario= (desde Usuarios) o ?grupo= abre esa vista
    const usuario = Number(route.query.usuario)
    const grupo = Number(route.query.grupo)
    const doc = docentes.value.find((d) => d.usuario_id === usuario)
    if (doc) {
      vista.value = 'docente'
      docenteId.value = doc.id
    } else if (grupos.value.some((g) => g.id === grupo)) {
      grupoId.value = grupo
    } else if (grupos.value.length) {
      grupoId.value = grupos.value[0]!.id
    }
  } catch (e) {
    errorCarga.value = mensajeDeError(e)
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

// Clases de lo elegido
const clases = ref<HorarioAdmin[]>([])
const cargandoClases = ref(false)
let ultima = 0
const filtro = computed(() =>
  vista.value === 'grupo'
    ? grupoId.value && { grupo_id: grupoId.value }
    : docenteId.value && { docente_id: docenteId.value },
)

async function cargarClases() {
  const f = filtro.value
  if (!f) {
    clases.value = []
    return
  }
  const esta = ++ultima
  cargandoClases.value = true
  try {
    const r = await listarHorarios(f)
    if (esta === ultima) clases.value = r
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  } finally {
    if (esta === ultima) cargandoClases.value = false
  }
}
watch(filtro, () => {
  cargarClases()
  // La selección queda en la URL: recargar o compartir abre lo mismo
  const query =
    vista.value === 'grupo'
      ? { grupo: grupoId.value || undefined }
      : { usuario: docentes.value.find((d) => d.id === docenteId.value)?.usuario_id }
  router.replace({ query })
})

const diasVisibles = computed(() =>
  clases.value.some((c) => c.dia_semana === 6) ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5],
)
const delDia = (d: number) => clases.value.filter((c) => c.dia_semana === d)
const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
const horasSemana = computed(
  () => clases.value.reduce((t, c) => t + minutos(c.hora_fin) - minutos(c.hora_inicio), 0) / 60,
)
const gruposDelDocente = computed(() => new Set(clases.value.map((c) => c.grupo.id)).size)
const grupoActual = computed(() => grupos.value.find((g) => g.id === grupoId.value))
const docenteActual = computed(() => docentes.value.find((d) => d.id === docenteId.value))
const nombreGrupo = (g: Grupo) => `${g.grado}° ${g.letra}`

// Alta / edición
const formAbierto = ref(false)
const editando = ref<HorarioAdmin | null>(null)
const form = reactive({
  grupo_id: 0,
  materia_id: 0,
  docente_id: 0,
  dias: [] as number[],
  hora_inicio: '07:00',
  hora_fin: '07:50',
})
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

const sumar = (h: string, min: number) => {
  const t = minutos(h) + min
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
// Las clases del COBACH son de 50 min: al mover el inicio, el fin lo sigue
watch(
  () => form.hora_inicio,
  (nueva, vieja) => {
    if (!nueva || !vieja || !form.hora_fin) return
    form.hora_fin = sumar(nueva, minutos(form.hora_fin) - minutos(vieja))
  },
)

function abrirForm(c: HorarioAdmin | null, dia?: number) {
  editando.value = c
  Object.assign(form, {
    grupo_id: c?.grupo.id ?? (grupoId.value || grupos.value[0]?.id || 0),
    materia_id: c?.materia.id ?? 0,
    docente_id: c?.docente.id ?? (docenteId.value || 0),
    dias: c ? [c.dia_semana] : dia ? [dia] : [],
    hora_inicio: c?.hora_inicio ?? '07:00',
    hora_fin: c?.hora_fin ?? '07:50',
  })
  errores.value = {}
  formAbierto.value = true
}

const conListas = computed(() => (editando.value?.listas_capturadas ?? 0) > 0)

async function guardar() {
  errores.value = {}
  if (!form.dias.length) {
    errores.value = { dia_semana: 'Elige al menos un día.' }
    return
  }
  guardando.value = true
  const cuerpo = (dia: number): HorarioInput => ({
    grupo_id: form.grupo_id,
    materia_id: form.materia_id,
    docente_id: form.docente_id,
    dia_semana: dia,
    hora_inicio: form.hora_inicio,
    hora_fin: form.hora_fin,
  })
  try {
    if (editando.value) {
      await editarHorario(editando.value.id, cuerpo(form.dias[0]!))
      formAbierto.value = false
      avisar('Clase actualizada.')
    } else {
      // Un POST por día; los que choquen se quedan marcados para corregir
      const fallidos: number[] = []
      const motivos: string[] = []
      for (const dia of [...form.dias].sort()) {
        try {
          await crearHorario(cuerpo(dia))
        } catch (e) {
          const campos = erroresDeCampos(e)
          if (Object.keys(campos).length) {
            errores.value = campos
            return
          }
          fallidos.push(dia)
          motivos.push(`${DIAS[dia]}: ${mensajeDeError(e)}`)
        }
      }
      const hechos = form.dias.length - fallidos.length
      if (!fallidos.length) {
        formAbierto.value = false
        avisar(hechos === 1 ? 'Clase agregada.' : `${hechos} clases agregadas.`)
      } else {
        form.dias = fallidos
        errores.value = { dia_semana: motivos.join(' ') }
        if (hechos) avisar(`${hechos} de ${hechos + fallidos.length} días agregados.`)
      }
    }
  } catch (e) {
    errores.value = erroresDeCampos(e)
    if (!Object.keys(errores.value).length) avisar(mensajeDeError(e), 'error')
  } finally {
    guardando.value = false
    await cargarClases()
  }
}

async function eliminar(c: HorarioAdmin) {
  const ok = await confirmar({
    titulo: `¿Quitar ${c.materia.nombre} del ${DIAS[c.dia_semana]!.toLowerCase()}?`,
    mensaje: `${etiquetaGrupo(c.grupo)} · ${c.hora_inicio}–${c.hora_fin} · ${c.docente.nombre}`,
    aceptar: 'Quitar clase',
    peligro: true,
  })
  if (!ok) return
  try {
    await eliminarHorario(c.id)
    clases.value = clases.value.filter((x) => x.id !== c.id)
    avisar('Clase quitada.')
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  }
}
</script>

<template>
  <div>
    <p v-if="cargando" role="status" class="text-sm text-tinta-500">Cargando horarios…</p>

    <div v-else-if="errorCarga" role="alert" class="max-w-xl border-t border-linea pt-6">
      <p class="text-[15px] text-tinta-800">{{ errorCarga }}</p>
      <button type="button" class="btn-secundario mt-4" @click="cargar">Reintentar</button>
    </div>

    <div v-else-if="!grupos.length" class="max-w-xl border-t border-linea pt-6">
      <p class="text-[15px] text-tinta-800">El periodo activo todavía no tiene grupos.</p>
      <p class="mt-1 text-sm text-tinta-500">
        Primero da de alta los grupos en Catálogos; luego aquí les asignas materias y docentes.
      </p>
      <RouterLink :to="{ name: 'catalogos' }" class="btn-secundario mt-4"
        >Ir a Catálogos</RouterLink
      >
    </div>

    <template v-else>
      <div class="flex flex-wrap items-end gap-3">
        <div
          role="radiogroup"
          aria-label="Ver horario por"
          class="inline-flex rounded-lg border border-tinta-300 bg-white p-0.5"
        >
          <button
            v-for="v in ['grupo', 'docente'] as const"
            :key="v"
            type="button"
            role="radio"
            :aria-checked="vista === v"
            class="rounded-md px-3.5 py-2 text-sm font-medium transition-colors"
            :class="vista === v ? 'bg-marca-800 text-white' : 'text-tinta-600 hover:bg-tinta-50'"
            @click="vista = v"
          >
            Por {{ v }}
          </button>
        </div>

        <div v-if="vista === 'grupo'" class="min-w-[12rem]">
          <label for="h-grupo" class="sr-only">Grupo</label>
          <select id="h-grupo" v-model="grupoId" class="campo">
            <option v-for="g in grupos" :key="g.id" :value="g.id">{{ etiquetaGrupo(g) }}</option>
          </select>
        </div>
        <div v-else class="min-w-[14rem]">
          <label for="h-docente" class="sr-only">Docente</label>
          <select id="h-docente" v-model="docenteId" class="campo">
            <option value="" disabled>Elige un docente</option>
            <option v-for="d in docentes" :key="d.id" :value="d.id">{{ d.nombre }}</option>
          </select>
        </div>

        <button
          type="button"
          class="btn-primario ml-auto"
          :disabled="!filtro"
          @click="abrirForm(null)"
        >
          <PhPlus :size="16" weight="bold" />
          Agregar clase
        </button>
      </div>

      <p v-if="filtro" class="mt-4 text-sm text-tinta-600 tabular-nums" aria-live="polite">
        <template v-if="cargandoClases">Cargando…</template>
        <template v-else-if="!clases.length">
          {{ vista === 'grupo' ? 'Este grupo' : 'Este docente' }} todavía no tiene clases.
          <template v-if="vista === 'docente'">
            Mientras no tenga, no verá ningún grupo en la app.</template
          >
        </template>
        <template v-else>
          {{ clases.length }} {{ clases.length === 1 ? 'clase' : 'clases' }} ·
          {{ horasSemana.toLocaleString('es-MX', { maximumFractionDigits: 1 }) }} h a la semana
          <template v-if="vista === 'grupo' && grupoActual">
            · {{ nombreGrupo(grupoActual) }} {{ grupoActual.turno }}</template
          >
          <template v-if="vista === 'docente' && docenteActual">
            · {{ gruposDelDocente }} {{ gruposDelDocente === 1 ? 'grupo' : 'grupos' }}</template
          >
        </template>
      </p>

      <div
        v-if="filtro && !cargandoClases"
        class="mt-4 grid gap-3 md:grid-cols-3"
        :class="diasVisibles.length === 6 ? 'xl:grid-cols-6' : 'xl:grid-cols-5'"
      >
        <section
          v-for="d in diasVisibles"
          :key="d"
          :aria-labelledby="`dia-${d}`"
          class="min-w-0 rounded-lg border border-linea bg-white"
        >
          <header class="flex items-center justify-between border-b border-linea px-3 py-2">
            <h3 :id="`dia-${d}`" class="text-sm font-semibold text-tinta-900">{{ DIAS[d] }}</h3>
            <button
              type="button"
              class="grid size-8 place-items-center rounded-md text-tinta-500 hover:bg-tinta-50 hover:text-marca-700"
              :aria-label="`Agregar clase el ${DIAS[d]!.toLowerCase()}`"
              @click="abrirForm(null, d)"
            >
              <PhPlus :size="14" weight="bold" />
            </button>
          </header>
          <ul class="space-y-2 p-2">
            <li v-if="!delDia(d).length" class="px-1 py-3 text-center text-xs text-tinta-400">
              Sin clases
            </li>
            <li
              v-for="(c, i) in delDia(d)"
              :key="c.id"
              class="entrada group rounded-md border border-linea bg-lienzo px-3 py-2"
              :style="{ '--i': i }"
            >
              <p class="font-mono text-xs text-tinta-500 tabular-nums">
                {{ c.hora_inicio }}–{{ c.hora_fin }}
              </p>
              <p class="mt-0.5 text-sm leading-snug font-medium text-tinta-900">
                {{ c.materia.nombre }}
              </p>
              <p class="text-xs text-tinta-600">
                {{ vista === 'grupo' ? c.docente.nombre : etiquetaGrupo(c.grupo) }}
              </p>
              <div class="mt-1.5 flex items-center justify-between gap-2">
                <span v-if="c.listas_capturadas" class="text-[11px] text-tinta-500">
                  {{ c.listas_capturadas }} {{ c.listas_capturadas === 1 ? 'lista' : 'listas' }}
                </span>
                <span v-else />
                <span class="flex gap-0.5">
                  <button
                    type="button"
                    class="grid size-8 place-items-center rounded-md text-tinta-500 hover:bg-white hover:text-marca-700"
                    :aria-label="`Editar ${c.materia.nombre} del ${DIAS[d]!.toLowerCase()} ${c.hora_inicio}`"
                    @click="abrirForm(c)"
                  >
                    <PhPencilSimple :size="14" weight="bold" />
                  </button>
                  <button
                    v-if="!c.listas_capturadas"
                    type="button"
                    class="grid size-8 place-items-center rounded-md text-tinta-500 hover:bg-white hover:text-riesgo-alto"
                    :aria-label="`Quitar ${c.materia.nombre} del ${DIAS[d]!.toLowerCase()} ${c.hora_inicio}`"
                    @click="eliminar(c)"
                  >
                    <PhTrash :size="14" weight="bold" />
                  </button>
                </span>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </template>

    <VentanaFormulario
      v-model:abierto="formAbierto"
      :titulo="editando ? 'Editar clase' : 'Agregar clase'"
      :descripcion="
        conListas
          ? 'Ya tiene listas capturadas: solo se pueden cambiar el docente y las horas.'
          : 'El docente verá este grupo en la app y podrá pasarle lista.'
      "
      @enviar="guardar"
    >
      <CampoFormulario id="f-grupo" etiqueta="Grupo" :error="errores.grupo_id">
        <template #default="{ invalido, describe }">
          <select
            id="f-grupo"
            v-model="form.grupo_id"
            class="campo"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
            :disabled="conListas"
          >
            <option v-for="g in grupos" :key="g.id" :value="g.id">{{ etiquetaGrupo(g) }}</option>
          </select>
        </template>
      </CampoFormulario>
      <CampoFormulario id="f-materia" etiqueta="Materia" :error="errores.materia_id">
        <template #default="{ invalido, describe }">
          <select
            id="f-materia"
            v-model="form.materia_id"
            class="campo"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
            :disabled="conListas"
            required
          >
            <option :value="0" disabled>Elige una materia</option>
            <option v-for="m in materias" :key="m.id" :value="m.id">
              {{ m.nombre }} ({{ m.clave }})
            </option>
          </select>
        </template>
      </CampoFormulario>
      <CampoFormulario
        id="f-docente"
        etiqueta="Docente"
        :error="errores.docente_id"
        :ayuda="docentes.length ? undefined : 'No hay docentes activos: créalos en Usuarios.'"
      >
        <template #default="{ invalido, describe }">
          <select
            id="f-docente"
            v-model="form.docente_id"
            class="campo"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
            required
          >
            <option :value="0" disabled>Elige un docente</option>
            <option v-for="d in docentes" :key="d.id" :value="d.id">{{ d.nombre }}</option>
          </select>
        </template>
      </CampoFormulario>

      <fieldset>
        <legend class="etiqueta">{{ editando ? 'Día' : 'Días' }}</legend>
        <div
          class="flex flex-wrap gap-1.5"
          :aria-describedby="errores.dia_semana ? 'f-dias-error' : undefined"
        >
          <label
            v-for="d in [1, 2, 3, 4, 5, 6]"
            :key="d"
            class="cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors has-checked:border-marca-700 has-checked:bg-marca-50 has-checked:text-marca-800 has-disabled:cursor-not-allowed has-disabled:opacity-60"
            :class="errores.dia_semana ? 'border-riesgo-alto/60' : 'border-tinta-300'"
          >
            <input
              v-if="editando"
              v-model="form.dias[0]"
              type="radio"
              name="f-dia"
              :value="d"
              class="sr-only"
              :disabled="conListas"
            />
            <input v-else v-model="form.dias" type="checkbox" :value="d" class="sr-only" />
            {{ DIAS[d]!.slice(0, 3) }}
          </label>
        </div>
        <p v-if="errores.dia_semana" id="f-dias-error" class="mt-1.5 text-[13px] text-riesgo-alto">
          {{ errores.dia_semana }}
        </p>
        <p v-else-if="!editando" class="mt-1.5 text-[13px] text-tinta-500">
          Marca todos los días que se da a la misma hora.
        </p>
      </fieldset>

      <div class="grid grid-cols-2 gap-4">
        <CampoFormulario id="f-inicio" etiqueta="Empieza" :error="errores.hora_inicio">
          <template #default="{ invalido, describe }">
            <input
              id="f-inicio"
              v-model="form.hora_inicio"
              type="time"
              step="300"
              class="campo tabular-nums"
              :class="{ 'campo-error': invalido }"
              :aria-invalid="invalido"
              :aria-describedby="describe"
              required
            />
          </template>
        </CampoFormulario>
        <CampoFormulario id="f-fin" etiqueta="Termina" :error="errores.hora_fin">
          <template #default="{ invalido, describe }">
            <input
              id="f-fin"
              v-model="form.hora_fin"
              type="time"
              step="300"
              class="campo tabular-nums"
              :class="{ 'campo-error': invalido }"
              :aria-invalid="invalido"
              :aria-describedby="describe"
              required
            />
          </template>
        </CampoFormulario>
      </div>

      <template #acciones>
        <button type="button" class="btn-secundario" @click="formAbierto = false">Cancelar</button>
        <button
          type="submit"
          class="btn-primario"
          :disabled="guardando || !form.materia_id || !form.docente_id"
        >
          {{ guardando ? 'Guardando' : editando ? 'Guardar cambios' : 'Agregar' }}
        </button>
      </template>
    </VentanaFormulario>
  </div>
</template>
