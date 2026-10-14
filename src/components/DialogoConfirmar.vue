<script setup lang="ts">
import { ref, watch } from 'vue'
import { PhWarning } from '@phosphor-icons/vue'
import { pendiente } from '@/composables/confirmar'

const dialogo = ref<HTMLDialogElement>()

// showModal() da gratis: foco atrapado, Esc para cancelar y el resto de la página inerte
watch(pendiente, (p) => (p ? dialogo.value?.showModal() : dialogo.value?.close()), {
  flush: 'post',
})
</script>

<template>
  <dialog
    ref="dialogo"
    class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-linea bg-white p-0 text-tinta-800 shadow-elevada backdrop:bg-marca-950/40"
    aria-labelledby="dialogo-titulo"
    @cancel.prevent="pendiente?.responder(false)"
  >
    <form v-if="pendiente" method="dialog" class="p-6" @submit.prevent="pendiente.responder(true)">
      <div class="flex gap-3">
        <PhWarning
          v-if="pendiente.peligro"
          :size="22"
          weight="fill"
          class="mt-0.5 shrink-0 text-riesgo-medio"
        />
        <div class="min-w-0">
          <h2 id="dialogo-titulo" class="text-lg font-semibold text-tinta-900">
            {{ pendiente.titulo }}
          </h2>
          <p v-if="pendiente.mensaje" class="mt-1.5 text-sm text-tinta-600">
            {{ pendiente.mensaje }}
          </p>
          <ul v-if="pendiente.detalle?.length" class="mt-3 space-y-1 text-sm text-tinta-700">
            <li v-for="d in pendiente.detalle" :key="d" class="font-mono text-[13px]">{{ d }}</li>
          </ul>
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn-secundario" @click="pendiente.responder(false)">
          Cancelar
        </button>
        <button type="submit" class="btn-primario" autofocus>
          {{ pendiente.aceptar ?? 'Aceptar' }}
        </button>
      </div>
    </form>
  </dialog>
</template>
