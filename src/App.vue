<script setup lang="ts">
import { RouterView } from 'vue-router'
import AvisosPantalla from '@/components/AvisosPantalla.vue'
import DialogoConfirmar from '@/components/DialogoConfirmar.vue'
</script>

<template>
  <RouterView />
  <AvisosPantalla />
  <DialogoConfirmar />
</template>
