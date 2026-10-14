<script setup lang="ts">
import { PhCheckCircle, PhWarningCircle, PhX } from '@phosphor-icons/vue'
import { avisos, cerrarAviso } from '@/composables/avisos'
</script>

<template>
  <!-- role=status / alert: los lectores de pantalla lo anuncian sin mover el foco -->
  <div
    class="pointer-events-none fixed inset-x-4 bottom-4 z-aviso flex flex-col items-end gap-2 sm:left-auto"
  >
    <TransitionGroup
      enter-active-class="transition duration-300 ease-salida"
      leave-active-class="transition duration-200"
      enter-from-class="translate-y-2 opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-for="a in avisos"
        :key="a.id"
        :role="a.tipo === 'error' ? 'alert' : 'status'"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border bg-white px-4 py-3 text-sm shadow-elevada"
        :class="a.tipo === 'error' ? 'border-red-200 text-red-800' : 'border-linea text-tinta-800'"
      >
        <component
          :is="a.tipo === 'error' ? PhWarningCircle : PhCheckCircle"
          :size="18"
          weight="fill"
          class="mt-px shrink-0"
          :class="a.tipo === 'error' ? 'text-riesgo-alto' : 'text-riesgo-bajo'"
        />
        <span class="flex-1">{{ a.texto }}</span>
        <button
          type="button"
          class="-m-1 rounded p-1 text-tinta-400 hover:text-tinta-700"
          aria-label="Cerrar aviso"
          @click="cerrarAviso(a.id)"
        >
          <PhX :size="14" weight="bold" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
