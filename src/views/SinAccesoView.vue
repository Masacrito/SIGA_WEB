<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { PhLock } from '@phosphor-icons/vue'
</script>

<template>
  <section class="max-w-xl border-t border-linea pt-8">
    <PhLock :size="28" weight="bold" class="text-tinta-500" />
    <h2 class="mt-4 text-xl font-semibold tracking-[-0.02em] text-tinta-900">
      Tu rol no tiene acceso a esta sección
    </h2>
    <p class="mt-2 text-[15px] leading-relaxed text-tinta-600">
      Si la necesitas para tu trabajo, pide al administrador que revise los permisos de tu rol.
    </p>
    <RouterLink to="/" class="btn-primario mt-8">Volver al inicio</RouterLink>
  </section>
</template>
