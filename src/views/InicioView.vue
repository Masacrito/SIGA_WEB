<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { PhCaretRight, PhDeviceMobile } from '@phosphor-icons/vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const SECCIONES = ['Seguimiento', 'Administración'] as const

const grupos = computed(() =>
  SECCIONES.map((seccion) => ({
    seccion,
    items: router
      .getRoutes()
      .filter((r) => r.meta.seccion === seccion && auth.puede(r.meta.permiso)),
  })).filter((g) => g.items.length > 0),
)

/** Quien pasa lista (y no administra) lo hace desde la app móvil: se le recuerda. */
const pasaListaEnApp = computed(
  () => auth.puede('registrar_asistencia') && !auth.puede('gestionar_usuarios'),
)

const nombrePila = computed(() => auth.usuario?.nombre?.split(' ')[0] ?? '')

const saludo = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
})
</script>

<template>
  <div>
    <section class="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div>
        <h2 class="text-[1.875rem] font-semibold tracking-[-0.03em] text-tinta-900">
          {{ saludo }}, {{ nombrePila }}
        </h2>
      </div>
      <div class="flex items-center gap-2">
        <span class="pildora bg-marca-50 text-marca-800">{{ auth.usuario?.rol }}</span>
        <span v-if="auth.usuario?.es_super_admin" class="pildora bg-amber-50 text-amber-800">
          Súper admin
        </span>
      </div>
    </section>

    <div
      v-if="grupos.length"
      class="mt-10 grid items-start gap-x-12 gap-y-10"
      :class="grupos.length > 1 ? 'lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]' : 'max-w-3xl'"
    >
      <section v-for="grupo in grupos" :key="grupo.seccion">
        <h3 class="pb-3 text-[15px] font-semibold text-tinta-900">{{ grupo.seccion }}</h3>
        <ul class="divide-y divide-linea border-y border-linea">
          <li v-for="(r, i) in grupo.items" :key="r.path" class="entrada" :style="{ '--i': i }">
            <RouterLink
              :to="r.path"
              class="group -mx-3 flex items-center gap-4 rounded-lg px-3 py-3.5 transition-colors duration-150 hover:bg-white"
            >
              <component
                :is="r.meta.icono"
                v-if="r.meta.icono"
                :size="22"
                weight="bold"
                class="shrink-0 text-marca-700"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[15px] font-medium text-tinta-900">
                  {{ r.meta.titulo }}
                </span>
                <span class="block truncate text-[13px] text-tinta-500">
                  {{ r.meta.descripcion }}
                </span>
              </span>
              <PhCaretRight
                :size="16"
                weight="bold"
                class="shrink-0 text-tinta-300 transition group-hover:translate-x-0.5 group-hover:text-marca-700"
              />
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>

    <aside
      v-if="pasaListaEnApp || !grupos.length"
      class="mt-10 flex max-w-2xl gap-4 border-l-2 border-marca-300 py-1 pl-5"
    >
      <PhDeviceMobile :size="24" weight="bold" class="mt-0.5 shrink-0 text-marca-700" />
      <div>
        <h3 class="font-semibold text-tinta-900">El pase de lista se hace desde la app móvil</h3>
        <p class="mt-1 text-sm leading-relaxed text-tinta-600">
          Entra a la app con este mismo usuario para ver tus grupos y pasar lista, incluso sin
          señal. Aquí en la web consultas lo que ya se registró.
        </p>
      </div>
    </aside>

    <details class="group mt-12 text-sm">
      <summary
        class="inline-flex cursor-pointer list-none items-center gap-1.5 rounded text-tinta-500 transition hover:text-tinta-800"
      >
        <PhCaretRight :size="14" weight="bold" class="transition group-open:rotate-90" />
        Permisos de esta sesión ({{ auth.usuario?.permisos?.length ?? 0 }})
      </summary>
      <ul class="mt-3 flex flex-wrap gap-1.5 pl-5">
        <li
          v-for="p in auth.usuario?.permisos"
          :key="p"
          class="rounded-md border border-linea bg-white px-2 py-0.5 font-mono text-xs text-tinta-600"
        >
          {{ p }}
        </li>
      </ul>
    </details>
  </div>
</template>
