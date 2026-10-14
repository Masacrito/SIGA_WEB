<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { PhPlus } from '@phosphor-icons/vue'
import {
  catalogo,
  crearEnCatalogo,
  type Grado,
  type Grupo,
  type Materia,
  type PeriodoEscolar,
  type Plantel,
} from '@/api/admin'
import { erroresDeCampos, mensajeDeError } from '@/api/http'
import { avisar } from '@/composables/avisos'
import { confirmar } from '@/composables/confirmar'
import VentanaFormulario from '@/components/VentanaFormulario.vue'
import CampoFormulario from '@/components/CampoFormulario.vue'

/** CU-11: periodos, grupos, materias, grados y planteles. Solo alta y consulta (así está el contrato). */
type Pestana = 'periodos' | 'grupos' | 'materias' | 'grados' | 'planteles'
const PESTANAS: { id: Pestana; titulo: string; nuevo: string; hecho: string }[] = [
  { id: 'periodos', titulo: 'Periodos', nuevo: 'Nuevo periodo', hecho: 'Periodo abierto.' },
  { id: 'grupos', titulo: 'Grupos', nuevo: 'Nuevo grupo', hecho: 'Grupo agregado.' },
  { id: 'materias', titulo: 'Materias', nuevo: 'Nueva materia', hecho: 'Materia agregada.' },
  { id: 'grados', titulo: 'Grados', nuevo: 'Nuevo grado', hecho: 'Grado agregado.' },
  { id: 'planteles', titulo: 'Planteles', nuevo: 'Nuevo plantel', hecho: 'Plantel agregado.' },
]
const pestana = ref<Pestana>('periodos')
const actual = computed(() => PESTANAS.find((p) => p.id === pestana.value)!)

