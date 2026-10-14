<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { PhArrowCounterClockwise, PhInfo } from '@phosphor-icons/vue'
import {
  guardarPermisosDeRol,
  listarPermisos,
  listarRoles,
  type Permiso,
  type Rol,
} from '@/api/rbac'
import { mensajeDeError } from '@/api/http'
import { avisar } from '@/composables/avisos'
import { confirmar } from '@/composables/confirmar'
import { useAuthStore } from '@/stores/auth'

/**
 * Matriz rol → permisos (CU-10). Se marca todo lo que se quiera y se guarda
 * de una vez; solo se manda PUT de los roles que cambiaron.
 */
const auth = useAuthStore()
const router = useRouter()

const roles = ref<Rol[]>([])
const permisos = ref<Permiso[]>([])
const cargando = ref(true)
const errorCarga = ref('')
const guardando = ref(false)

/** Lo que hay en el servidor y lo que está marcado en pantalla, por rol. */
const original = reactive(new Map<number, Set<number>>())
const marcado = reactive(new Map<number, Set<number>>())

function tomar(rs: Rol[]) {
  for (const r of rs) {
    original.set(r.id, new Set(r.permisos.map((p) => p.id)))
    marcado.set(r.id, new Set(r.permisos.map((p) => p.id)))
  }
}

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    ;[roles.value, permisos.value] = await Promise.all([listarRoles(), listarPermisos()])
    tomar(roles.value)
  } catch (e) {
    errorCarga.value = mensajeDeError(e)
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

const tiene = (rolId: number, permisoId: number) => marcado.get(rolId)?.has(permisoId) ?? false
const cambio = (rolId: number, permisoId: number) =>
  tiene(rolId, permisoId) !== (original.get(rolId)?.has(permisoId) ?? false)

function alternar(rolId: number, permisoId: number) {
  const s = marcado.get(rolId)!
  if (s.has(permisoId)) s.delete(permisoId)
  else s.add(permisoId)
}

const nombrePermiso = (id: number) => permisos.value.find((p) => p.id === id)?.nombre ?? `#${id}`

const cambios = computed(() =>
  roles.value
    .map((r) => {
      const antes = original.get(r.id)!
      const ahora = marcado.get(r.id)!
      return {
        rol: r,
        mas: [...ahora].filter((id) => !antes.has(id)),
        menos: [...antes].filter((id) => !ahora.has(id)),
      }
    })
    .filter((c) => c.mas.length || c.menos.length),
)
const totalCambios = computed(() =>
  cambios.value.reduce((n, c) => n + c.mas.length + c.menos.length, 0),
)

function descartar() {
  for (const [id, s] of original) marcado.set(id, new Set(s))
}

async function guardar() {
  const propio = cambios.value.find((c) => c.rol.nombre === auth.usuario?.rol)
  const pierdeAcceso =
    !auth.usuario?.es_super_admin &&
    !!propio?.menos.some((id) => nombrePermiso(id) === 'gestionar_usuarios')

  const ok = await confirmar({
    titulo: `¿Guardar ${totalCambios.value} ${totalCambios.value === 1 ? 'cambio' : 'cambios'}?`,
    mensaje: pierdeAcceso
      ? 'Le estás quitando "gestionar_usuarios" a tu propio rol: perderás el acceso a esta pantalla.'
      : 'Aplica de inmediato a todos los usuarios de cada rol.',
    detalle: cambios.value.map(
      (c) =>
        `${c.rol.nombre}: ${[...c.mas.map((id) => '+ ' + nombrePermiso(id)), ...c.menos.map((id) => '− ' + nombrePermiso(id))].join(', ')}`,
    ),
    aceptar: 'Guardar',
    peligro: pierdeAcceso,
  })
  if (!ok) return

  guardando.value = true
  try {
    const actualizados = await Promise.all(
      cambios.value.map((c) => guardarPermisosDeRol(c.rol.id, [...marcado.get(c.rol.id)!])),
    )
    tomar(actualizados)
    avisar('Permisos guardados.')
    if (propio) {
      await auth.refrescarUsuario()
      if (!auth.puede('gestionar_usuarios')) router.replace({ name: 'inicio' })
    }
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  } finally {
    guardando.value = false
  }
}

onBeforeRouteLeave(async () => {
  if (!totalCambios.value) return true
  return confirmar({
    titulo: 'Tienes cambios sin guardar',
    mensaje: 'Si sales ahora se pierden.',
    aceptar: 'Salir sin guardar',
    peligro: true,
  })
})
</script>

<template>
  <div>
    <p v-if="cargando" role="status" class="text-sm text-tinta-500">Cargando roles y permisos…</p>

    <div v-else-if="errorCarga" role="alert" class="max-w-xl border-t border-linea pt-6">
      <p class="text-[15px] text-tinta-800">{{ errorCarga }}</p>
      <button type="button" class="btn-secundario mt-4" @click="cargar">Reintentar</button>
    </div>

    <template v-else>
      <div
        class="sticky top-[4.5rem] z-10 -mx-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-linea bg-lienzo/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-12 lg:px-12"
      >
        <p class="text-sm text-tinta-600" aria-live="polite">
          <template v-if="totalCambios">
            <span class="font-semibold text-marca-800">{{ totalCambios }}</span>
            {{ totalCambios === 1 ? 'cambio sin guardar' : 'cambios sin guardar' }}
          </template>
          <template v-else
            >Marca qué puede hacer cada rol. Los cambios aplican a todos sus usuarios.</template
          >
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn-secundario"
            :disabled="!totalCambios || guardando"
            @click="descartar"
          >
            <PhArrowCounterClockwise :size="16" weight="bold" />
            Descartar
          </button>
          <button
            type="button"
            class="btn-primario"
            :disabled="!totalCambios || guardando"
            @click="guardar"
          >
            {{ guardando ? 'Guardando' : 'Guardar cambios' }}
          </button>
        </div>
      </div>

      <div class="mt-6 overflow-x-auto rounded-lg border border-linea bg-white">
        <table class="w-full min-w-[34rem] border-collapse text-sm">
          <caption class="sr-only">
            Permisos por rol
          </caption>
          <thead>
            <tr class="border-b border-linea">
              <!-- Columna del permiso fija: en celular se desliza la tabla y no se pierde de qué fila es -->
              <th
                scope="col"
                class="sticky left-0 z-[1] bg-white px-4 py-3 text-left font-semibold text-tinta-900"
              >
                Permiso
              </th>
              <th
                v-for="r in roles"
                :key="r.id"
                scope="col"
                class="w-24 px-3 py-3 text-center font-semibold text-tinta-900 sm:w-32"
              >
                <span class="block first-letter:uppercase">{{ r.nombre }}</span>
                <span class="block text-xs font-normal text-tinta-500 tabular-nums">
                  {{ marcado.get(r.id)?.size ?? 0 }} de {{ permisos.length }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-linea">
            <tr v-for="p in permisos" :key="p.id" class="transition-colors hover:bg-tinta-50/60">
              <th
                scope="row"
                class="sticky left-0 z-[1] max-w-[13rem] bg-white px-4 py-2.5 text-left font-normal sm:max-w-none"
              >
                <span class="block text-tinta-900">{{ p.descripcion }}</span>
                <span class="block font-mono text-xs text-tinta-500">{{ p.nombre }}</span>
              </th>
              <td
                v-for="r in roles"
                :key="r.id"
                class="px-3 py-2.5 text-center transition-colors"
                :class="{ 'bg-marca-50': cambio(r.id, p.id) }"
              >
                <label class="inline-grid size-10 cursor-pointer place-items-center rounded-md">
                  <input
                    type="checkbox"
                    class="size-[18px] cursor-pointer accent-marca-800"
                    :checked="tiene(r.id, p.id)"
                    :aria-label="`${p.descripcion}: ${r.nombre}`"
                    :disabled="guardando"
                    @change="alternar(r.id, p.id)"
                  />
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="mt-5 flex max-w-3xl gap-2 text-[13px] leading-relaxed text-tinta-500">
        <PhInfo :size="16" weight="bold" class="mt-0.5 shrink-0" />
        <span>
          El permiso dice <em>qué</em> puede hacer cada rol; <em>sobre quién</em> lo decide el
          sistema: un docente solo ve los grupos donde da clase y un orientador solo los que tiene
          asignados, salvo con <code class="font-mono">ver_todos_los_grupos</code>. Los usuarios
          súper admin tienen todo, sin importar su rol.
        </span>
      </p>
    </template>
  </div>
</template>
