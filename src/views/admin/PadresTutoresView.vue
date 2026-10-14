<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { PhMagnifyingGlass, PhPlus, PhStar, PhTrash } from '@phosphor-icons/vue'
import {
  buscarAlumnos,
  crearTutor,
  desvincularTutor,
  editarTutor,
  listarTutores,
  tutoresDeAlumno,
  vincularTutor,
  type Alumno,
  type PadreDeAlumno,
  type PadreTutor,
} from '@/api/admin'
import { erroresDeCampos, mensajeDeError } from '@/api/http'
import { avisar } from '@/composables/avisos'
import { confirmar } from '@/composables/confirmar'
import VentanaFormulario from '@/components/VentanaFormulario.vue'
import CampoFormulario from '@/components/CampoFormulario.vue'

/**
 * CU-09: contactos de padres/tutores y a qué alumnos están vinculados.
 * Sin push en esta fase: cada tutor recibe avisos por SMS o correo.
 */

// Tutores (búsqueda en el servidor, con pausa para no pedir en cada tecla)
const tutores = ref<PadreTutor[]>([])
const buscar = ref('')
const cargando = ref(true)
const errorCarga = ref('')
let pausa: ReturnType<typeof setTimeout> | undefined

let ultimaPeticion = 0

async function cargarTutores() {
  const esta = ++ultimaPeticion
  cargando.value = true
  errorCarga.value = ''
  try {
    const lista = await listarTutores(buscar.value.trim())
    // Una respuesta lenta de una búsqueda vieja no pisa la de la búsqueda actual
    if (esta === ultimaPeticion) tutores.value = lista
  } catch (e) {
    errorCarga.value = mensajeDeError(e)
  } finally {
    cargando.value = false
  }
}
onMounted(cargarTutores)
watch(buscar, () => {
  clearTimeout(pausa)
  pausa = setTimeout(cargarTutores, 300)
})

const contacto = (t: PadreTutor) => (t.canal_preferido === 'email' ? t.correo : t.telefono)

// Alta / edición de tutor
const formAbierto = ref(false)
const editando = ref<PadreTutor | null>(null)
const form = reactive({
  nombre: '',
  canal_preferido: 'sms' as 'sms' | 'email',
  telefono: '',
  correo: '',
})
const errores = ref<Record<string, string>>({})
const guardando = ref(false)

function abrirForm(t: PadreTutor | null) {
  editando.value = t
  Object.assign(form, {
    nombre: t?.nombre ?? '',
    canal_preferido: t?.canal_preferido ?? 'sms',
    telefono: t?.telefono ?? '',
    correo: t?.correo ?? '',
  })
  errores.value = {}
  formAbierto.value = true
}

async function guardar() {
  guardando.value = true
  errores.value = {}
  const cuerpo = {
    nombre: form.nombre,
    canal_preferido: form.canal_preferido,
    telefono: form.telefono || undefined,
    correo: form.correo || undefined,
  }
  try {
    const t = editando.value
      ? await editarTutor(editando.value.id, cuerpo)
      : await crearTutor(cuerpo)
    formAbierto.value = false
    avisar(editando.value ? 'Tutor actualizado.' : `${t.nombre} agregado.`)
    await cargarTutores()
    if (alumno.value) vinculados.value = await tutoresDeAlumno(alumno.value.id)
  } catch (e) {
    errores.value = erroresDeCampos(e)
    if (!Object.keys(errores.value).length) avisar(mensajeDeError(e), 'error')
  } finally {
    guardando.value = false
  }
}

// Alumno seleccionado y sus tutores
const busquedaAlumno = ref('')
const resultados = ref<Alumno[]>([])
const buscandoAlumno = ref(false)
const alumno = ref<Alumno | null>(null)
const vinculados = ref<PadreDeAlumno[]>([])

async function buscarAlumno() {
  const t = busquedaAlumno.value.trim()
  if (t.length < 3) return
  buscandoAlumno.value = true
  try {
    // Matrícula si son puros dígitos; si no, por nombre
    resultados.value = await buscarAlumnos(/^\d+$/.test(t) ? { matricula: t } : { nombre: t })
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  } finally {
    buscandoAlumno.value = false
  }
}

async function elegirAlumno(a: Alumno) {
  try {
    vinculados.value = await tutoresDeAlumno(a.id)
    alumno.value = a
    resultados.value = []
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  }
}

const vinculo = reactive({ padre_tutor_id: 0, parentesco: '', es_principal: false })
const vinculando = ref(false)
const libres = () => tutores.value.filter((t) => !vinculados.value.some((v) => v.id === t.id))

async function vincular() {
  if (!alumno.value || !vinculo.padre_tutor_id) return
  vinculando.value = true
  try {
    await vincularTutor(alumno.value.id, {
      padre_tutor_id: vinculo.padre_tutor_id,
      parentesco: vinculo.parentesco || undefined,
      es_principal: vinculo.es_principal,
    })
    vinculados.value = await tutoresDeAlumno(alumno.value.id)
    cargarTutores() // su conteo de alumnos cambió
    Object.assign(vinculo, { padre_tutor_id: 0, parentesco: '', es_principal: false })
    avisar('Tutor vinculado.')
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  } finally {
    vinculando.value = false
  }
}

