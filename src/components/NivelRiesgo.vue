<script setup lang="ts">
import type { Nivel } from '@/api/seguimiento'
import { NIVELES } from '@/composables/riesgo'

/** Píldora del semáforo: punto de color + nombre del nivel (nunca solo color). */
defineProps<{ nivel: Nivel }>()
</script>

<template>
  <span class="pildora gap-1.5" :class="[NIVELES[nivel].fondo, NIVELES[nivel].texto]">
    <span
      class="size-2 rounded-full"
      :style="{ background: NIVELES[nivel].punto }"
      aria-hidden="true"
    />
    {{ NIVELES[nivel].etiqueta }}
  </span>
</template>
