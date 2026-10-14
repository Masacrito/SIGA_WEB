<script setup lang="ts">
import { RouterLink } from 'vue-router'
import MarcaInstitucional from '@/components/MarcaInstitucional.vue'
</script>

<template>
  <main class="renglones flex min-h-dvh flex-col bg-lienzo px-5 py-8 sm:px-12">
    <MarcaInstitucional />
    <div class="my-auto max-w-lg py-16">
      <p class="font-mono text-sm text-tinta-500">404</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-[-0.03em] text-tinta-900">
        Esta página no está en la lista
      </h1>
      <p class="mt-3 text-[15px] leading-relaxed text-tinta-600">
        Puede que la dirección esté mal escrita o que la pantalla se haya movido.
      </p>
      <RouterLink to="/" class="btn-primario mt-8">Ir al inicio</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.renglones {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0 31px,
    rgb(18 36 65 / 0.035) 31px 32px
  );
}
</style>
