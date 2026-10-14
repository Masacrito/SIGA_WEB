import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { registrarAlExpirarSesion } from './api/http'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 401 desde cualquier llamada → se limpia la sesión y se manda al login,
// recordando a dónde iba el usuario.
registrarAlExpirarSesion(() => {
  useAuthStore().sesionExpirada()
  const actual = router.currentRoute.value
  if (!actual.meta.publica) {
    router.replace({ name: 'login', query: { redirect: actual.fullPath, expirada: '1' } })
  }
})

// Se monta cuando el router ya resolvió la primera ruta (y la sesión con /me):
// así no parpadea el login antes de saber si hay sesión.
router.isReady().then(() => app.mount('#app'))
