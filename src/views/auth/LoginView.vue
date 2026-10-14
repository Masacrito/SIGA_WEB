<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PhWarningCircle } from '@phosphor-icons/vue'
import { useAuthStore } from '@/stores/auth'
import { erroresDeCampos, mensajeDeError } from '@/api/http'
import MarcaInstitucional from '@/components/MarcaInstitucional.vue'
import ListaAsistencia from '@/components/ListaAsistencia.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ username: '', password: '' })
const enviando = ref(false)
const error = ref(route.query.expirada ? 'Tu sesión expiró. Vuelve a iniciar sesión.' : '')
const errores = ref<Record<string, string>>({})

async function enviar() {
  error.value = ''
  errores.value = {}
  enviando.value = true
  try {
    await auth.iniciarSesion({ username: form.username.trim(), password: form.password })
    const destino = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    // Solo rutas internas: evita que un ?redirect= mande a otro sitio
    router.replace(destino.startsWith('/') && !destino.startsWith('//') ? destino : '/')
  } catch (e) {
    errores.value = erroresDeCampos(e)
    if (!Object.keys(errores.value).length) error.value = mensajeDeError(e)
    form.password = ''
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main class="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
    <!-- Panel de identidad: la lista de asistencia (solo escritorio) -->
    <section
      class="renglones relative hidden flex-col border-r border-linea bg-lienzo px-14 py-12 lg:flex"
    >
      <MarcaInstitucional />

      <div class="my-auto py-12">
        <h2
          class="max-w-[22ch] text-[2.5rem] leading-[1.08] font-semibold tracking-[-0.03em] text-marca-900"
        >
          La lista del salón, al día y en un solo lugar.
        </h2>
        <p class="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-tinta-600">
          Los docentes pasan lista desde el celular, aunque no haya señal. Orientación ve aquí quién
          está faltando y le da seguimiento a tiempo.
        </p>
        <ListaAsistencia class="mt-12" />
      </div>
    </section>

    <!-- Formulario -->
    <section class="flex flex-col px-5 py-8 sm:px-10">
      <MarcaInstitucional class="lg:hidden" />

      <div class="mx-auto my-auto w-full max-w-[22rem] py-10">
        <h1 class="text-2xl font-semibold tracking-[-0.02em] text-tinta-900">Iniciar sesión</h1>
        <p class="mt-1.5 text-sm text-tinta-500">Usa el usuario que te dio tu plantel.</p>

        <form class="mt-8 space-y-5" novalidate @submit.prevent="enviar">
          <div
            v-if="error"
            role="alert"
            class="flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
          >
            <PhWarningCircle :size="18" weight="fill" class="mt-px shrink-0 text-riesgo-alto" />
            <span>{{ error }}</span>
          </div>

          <div>
            <label for="username" class="etiqueta">Usuario</label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              required
              class="campo font-mono"
              :class="{ 'campo-error': errores.username }"
              :aria-invalid="!!errores.username"
              :aria-describedby="errores.username ? 'username-error' : undefined"
            />
            <p v-if="errores.username" id="username-error" class="mt-1.5 text-xs text-red-700">
              {{ errores.username }}
            </p>
          </div>

          <div>
            <label for="password" class="etiqueta">Contraseña</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              required
              class="campo"
              :class="{ 'campo-error': errores.password }"
              :aria-invalid="!!errores.password"
              :aria-describedby="errores.password ? 'password-error' : undefined"
            />
            <p v-if="errores.password" id="password-error" class="mt-1.5 text-xs text-red-700">
              {{ errores.password }}
            </p>
          </div>

          <button
            type="submit"
            class="btn-primario w-full"
            :disabled="enviando || !form.username || !form.password"
          >
            <span
              v-if="enviando"
              class="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden="true"
            />
            {{ enviando ? 'Entrando' : 'Entrar' }}
          </button>
        </form>

        <p class="mt-10 border-t border-linea pt-5 text-[13px] leading-relaxed text-tinta-500">
          ¿Olvidaste tu contraseña? El administrador del sistema puede restablecerla.
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Renglones de cuaderno muy tenues de fondo, como la hoja de la lista */
.renglones {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0 31px,
    rgb(18 36 65 / 0.035) 31px 32px
  );
}
</style>
