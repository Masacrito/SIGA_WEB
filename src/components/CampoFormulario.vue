<script setup lang="ts">
/** Etiqueta + control (slot) + error del 422 debajo, enlazado por aria-describedby. */
defineProps<{ id: string; etiqueta: string; error?: string; ayuda?: string }>()
</script>

<template>
  <div>
    <label :for="id" class="etiqueta">{{ etiqueta }}</label>
    <slot
      :invalido="!!error"
      :describe="error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined"
    />
    <p v-if="error" :id="`${id}-error`" class="mt-1.5 text-[13px] text-riesgo-alto">{{ error }}</p>
    <p v-else-if="ayuda" :id="`${id}-ayuda`" class="mt-1.5 text-[13px] text-tinta-500">
      {{ ayuda }}
    </p>
  </div>
</template>
