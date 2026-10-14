<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { PhList, PhSidebarSimple, PhSignOut, PhX } from '@phosphor-icons/vue'
import { useAuthStore } from '@/stores/auth'
import MarcaInstitucional from '@/components/MarcaInstitucional.vue'
import RelojEncabezado from '@/components/RelojEncabezado.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const menuAbierto = ref(false)

/** En escritorio el menú se puede contraer a solo íconos; se recuerda por navegador. */
const CLAVE_CONTRAIDO = 'siga.menuContraido'
function leerContraido() {
  try {
    return localStorage.getItem(CLAVE_CONTRAIDO) === '1'
  } catch {
    return false
  }
}
const contraido = ref(leerContraido())
function alternarContraido() {
  contraido.value = !contraido.value
  try {
    localStorage.setItem(CLAVE_CONTRAIDO, contraido.value ? '1' : '0')
  } catch {
    /* sin almacenamiento: dura lo que la pestaña */
  }
}
const saliendo = ref(false)

const SECCIONES = ['General', 'Seguimiento', 'Administración'] as const

/**
 * El menú sale de las propias rutas: si una ruta tiene `seccion` y el usuario
 * tiene su permiso, aparece. Agregar una pantalla = agregar su ruta, nada más.
 */
const menu = computed(() =>
  SECCIONES.map((seccion) => ({
    seccion,
    items: router
      .getRoutes()
      .filter((r) => r.meta.seccion === seccion && auth.puede(r.meta.permiso)),
  })).filter((g) => g.items.length > 0),
)

const iniciales = computed(() =>
  (auth.usuario?.nombre ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase(),
)

watch(
  () => route.fullPath,
  () => (menuAbierto.value = false),
)

async function salir() {
  saliendo.value = true
  await auth.cerrarSesion()
  router.replace({ name: 'login' })
}
</script>

<template>
  <a
    href="#contenido"
    class="sr-only z-aviso rounded-md bg-white px-3 py-2 text-sm font-medium text-marca-800 shadow-elevada focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
  >
    Saltar al contenido
  </a>

  <div class="flex min-h-dvh">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="menuAbierto"
        class="fixed inset-0 z-menu-fondo bg-marca-950/40 lg:hidden"
        aria-hidden="true"
        @click="menuAbierto = false"
      />
    </Transition>

    <aside
      class="fixed inset-y-0 left-0 z-menu flex w-[16.5rem] flex-col border-r border-linea bg-white transition-[transform,width] duration-300 ease-salida lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0"
      :class="[
        menuAbierto ? 'translate-x-0 shadow-elevada' : '-translate-x-full',
        { 'lg:w-[4.75rem]': contraido },
      ]"
      aria-label="Menú principal"
    >
      <div
        class="flex h-[4.5rem] items-center justify-between px-5"
        :class="{ 'lg:justify-center lg:px-0': contraido }"
      >
        <MarcaInstitucional :compacta="contraido && !menuAbierto" class="max-lg:!flex" />
        <button
          type="button"
          class="rounded-lg p-3 text-tinta-500 transition hover:bg-tinta-100 lg:hidden"
          aria-label="Cerrar menú"
          @click="menuAbierto = false"
        >
          <PhX :size="20" />
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 pt-3 pb-6">
        <div v-for="grupo in menu" :key="grupo.seccion" class="mt-6 first:mt-0">
          <p
            v-if="grupo.seccion !== 'General'"
            class="mb-1 px-3 text-[13px] font-semibold text-tinta-500"
            :class="{ 'lg:sr-only': contraido }"
          >
            {{ grupo.seccion }}
          </p>
          <hr
            v-if="grupo.seccion !== 'General' && contraido"
            class="mx-3 mb-2 hidden border-linea lg:block"
          />
          <ul>
            <li v-for="item in grupo.items" :key="item.path">
              <RouterLink
                :to="item.path"
                :title="contraido ? item.meta.titulo : undefined"
                :class="{ 'lg:justify-center lg:px-0': contraido }"
                class="group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] lg:py-[7px] text-tinta-600 transition-colors duration-150 hover:bg-tinta-50 hover:text-tinta-900"
                exact-active-class="es-activo !bg-marca-50 !text-marca-900 font-semibold before:absolute before:inset-y-1.5 before:-left-3 before:w-[3px] before:rounded-r before:bg-marca-800"
              >
                <component
                  :is="item.meta.icono"
                  v-if="item.meta.icono"
                  :size="18"
                  :weight="route.path === item.path ? 'fill' : 'bold'"
                  class="shrink-0 text-tinta-400 transition-colors group-hover:text-tinta-700 group-[.es-activo]:text-marca-800"
                  aria-hidden="true"
                />
                <span class="truncate" :class="{ 'lg:sr-only': contraido }">{{
                  item.meta.titulo
                }}</span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </nav>

      <div class="border-t border-linea p-3">
        <div
          class="flex items-center gap-3 px-2 py-1.5"
          :class="{ 'lg:flex-col lg:gap-2 lg:px-0': contraido }"
        >
          <div
            class="grid size-9 shrink-0 place-items-center rounded-lg bg-marca-800 text-[13px] font-bold text-white"
            aria-hidden="true"
          >
            {{ iniciales }}
          </div>
          <div class="min-w-0 flex-1 leading-tight" :class="{ 'lg:hidden': contraido }">
            <p class="truncate text-sm font-semibold text-tinta-900">{{ auth.usuario?.nombre }}</p>
            <p class="truncate text-[13px] text-tinta-500 first-letter:uppercase">
              {{ auth.usuario?.rol }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-md p-3 text-tinta-400 transition lg:p-2 hover:bg-tinta-100 hover:text-tinta-800 disabled:opacity-50"
            :disabled="saliendo"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            @click="salir"
          >
            <PhSignOut :size="20" />
          </button>
        </div>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-20 flex h-[4.5rem] shrink-0 items-center gap-3 border-b border-linea bg-lienzo/85 px-4 backdrop-blur-md sm:px-6 lg:px-12"
      >
        <button
          type="button"
          class="-ml-2 rounded-lg p-[11px] text-tinta-600 transition hover:bg-tinta-100 lg:hidden"
          aria-label="Abrir menú"
          @click="menuAbierto = true"
        >
          <PhList :size="22" />
        </button>
        <button
          type="button"
          class="-ml-2 hidden rounded-lg p-2 text-tinta-500 transition hover:bg-tinta-100 hover:text-tinta-800 lg:block"
          :aria-label="contraido ? 'Expandir menú' : 'Contraer menú'"
          :aria-expanded="!contraido"
          :title="contraido ? 'Expandir menú' : 'Contraer menú'"
          @click="alternarContraido"
        >
          <PhSidebarSimple :size="20" />
        </button>
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-lg font-bold text-tinta-900">{{ route.meta.titulo }}</h1>
          <p
            v-if="route.meta.descripcion"
            class="hidden truncate text-[13px] text-tinta-500 sm:block"
          >
            {{ route.meta.descripcion }}
          </p>
        </div>
        <RelojEncabezado class="ml-auto shrink-0 pl-4" />
      </header>

      <main id="contenido" class="flex-1 px-4 py-8 sm:px-6 lg:px-12 lg:py-10" tabindex="-1">
        <div class="mx-auto w-full max-w-6xl">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
