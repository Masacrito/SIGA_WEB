<script setup lang="ts">
import { PRODUCTO, SUBTITULO_INSTITUCION } from '@/config/institucion'

withDefaults(defineProps<{ compacta?: boolean }>(), { compacta: false })
</script>

<template>
  <div class="flex items-center gap-3">
    <!--
      La marca es un renglón de lista de asistencia: tres alumnos (la barra es
      el nombre) y tres días. Llena = asistió, contorno = falta, media = retardo.
    -->
    <svg viewBox="0 0 36 28" class="h-7 w-9 shrink-0 text-marca-800" aria-hidden="true">
      <g fill="currentColor">
        <rect x="0" y="3" width="10" height="2.5" rx="1.25" opacity=".35" />
        <rect x="13" y="1" width="6.5" height="6.5" rx="1.6" />
        <rect x="21.5" y="1" width="6.5" height="6.5" rx="1.6" />
        <rect x="30" y="1" width="6" height="6.5" rx="1.6" />
        <rect x="0" y="13" width="7" height="2.5" rx="1.25" opacity=".35" />
        <rect x="13" y="11" width="6.5" height="6.5" rx="1.6" />
        <rect x="30" y="11" width="6" height="6.5" rx="1.6" />
        <rect x="0" y="23" width="9" height="2.5" rx="1.25" opacity=".35" />
        <rect x="13" y="21" width="6.5" height="6.5" rx="1.6" />
        <rect x="21.5" y="21" width="6.5" height="6.5" rx="1.6" />
        <path d="M30 24.25h6v1.65A1.6 1.6 0 0 1 34.4 27.5h-2.8A1.6 1.6 0 0 1 30 25.9z" />
      </g>
      <g fill="none" stroke="currentColor" stroke-width="1.3">
        <rect x="22.15" y="11.65" width="5.2" height="5.2" rx="1.2" />
        <rect x="30.65" y="21.65" width="4.7" height="5.2" rx="1.2" />
      </g>
    </svg>
    <div v-if="!compacta" class="min-w-0 leading-tight">
      <p class="text-[17px] font-bold tracking-[0.02em] text-marca-900">{{ PRODUCTO.nombre }}</p>
      <p class="truncate text-xs text-tinta-500">{{ SUBTITULO_INSTITUCION }}</p>
    </div>
  </div>
</template>