const periodos = ref<PeriodoEscolar[]>([])
const grupos = ref<Grupo[]>([])
const materias = ref<Materia[]>([])
const grados = ref<Grado[]>([])
const planteles = ref<Plantel[]>([])
const cargando = ref(true)
const errorCarga = ref('')

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    ;[periodos.value, grupos.value, materias.value, grados.value, planteles.value] =
      await Promise.all([
        catalogo.periodos(),
        catalogo.grupos(),
        catalogo.materias(),
        catalogo.grados(),
        catalogo.planteles(),
      ])
    periodoGrupos.value = periodoActivo.value?.id ?? periodos.value[0]?.id ?? ''
  } catch (e) {
    errorCarga.value = mensajeDeError(e)
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

const periodoActivo = computed(() => periodos.value.find((p) => p.estado === 'activo'))
const periodoGrupos = ref<number | ''>('')
const gruposDelPeriodo = computed(() =>
  grupos.value.filter((g) => g.periodo_id === periodoGrupos.value),
)
const nombrePlantel = (id: number) => planteles.value.find((p) => p.id === id)?.nombre ?? ''
const fecha = (f: string | null) =>
  f
    ? new Date(`${f.slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { dateStyle: 'medium' })
    : '—'

// Formulario de alta: un solo objeto con los campos de todas las pestañas
const formAbierto = ref(false)
const guardando = ref(false)
const errores = ref<Record<string, string>>({})
const form = reactive({
  nombre: '',
  clave: '',
  tipo_evaluacion: 'numerica',
  fecha_inicio: '',
  fecha_fin: '',
  grado_id: 0,
  plantel_id: 0,
  periodo_id: 0,
  letra: '',
  turno: 'matutino',
})

function abrirForm() {
  Object.assign(form, {
    nombre: '',
    clave: '',
    tipo_evaluacion: 'numerica',
    fecha_inicio: '',
    fecha_fin: '',
    grado_id: grados.value[0]?.id ?? 0,
    plantel_id: planteles.value[0]?.id ?? 0,
    periodo_id: periodoGrupos.value || periodoActivo.value?.id || 0,
    letra: '',
    turno: 'matutino',
  })
  errores.value = {}
  formAbierto.value = true
}

/** Lo que manda cada pestaña (ruta del catálogo + cuerpo). */
function cuerpo(): [string, object] {
  const { nombre, clave } = form
  switch (pestana.value) {
    case 'periodos':
      return [
        'periodos-escolares',
        { nombre, fecha_inicio: form.fecha_inicio || null, fecha_fin: form.fecha_fin || null },
      ]
    case 'grupos':
      return [
        'grupos',
        {
          grado_id: form.grado_id,
          plantel_id: form.plantel_id,
          periodo_id: form.periodo_id,
          letra: form.letra,
          turno: form.turno,
        },
      ]
    case 'materias':
      return ['materias', { clave, nombre, tipo_evaluacion: form.tipo_evaluacion }]
    case 'grados':
      return ['grados', { nombre }]
    case 'planteles':
      return ['planteles', { clave, nombre }]
  }
}

async function guardar() {
  if (pestana.value === 'periodos' && periodoActivo.value) {
    const ok = await confirmar({
      titulo: `¿Abrir el periodo ${form.nombre || 'nuevo'}?`,
      mensaje: `Queda como periodo activo y ${periodoActivo.value.nombre} se cierra. Pasar lista, el semáforo y los grupos nuevos usan el periodo activo.`,
      aceptar: 'Abrir periodo',
      peligro: true,
    })
    if (!ok) return
  }
  guardando.value = true
  errores.value = {}
  try {
    const [ruta, datos] = cuerpo()
    await crearEnCatalogo(ruta, datos)
    formAbierto.value = false
    avisar(actual.value.hecho)
    await cargar()
  } catch (e) {
    errores.value = erroresDeCampos(e)
    if (!Object.keys(errores.value).length) avisar(mensajeDeError(e), 'error')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div>
    <p v-if="cargando" role="status" class="text-sm text-tinta-500">Cargando catálogos…</p>

    <div v-else-if="errorCarga" role="alert" class="max-w-xl border-t border-linea pt-6">
      <p class="text-[15px] text-tinta-800">{{ errorCarga }}</p>
      <button type="button" class="btn-secundario mt-4" @click="cargar">Reintentar</button>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-linea">
        <div role="tablist" aria-label="Catálogos" class="-mb-px flex gap-1 overflow-x-auto">
          <button
            v-for="p in PESTANAS"
            :id="`tab-${p.id}`"
            :key="p.id"
            type="button"
            role="tab"
            :aria-selected="pestana === p.id"
            aria-controls="panel-catalogo"
            class="border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
            :class="
              pestana === p.id
                ? 'border-marca-800 text-marca-800'
                : 'border-transparent text-tinta-500 hover:text-tinta-800'
            "
            @click="pestana = p.id"
          >
            {{ p.titulo }}
          </button>
        </div>
        <button type="button" class="btn-primario mb-2" @click="abrirForm">
          <PhPlus :size="16" weight="bold" />
          {{ actual.nuevo }}
        </button>
      </div>

      <section id="panel-catalogo" role="tabpanel" :aria-labelledby="`tab-${pestana}`" class="mt-5">
        <!-- Periodos -->
        <div
          v-if="pestana === 'periodos'"
          class="relative overflow-x-auto rounded-lg border border-linea bg-white"
        >
          <table class="w-full min-w-[32rem] text-sm">
            <thead>
              <tr class="border-b border-linea text-left text-tinta-900">
                <th scope="col" class="px-4 py-3 font-semibold">Periodo</th>
                <th scope="col" class="px-4 py-3 font-semibold">Inicio</th>
                <th scope="col" class="px-4 py-3 font-semibold">Fin</th>
                <th scope="col" class="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-linea">
              <tr v-for="p in periodos" :key="p.id">
                <td class="px-4 py-3 font-medium text-tinta-900">{{ p.nombre }}</td>
                <td class="px-4 py-3 tabular-nums">{{ fecha(p.fecha_inicio) }}</td>
                <td class="px-4 py-3 tabular-nums">{{ fecha(p.fecha_fin) }}</td>
                <td class="px-4 py-3">
                  <span
                    class="pildora"
                    :class="
                      p.estado === 'activo'
                        ? 'bg-marca-50 text-marca-800'
                        : 'bg-tinta-100 text-tinta-600'
                    "
                    >{{ p.estado }}</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Grupos -->
        <template v-else-if="pestana === 'grupos'">
          <div class="mb-4 flex items-center gap-2">
            <label for="periodo-grupos" class="text-sm text-tinta-600">Periodo</label>
            <select id="periodo-grupos" v-model="periodoGrupos" class="campo w-auto pr-8">
              <option v-for="p in periodos" :key="p.id" :value="p.id">
                {{ p.nombre }}{{ p.estado === 'activo' ? ' (activo)' : '' }}
              </option>
            </select>
          </div>
          <p v-if="!gruposDelPeriodo.length" class="text-sm text-tinta-500">
            Este periodo todavía no tiene grupos.
          </p>
          <ul v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <li
              v-for="(g, i) in gruposDelPeriodo"
              :key="g.id"
              class="entrada rounded-lg border border-linea bg-white px-4 py-3"
              :style="{ '--i': i }"
            >
              <span class="block text-lg font-semibold text-tinta-900"
                >{{ g.grado }}° {{ g.letra }}</span
              >
              <span class="block text-sm text-tinta-500 first-letter:uppercase">
                {{ g.turno }} · {{ nombrePlantel(g.plantel_id) }}
              </span>
            </li>
          </ul>
        </template>

        <!-- Materias -->
        <div
          v-else-if="pestana === 'materias'"
          class="relative overflow-x-auto rounded-lg border border-linea bg-white"
        >
          <table class="w-full min-w-[28rem] text-sm">
            <thead>
              <tr class="border-b border-linea text-left text-tinta-900">
                <th scope="col" class="px-4 py-3 font-semibold">Clave</th>
                <th scope="col" class="px-4 py-3 font-semibold">Materia</th>
                <th scope="col" class="px-4 py-3 font-semibold">Evaluación</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-linea">
              <tr v-if="!materias.length">
                <td colspan="3" class="px-4 py-8 text-center text-tinta-500">
                  Sin materias. Normalmente llegan por importación.
                </td>
              </tr>
              <tr v-for="m in materias" :key="m.id">
                <td class="px-4 py-3 font-mono text-xs">{{ m.clave }}</td>
                <td class="px-4 py-3 text-tinta-900">{{ m.nombre }}</td>
                <td class="px-4 py-3">
                  {{ m.tipo_evaluacion === 'numerica' ? 'Numérica' : 'Acreditada / no acreditada' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Grados y planteles: listas cortas -->
        <ul v-else-if="pestana === 'grados'" class="flex flex-wrap gap-3">
          <li
            v-for="g in grados"
            :key="g.id"
            class="grid size-16 place-items-center rounded-lg border border-linea bg-white text-xl font-semibold text-tinta-900"
          >
            {{ g.nombre }}°
          </li>
        </ul>
        <ul v-else class="divide-y divide-linea rounded-lg border border-linea bg-white">
          <li
            v-for="p in planteles"
            :key="p.id"
            class="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span class="text-tinta-900">{{ p.nombre }}</span>
            <span class="font-mono text-xs text-tinta-500">{{ p.clave }}</span>
          </li>
        </ul>
      </section>
    </template>

    <VentanaFormulario v-model:abierto="formAbierto" :titulo="actual.nuevo" @enviar="guardar">
      <template v-if="pestana === 'grupos'">
        <div class="grid grid-cols-2 gap-4">
          <CampoFormulario id="c-grado" etiqueta="Grado" :error="errores.grado_id">
            <template #default="{ describe }">
              <select
                id="c-grado"
                v-model="form.grado_id"
                class="campo"
                :aria-describedby="describe"
              >
                <option v-for="g in grados" :key="g.id" :value="g.id">{{ g.nombre }}°</option>
              </select>
            </template>
          </CampoFormulario>
          <CampoFormulario id="c-letra" etiqueta="Letra" :error="errores.letra">
            <template #default="{ invalido, describe }">
              <input
                id="c-letra"
                v-model.trim="form.letra"
                maxlength="1"
                class="campo uppercase"
                :class="{ 'campo-error': invalido }"
                :aria-invalid="invalido"
                :aria-describedby="describe"
              />
            </template>
          </CampoFormulario>
        </div>
        <CampoFormulario id="c-turno" etiqueta="Turno" :error="errores.turno">
          <template #default="{ describe }">
            <select id="c-turno" v-model="form.turno" class="campo" :aria-describedby="describe">
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
            </select>
          </template>
        </CampoFormulario>
        <CampoFormulario id="c-periodo" etiqueta="Periodo" :error="errores.periodo_id">
          <template #default="{ describe }">
            <select
              id="c-periodo"
              v-model="form.periodo_id"
              class="campo"
              :aria-describedby="describe"
            >
              <option v-for="p in periodos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </template>
        </CampoFormulario>
        <CampoFormulario id="c-plantel" etiqueta="Plantel" :error="errores.plantel_id">
          <template #default="{ describe }">
            <select
              id="c-plantel"
              v-model="form.plantel_id"
              class="campo"
              :aria-describedby="describe"
            >
              <option v-for="p in planteles" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </template>
        </CampoFormulario>
      </template>

      <template v-else>
        <CampoFormulario
          v-if="pestana === 'materias' || pestana === 'planteles'"
          id="c-clave"
          :etiqueta="pestana === 'planteles' ? 'Clave CCT' : 'Clave'"
          :error="errores.clave"
        >
          <template #default="{ invalido, describe }">
            <input
              id="c-clave"
              v-model.trim="form.clave"
              class="campo font-mono"
              :class="{ 'campo-error': invalido }"
              :aria-invalid="invalido"
              :aria-describedby="describe"
            />
          </template>
        </CampoFormulario>
        <CampoFormulario
          id="c-nombre"
          :etiqueta="
            pestana === 'grados'
              ? 'Grado (por ejemplo 4)'
              : pestana === 'periodos'
                ? 'Nombre (por ejemplo 2027 A)'
                : 'Nombre'
          "
          :error="errores.nombre"
        >
          <template #default="{ invalido, describe }">
            <input
              id="c-nombre"
              v-model.trim="form.nombre"
              class="campo"
              :class="{ 'campo-error': invalido }"
              :aria-invalid="invalido"
              :aria-describedby="describe"
            />
          </template>
        </CampoFormulario>
        <CampoFormulario
          v-if="pestana === 'materias'"
          id="c-evaluacion"
          etiqueta="Tipo de evaluación"
          :error="errores.tipo_evaluacion"
        >
          <template #default="{ describe }">
            <select
              id="c-evaluacion"
              v-model="form.tipo_evaluacion"
              class="campo"
              :aria-describedby="describe"
            >
              <option value="numerica">Numérica</option>
              <option value="alfanumerica">Acreditada / no acreditada (A / NA)</option>
            </select>
          </template>
        </CampoFormulario>
        <div v-if="pestana === 'periodos'" class="grid gap-4 sm:grid-cols-2">
          <CampoFormulario id="c-inicio" etiqueta="Inicio" :error="errores.fecha_inicio">
            <template #default="{ invalido, describe }">
              <input
                id="c-inicio"
                v-model="form.fecha_inicio"
                type="date"
                class="campo"
                :class="{ 'campo-error': invalido }"
                :aria-describedby="describe"
              />
            </template>
          </CampoFormulario>
          <CampoFormulario id="c-fin" etiqueta="Fin" :error="errores.fecha_fin">
            <template #default="{ invalido, describe }">
              <input
                id="c-fin"
                v-model="form.fecha_fin"
                type="date"
                class="campo"
                :class="{ 'campo-error': invalido }"
                :aria-describedby="describe"
              />
            </template>
          </CampoFormulario>
        </div>
      </template>

      <template #acciones>
        <button type="button" class="btn-secundario" @click="formAbierto = false">Cancelar</button>
        <button type="submit" class="btn-primario" :disabled="guardando">
          {{ guardando ? 'Guardando' : 'Agregar' }}
        </button>
      </template>
    </VentanaFormulario>
  </div>
</template>
