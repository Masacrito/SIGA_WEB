<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { PhArrowLeft, PhEnvelopeSimple, PhPencilSimple, PhPhone, PhStar } from '@phosphor-icons/vue'
import { expediente, historial, type Expediente, type RegistroHistorial } from '@/api/seguimiento'
import { mensajeDeError } from '@/api/http'
import { ESTADOS, etiquetaGrupo, fechaCorta } from '@/composables/riesgo'
import NivelRiesgo from '@/components/NivelRiesgo.vue'
import FormularioAlumno from '@/components/FormularioAlumno.vue'
import VentanaJustificar from '@/components/VentanaJustificar.vue'
import CalificacionesAlumno from '@/components/CalificacionesAlumno.vue'
import BitacoraAlumno from '@/components/BitacoraAlumno.vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Expediente: datos, riesgo del periodo, tutores, historial (por materia y por día),
 * calificaciones y bitácora. Cada sección aparece solo con su permiso.
 */
const route = useRoute()
const auth = useAuthStore()
const administra = auth.puede('gestionar_catalogos')
const puedeJustificar = auth.puede('autorizar_justificacion')
const verCalificaciones = auth.puede('consultar_calificaciones')
const verBitacora = auth.puede('registrar_observacion')
const editarAbierto = ref(false)
const alumno = ref<Expediente | null>(null)
const registros = ref<RegistroHistorial[]>([])
const cargando = ref(true)
const errorCarga = ref('')

async function cargar() {
  const id = Number(route.params.id)
  // Al recargar el mismo alumno (tras justificar o editar) no se desmonta la pantalla: no brinca el scroll
  cargando.value = alumno.value?.id !== id
  errorCarga.value = ''
  try {
    ;[alumno.value, registros.value] = await Promise.all([
      expediente(id),
      historial({ alumno_id: id }),
    ])
  } catch (e) {
    errorCarga.value = mensajeDeError(e)
  } finally {
    cargando.value = false
  }
}
watch(() => route.params.id, cargar, { immediate: true })

/** Por materia: cuántas clases, faltas, retardos y justificadas. */
const porMateria = computed(() => {
  const m = new Map<
    number,
    { nombre: string; clases: number; ausente: number; retardo: number; justificado: number }
  >()
  for (const r of registros.value) {
    const fila = m.get(r.materia.id) ?? {
      nombre: r.materia.nombre,
      clases: 0,
      ausente: 0,
      retardo: 0,
      justificado: 0,
    }
    fila.clases++
    if (r.estado !== 'presente') fila[r.estado]++
    m.set(r.materia.id, fila)
  }
  return [...m.values()].sort((a, b) => b.ausente - a.ausente || a.nombre.localeCompare(b.nombre))
})

/** Por día (más reciente primero); por omisión solo los días con algo que no fue "presente". */
const soloIncidencias = ref(true)
const porDia = computed(() => {
  const dias = new Map<string, RegistroHistorial[]>()
  for (const r of registros.value) dias.set(r.fecha, [...(dias.get(r.fecha) ?? []), r])
  return [...dias.entries()]
    .map(([fecha, clases]) => ({
      fecha,
      clases: clases.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
    }))
    .filter((d) => !soloIncidencias.value || d.clases.some((c) => c.estado !== 'presente'))
})
// Volver a donde venía (semáforo, búsqueda de alumnos o historial)
const anterior = window.history.state?.back as string | undefined
const atras = anterior && anterior !== '/login' ? anterior : '/semaforo'

// Justificar: las faltas y retardos de un día
const justificarAbierto = ref(false)
const diaAJustificar = ref<{ fecha: string; clases: RegistroHistorial[] }>({
  fecha: '',
  clases: [],
})
const porJustificar = (clases: RegistroHistorial[]) =>
  clases.filter((c) => c.estado === 'ausente' || c.estado === 'retardo')
function abrirJustificar(fecha: string, clases: RegistroHistorial[]) {
  diaAJustificar.value = { fecha, clases: porJustificar(clases) }
  justificarAbierto.value = true
}

const cambioDeGrupo = computed(() => new Set(registros.value.map((r) => r.grupo.id)).size > 1)
</script>