async function desvincular(t: PadreDeAlumno) {
  if (!alumno.value) return
  const ok = await confirmar({
    titulo: `¿Desvincular a ${t.nombre}?`,
    mensaje: `Deja de recibir avisos de ${alumno.value.nombre}. El contacto no se borra.`,
    aceptar: 'Desvincular',
    peligro: true,
  })
  if (!ok) return
  try {
    await desvincularTutor(alumno.value.id, t.id)
    vinculados.value = vinculados.value.filter((v) => v.id !== t.id)
    cargarTutores()
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  }
}
</script>

<template>
  <div class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
    <!-- Tutores -->
    <section aria-labelledby="titulo-tutores" class="min-w-0">
      <div class="flex flex-wrap items-center gap-3">
        <h2 id="titulo-tutores" class="mr-auto text-base font-semibold text-tinta-900">
          Contactos
        </h2>
        <div class="relative w-full sm:w-64">
          <label for="buscar-tutor" class="sr-only">Buscar por nombre, teléfono o correo</label>
          <PhMagnifyingGlass
            :size="16"
            weight="bold"
            class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-tinta-400"
          />
          <input
            id="buscar-tutor"
            v-model="buscar"
            type="search"
            class="campo pl-9"
            placeholder="Nombre, teléfono o correo"
          />
        </div>
        <button type="button" class="btn-primario" @click="abrirForm(null)">
          <PhPlus :size="16" weight="bold" />
          Nuevo tutor
        </button>
      </div>

      <div v-if="errorCarga" role="alert" class="mt-6 border-t border-linea pt-6">
        <p class="text-[15px] text-tinta-800">{{ errorCarga }}</p>
        <button type="button" class="btn-secundario mt-4" @click="cargarTutores">Reintentar</button>
      </div>

      <div v-else class="mt-4 relative overflow-x-auto rounded-lg border border-linea bg-white">
        <table class="w-full min-w-[34rem] text-sm" :aria-busy="cargando">
          <caption class="sr-only">
            Padres y tutores
          </caption>
          <thead>
            <tr class="border-b border-linea text-left text-tinta-900">
              <th scope="col" class="px-4 py-3 font-semibold">Nombre</th>
              <th scope="col" class="px-4 py-3 font-semibold">Avisos por</th>
              <th scope="col" class="px-4 py-3 text-right font-semibold">Alumnos</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-linea">
            <tr v-if="!cargando && !tutores.length">
              <td colspan="4" class="px-4 py-8 text-center text-tinta-500">
                {{ buscar ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay tutores.' }}
              </td>
            </tr>
            <tr v-for="t in tutores" :key="t.id" class="hover:bg-tinta-50/60">
              <td class="px-4 py-3 font-medium text-tinta-900">{{ t.nombre }}</td>
              <td class="px-4 py-3">
                <span class="pildora mr-2 bg-tinta-100 text-tinta-600">
                  {{ t.canal_preferido === 'email' ? 'correo' : 'sms' }}
                </span>
                <span class="font-mono text-xs text-tinta-600">{{ contacto(t) }}</span>
              </td>
              <td class="px-4 py-3 text-right tabular-nums">{{ t.alumnos_count ?? 0 }}</td>
              <td class="px-4 py-2 text-right">
                <button
                  type="button"
                  class="btn-secundario px-3 py-1.5"
                  :aria-label="`Editar a ${t.nombre}`"
                  @click="abrirForm(t)"
                >
                  Editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Vínculo con un alumno -->
    <section aria-labelledby="titulo-alumno" class="min-w-0 xl:sticky xl:top-24 xl:self-start">
      <h2 id="titulo-alumno" class="text-base font-semibold text-tinta-900">
        Tutores de un alumno
      </h2>
      <form class="mt-3 flex gap-2" @submit.prevent="buscarAlumno">
        <label for="buscar-alumno" class="sr-only">Matrícula o nombre del alumno</label>
        <input
          id="buscar-alumno"
          v-model="busquedaAlumno"
          type="search"
          class="campo"
          placeholder="Matrícula o nombre (mín. 3)"
          minlength="3"
        />
        <button
          type="submit"
          class="btn-secundario"
          :disabled="buscandoAlumno || busquedaAlumno.trim().length < 3"
        >
          Buscar
        </button>
      </form>

      <ul
        v-if="resultados.length"
        class="mt-2 max-h-64 divide-y divide-linea overflow-y-auto rounded-lg border border-linea bg-white"
      >
        <li v-for="a in resultados" :key="a.id">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-marca-50"
            @click="elegirAlumno(a)"
          >
            <span :class="{ 'text-tinta-500': !a.activo }">{{ a.nombre }}</span>
            <span class="font-mono text-xs text-tinta-500">{{ a.matricula }}</span>
          </button>
        </li>
      </ul>

      <div v-if="alumno" class="mt-5 rounded-lg border border-linea bg-white">
        <div class="border-b border-linea px-4 py-3">
          <p class="font-medium text-tinta-900">{{ alumno.nombre }}</p>
          <p class="font-mono text-xs text-tinta-500">
            {{ alumno.matricula }}<template v-if="!alumno.activo"> · baja</template>
          </p>
        </div>
        <ul class="divide-y divide-linea">
          <li v-if="!vinculados.length" class="px-4 py-3 text-sm text-tinta-500">
            Sin tutores: no le llegará ningún aviso.
          </li>
          <li
            v-for="v in vinculados"
            :key="v.id"
            class="flex items-center gap-3 px-4 py-2.5 text-sm"
          >
            <PhStar
              :size="16"
              :weight="v.es_principal ? 'fill' : 'regular'"
              :class="v.es_principal ? 'text-marca-800' : 'text-tinta-300'"
              :aria-label="v.es_principal ? 'Tutor principal' : undefined"
              :aria-hidden="!v.es_principal"
            />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-tinta-900">{{ v.nombre }}</span>
              <span class="block text-xs text-tinta-500"
                >{{ v.parentesco || 'Sin parentesco' }} · {{ contacto(v) }}</span
              >
            </span>
            <button
              type="button"
              class="grid size-9 place-items-center rounded-md text-tinta-500 hover:bg-tinta-50 hover:text-riesgo-alto"
              :aria-label="`Desvincular a ${v.nombre}`"
              @click="desvincular(v)"
            >
              <PhTrash :size="16" weight="bold" />
            </button>
          </li>
        </ul>
        <form
          class="space-y-3 border-t border-linea bg-tinta-50/60 px-4 py-4"
          @submit.prevent="vincular"
        >
          <div>
            <label for="v-tutor" class="etiqueta">Vincular tutor</label>
            <select id="v-tutor" v-model="vinculo.padre_tutor_id" class="campo">
              <option :value="0" disabled>Elige de la lista de contactos</option>
              <option v-for="t in libres()" :key="t.id" :value="t.id">{{ t.nombre }}</option>
            </select>
          </div>
          <div class="flex items-end gap-3">
            <div class="flex-1">
              <label for="v-parentesco" class="etiqueta">Parentesco</label>
              <input
                id="v-parentesco"
                v-model.trim="vinculo.parentesco"
                class="campo"
                placeholder="madre, padre, abuela…"
                maxlength="50"
              />
            </div>
            <label class="flex h-10 cursor-pointer items-center gap-2 text-sm text-tinta-700">
              <input
                v-model="vinculo.es_principal"
                type="checkbox"
                class="size-4 accent-marca-800"
              />
              Principal
            </label>
          </div>
          <button
            type="submit"
            class="btn-primario w-full"
            :disabled="!vinculo.padre_tutor_id || vinculando"
          >
            Vincular
          </button>
        </form>
      </div>
    </section>

    <VentanaFormulario
      v-model:abierto="formAbierto"
      :titulo="editando ? `Editar a ${editando.nombre}` : 'Nuevo tutor'"
      descripcion="Los avisos de inasistencia le llegan por el canal que elijas."
      @enviar="guardar"
    >
      <CampoFormulario id="t-nombre" etiqueta="Nombre completo" :error="errores.nombre">
        <template #default="{ invalido, describe }">
          <input
            id="t-nombre"
            v-model="form.nombre"
            class="campo"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
          />
        </template>
      </CampoFormulario>
      <fieldset>
        <legend class="etiqueta">Avisos por</legend>
        <div class="flex gap-4">
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input
              v-model="form.canal_preferido"
              type="radio"
              value="sms"
              class="size-4 accent-marca-800"
            />
            SMS
          </label>
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input
              v-model="form.canal_preferido"
              type="radio"
              value="email"
              class="size-4 accent-marca-800"
            />
            Correo
          </label>
        </div>
      </fieldset>
      <CampoFormulario
        id="t-telefono"
        :etiqueta="form.canal_preferido === 'sms' ? 'Teléfono celular' : 'Teléfono (opcional)'"
        :error="errores.telefono"
      >
        <template #default="{ invalido, describe }">
          <input
            id="t-telefono"
            v-model.trim="form.telefono"
            type="tel"
            inputmode="tel"
            class="campo font-mono"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
          />
        </template>
      </CampoFormulario>
      <CampoFormulario
        id="t-correo"
        :etiqueta="form.canal_preferido === 'email' ? 'Correo' : 'Correo (opcional)'"
        :error="errores.correo"
      >
        <template #default="{ invalido, describe }">
          <input
            id="t-correo"
            v-model.trim="form.correo"
            type="email"
            class="campo"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
          />
        </template>
      </CampoFormulario>

      <template #acciones>
        <button type="button" class="btn-secundario" @click="formAbierto = false">Cancelar</button>
        <button type="submit" class="btn-primario" :disabled="guardando">
          {{ guardando ? 'Guardando' : editando ? 'Guardar cambios' : 'Agregar tutor' }}
        </button>
      </template>
    </VentanaFormulario>
  </div>
</template>
