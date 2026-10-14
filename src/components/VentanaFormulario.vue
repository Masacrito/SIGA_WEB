<script setup lang="ts">
import { ref, watch } from 'vue'
import { PhX } from '@phosphor-icons/vue'

/**
 * Ventana modal para formularios de alta/edición, con <dialog> nativo como
 * DialogoConfirmar: foco atrapado, Esc cierra y el resto de la página queda inerte.
 */
const abierto = defineModel<boolean>('abierto', { required: true })
defineProps<{ titulo: string; descripcion?: string; ancho?: string }>()
const emit = defineEmits<{ enviar: [] }>()

const dialogo = ref<HTMLDialogElement>()
watch(abierto, (si) => (si ? dialogo.value?.showModal() : dialogo.value?.close()), {
  flush: 'post',
})
</script>

<template>
  <dialog
    ref="dialogo"
    class="m-auto max-h-[calc(100dvh-2rem)] rounded-xl border border-linea bg-white p-0 text-tinta-800 shadow-elevada backdrop:bg-marca-950/40"
    :class="ancho ?? 'w-[min(32rem,calc(100vw-2rem))]'"
    aria-labelledby="ventana-titulo"
    @cancel.prevent="abierto = false"
  >
    <form v-if="abierto" class="flex flex-col" novalidate @submit.prevent="emit('enviar')">
      <header class="flex items-start justify-between gap-4 border-b border-linea px-6 py-4">
        <div class="min-w-0">
          <h2 id="ventana-titulo" class="text-lg font-semibold text-tinta-900">{{ titulo }}</h2>
          <p v-if="descripcion" class="mt-0.5 text-sm text-tinta-500">{{ descripcion }}</p>
        </div>
        <button
          type="button"
          class="-mr-2 grid size-9 shrink-0 place-items-center rounded-md text-tinta-500 hover:bg-tinta-50 hover:text-tinta-800"
          aria-label="Cerrar"
          @click="abierto = false"
        >
          <PhX :size="18" weight="bold" />
        </button>
      </header>
      <div class="space-y-4 overflow-y-auto px-6 py-5">
        <slot />
      </div>
      <footer
        v-if="$slots.acciones"
        class="flex justify-end gap-2 border-t border-linea bg-tinta-50/60 px-6 py-3"
      >
        <slot name="acciones" />
      </footer>
    </form>
  </dialog>
</template>
