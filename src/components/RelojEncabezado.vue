<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

/**
 * Hora y fecha locales en el encabezado (como en el sistema de tickets).
 * En una escuela la hora importa: dice en qué módulo de clase va el día.
 */
const ahora = ref(new Date())
const timer = window.setInterval(() => (ahora.value = new Date()), 15_000)
onBeforeUnmount(() => window.clearInterval(timer))

const hora = (d: Date) =>
  new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
const fecha = (d: Date) =>
  new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
</script>

<template>
  <div class="hidden text-right leading-tight md:block" aria-label="Fecha y hora locales">
    <time
      class="block font-mono text-[15px] font-semibold text-tinta-900 tabular-nums"
      :datetime="ahora.toISOString()"
      >{{ hora(ahora) }}</time
    >
    <span class="block text-xs text-tinta-500 first-letter:uppercase">{{ fecha(ahora) }}</span>
  </div>
</template>
