<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { PhWrench } from '@phosphor-icons/vue'
const route = useRoute()
</script>

<template>
  <section class="max-w-xl border-t border-linea pt-8">
    <PhWrench :size="28" weight="bold" class="text-marca-700" />
    <h2 class="mt-4 text-xl font-semibold tracking-[-0.02em] text-tinta-900">
      Esta pantalla todavía no está lista
    </h2>
    <p class="mt-2 text-[15px] leading-relaxed text-tinta-600">
      {{ route.meta.descripcion }}.
      <template v-if="route.meta.bloque"
        >Se programa en el bloque {{ route.meta.bloque }}.</template
      >
    </p>
    <p class="mt-4 text-xs text-tinta-500">
      Permiso requerido: <code class="font-mono">{{ route.meta.permiso }}</code>
    </p>
    <RouterLink
      to="/"
      class="mt-8 inline-block text-sm font-medium text-marca-700 underline decoration-marca-200 underline-offset-4 transition hover:decoration-marca-700"
    >
      Volver al inicio
    </RouterLink>
  </section>
</template>