<template>
  <div>
    <RouterLink
      :to="atras"
      class="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-tinta-600 hover:text-marca-700"
    >
      <PhArrowLeft :size="16" weight="bold" /> Volver
    </RouterLink>

    <p v-if="cargando" role="status" class="text-sm text-tinta-500">Cargando expediente…</p>

    <div v-else-if="errorCarga" role="alert" class="max-w-xl border-t border-linea pt-6">
      <p class="text-[15px] text-tinta-800">{{ errorCarga }}</p>
      <button type="button" class="btn-secundario mt-4" @click="cargar">Reintentar</button>
    </div>

    <template v-else-if="alumno">
      <header class="flex flex-wrap items-start justify-between gap-4 border-b border-linea pb-6">
        <div>
          <h2 class="text-2xl font-semibold text-tinta-900">{{ alumno.nombre }}</h2>
          <p class="mt-1 text-sm text-tinta-600">
            <span class="font-mono">{{ alumno.matricula }}</span>
            <template v-if="alumno.grupo"> · {{ etiquetaGrupo(alumno.grupo) }}</template>
            <template v-if="alumno.situacion_academica">
              · {{ alumno.situacion_academica }}</template
            >
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span v-if="!alumno.activo" class="pildora bg-tinta-100 text-tinta-600">Baja</span>
          <button
            v-if="administra"
            type="button"
            class="btn-secundario px-3 py-1.5"
            @click="editarAbierto = true"
          >
            <PhPencilSimple :size="16" weight="bold" />
            Editar
          </button>
        </div>
      </header>
      <FormularioAlumno
        v-if="administra"
        v-model:abierto="editarAbierto"
        :alumno="alumno"
        @guardado="cargar"
      />

      <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <!-- Riesgo -->
        <section
          v-if="alumno.riesgo"
          aria-labelledby="titulo-riesgo"
          class="min-w-0 rounded-lg border border-linea bg-white p-5"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 id="titulo-riesgo" class="text-base font-semibold text-tinta-900">
              Inasistencia del periodo
            </h3>
            <NivelRiesgo :nivel="alumno.riesgo.nivel_riesgo" />
          </div>
          <p class="mt-3 text-4xl font-semibold tabular-nums text-tinta-900">
            {{ alumno.riesgo.porcentaje_inasistencia.toFixed(1) }} %
          </p>
          <p class="text-sm text-tinta-500 tabular-nums">
            {{ alumno.riesgo.faltas }} faltas en {{ alumno.riesgo.clases }} clases
          </p>
          <dl class="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt class="text-tinta-500">Faltas</dt>
              <dd class="text-lg font-semibold tabular-nums text-tinta-900">
                {{ alumno.riesgo.ausencias }}
              </dd>
            </div>
            <div>
              <dt class="text-tinta-500">Retardos</dt>
              <dd class="text-lg font-semibold tabular-nums text-tinta-900">
                {{ alumno.riesgo.retardos }}
                <span class="text-xs font-normal text-tinta-500"
                  >= {{ alumno.riesgo.faltas - alumno.riesgo.ausencias }} faltas</span
                >
              </dd>
            </div>
            <div>
              <dt class="text-tinta-500">Justificadas</dt>
              <dd class="text-lg font-semibold tabular-nums text-tinta-900">
                {{ alumno.riesgo.justificadas }}
              </dd>
            </div>
            <div>
              <dt class="text-tinta-500">Días seguidos sin venir</dt>
              <dd class="text-lg font-semibold tabular-nums text-tinta-900">
                {{ alumno.riesgo.racha_dias }}
              </dd>
            </div>
          </dl>
          <p v-if="cambioDeGrupo" class="mt-4 text-[13px] text-tinta-500">
            Cambió de grupo en el periodo: el porcentaje incluye las clases de su grupo anterior.
          </p>
        </section>
        <p v-else class="text-sm text-tinta-500">No está inscrito en el periodo activo.</p>

        <!-- Tutores -->
        <section
          aria-labelledby="titulo-tutores"
          class="min-w-0 rounded-lg border border-linea bg-white p-5"
        >
          <h3 id="titulo-tutores" class="text-base font-semibold text-tinta-900">
            Padres o tutores
          </h3>
          <p v-if="!alumno.tutores.length" class="mt-3 text-sm text-tinta-500">
            Sin tutores registrados.
          </p>
          <ul class="mt-3 space-y-4">
            <li v-for="t in alumno.tutores" :key="t.id" class="text-sm">
              <p class="flex items-center gap-1.5 font-medium text-tinta-900">
                <PhStar
                  v-if="t.es_principal"
                  :size="14"
                  weight="fill"
                  class="text-marca-800"
                  aria-label="Tutor principal"
                />
                {{ t.nombre }}
              </p>
              <p class="text-xs text-tinta-500">
                {{ t.parentesco ?? 'Sin parentesco' }} · avisos por
                {{ t.canal_preferido === 'email' ? 'correo' : 'SMS' }}
              </p>
              <p
                v-if="t.telefono"
                class="mt-1 flex items-center gap-1.5 font-mono text-[13px] text-tinta-700"
              >
                <PhPhone :size="14" />
                <a :href="`tel:${t.telefono.replace(/\s/g, '')}`" class="hover:underline">{{
                  t.telefono
                }}</a>
              </p>
              <p v-if="t.correo" class="flex items-center gap-1.5 text-[13px] text-tinta-700">
                <PhEnvelopeSimple :size="14" />
                <a :href="`mailto:${t.correo}`" class="break-all hover:underline">{{ t.correo }}</a>
              </p>
            </li>
          </ul>
        </section>
      </div>

      <!-- Por materia -->
      <section v-if="porMateria.length" aria-labelledby="titulo-materias" class="mt-8">
        <h3 id="titulo-materias" class="text-base font-semibold text-tinta-900">Por materia</h3>
        <div class="relative mt-3 overflow-x-auto rounded-lg border border-linea bg-white">
          <table class="w-full min-w-[32rem] text-sm">
            <thead>
              <tr class="border-b border-linea text-left text-tinta-900">
                <th scope="col" class="px-4 py-2.5 font-semibold">Materia</th>
                <th scope="col" class="px-4 py-2.5 text-right font-semibold">Clases</th>
                <th scope="col" class="px-4 py-2.5 text-right font-semibold">Faltas</th>
                <th scope="col" class="px-4 py-2.5 text-right font-semibold">Retardos</th>
                <th scope="col" class="px-4 py-2.5 text-right font-semibold">Justificadas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-linea tabular-nums">
              <tr v-for="m in porMateria" :key="m.nombre">
                <th scope="row" class="px-4 py-2.5 text-left font-normal text-tinta-900">
                  {{ m.nombre }}
                </th>
                <td class="px-4 py-2.5 text-right">{{ m.clases }}</td>
                <td
                  class="px-4 py-2.5 text-right"
                  :class="{ 'font-semibold text-tinta-900': m.ausente }"
                >
                  {{ m.ausente }}
                </td>
                <td class="px-4 py-2.5 text-right">{{ m.retardo }}</td>
                <td class="px-4 py-2.5 text-right">{{ m.justificado }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <CalificacionesAlumno v-if="verCalificaciones" :alumno-id="alumno.id" />
      <BitacoraAlumno v-if="verBitacora" :alumno-id="alumno.id" />

      <!-- Por día -->
      <section aria-labelledby="titulo-dias" class="mt-8">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 id="titulo-dias" class="text-base font-semibold text-tinta-900">Día por día</h3>
          <label class="flex cursor-pointer items-center gap-2 text-sm text-tinta-600">
            <input v-model="soloIncidencias" type="checkbox" class="size-4 accent-marca-800" />
            Solo días con faltas, retardos o justificantes
          </label>
        </div>
        <p v-if="!porDia.length" class="mt-3 text-sm text-tinta-500">
          {{
            registros.length ? 'Asistió a todas sus clases.' : 'Todavía no hay clases registradas.'
          }}
        </p>
        <ul class="mt-3 divide-y divide-linea rounded-lg border border-linea bg-white">
          <li
            v-for="d in porDia"
            :key="d.fecha"
            class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
          >
            <span class="w-36 shrink-0 text-sm font-medium text-tinta-800 first-letter:uppercase">{{
              fechaCorta(d.fecha)
            }}</span>
            <ul class="flex flex-wrap gap-1.5">
              <li
                v-for="c in d.clases"
                :key="c.id"
                class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
                :class="ESTADOS[c.estado].clase"
                :title="`${c.hora_inicio} ${c.materia.nombre}: ${ESTADOS[c.estado].etiqueta}${c.motivo_justificacion ? ' — ' + c.motivo_justificacion : ''}`"
              >
                <span class="font-semibold">{{ ESTADOS[c.estado].letra }}</span>
                <span class="font-mono">{{ c.hora_inicio }}</span>
                <span>{{ c.materia.clave }}</span>
                <span class="sr-only">{{ ESTADOS[c.estado].etiqueta }}</span>
              </li>
            </ul>
            <span
              v-if="d.clases.find((c) => c.motivo_justificacion)"
              class="text-xs text-tinta-500"
            >
              {{ d.clases.find((c) => c.motivo_justificacion)?.motivo_justificacion }}
            </span>
            <button
              v-if="puedeJustificar && porJustificar(d.clases).length"
              type="button"
              class="ml-auto rounded-md px-2 py-1 text-xs font-medium text-marca-700 hover:bg-marca-50"
              :aria-label="`Justificar el ${fechaCorta(d.fecha)}`"
              @click="abrirJustificar(d.fecha, d.clases)"
            >
              Justificar
            </button>
          </li>
        </ul>
        <p class="mt-3 text-xs text-tinta-500">
          ✓ presente · R retardo · F falta · J justificada. Pasa el cursor sobre una clase para ver
          la materia.
        </p>
      </section>
      <VentanaJustificar
        v-if="puedeJustificar"
        v-model:abierto="justificarAbierto"
        :fecha="diaAJustificar.fecha"
        :clases="diaAJustificar.clases"
        @guardado="cargar"
      />
    </template>
  </div>
</template>
