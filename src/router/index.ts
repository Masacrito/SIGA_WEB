import { markRaw, type Component } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import {
  PhBell,
  PhCalendarCheck,
  PhChartPieSlice,
  PhChatCircleText,
  PhFileText,
  PhHouse,
  PhIdentificationCard,
  PhShieldCheck,
  PhSlidersHorizontal,
  PhStack,
  PhUploadSimple,
  PhUsers,
  PhUsersThree,
} from '@phosphor-icons/vue'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'
import { PRODUCTO } from '@/config/institucion'

declare module 'vue-router' {
  interface RouteMeta {
    /** Ruta accesible sin sesión (login) */
    publica?: boolean
    /** Permiso(s) de `permisos.nombre` requeridos; con uno basta */
    permiso?: string | string[]
    /** Texto en el menú y en el encabezado */
    titulo?: string
    /** Una línea que explica para qué sirve la pantalla (Inicio y encabezado) */
    descripcion?: string
    /** Ícono del menú (Phosphor; el peso se fija donde se pinta) */
    icono?: Component
    /** Agrupa el menú lateral */
    seccion?: 'General' | 'Seguimiento' | 'Administración'
    /** Bloque del plan en que se programa (solo para las pantallas pendientes) */
    bloque?: number
  }
}

const Pendiente = () => import('@/views/PendienteView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { publica: true, titulo: 'Iniciar sesión' },
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'inicio',
          component: () => import('@/views/InicioView.vue'),
          meta: {
            titulo: 'Inicio',
            icono: markRaw(PhHouse),
            seccion: 'General',
          },
        },

        // Seguimiento (orientador)
        {
          path: 'semaforo',
          name: 'semaforo',
          component: Pendiente,
          meta: {
            titulo: 'Semáforo de riesgo',
            icono: markRaw(PhChartPieSlice),
            descripcion: 'Alumnos por nivel de inasistencia en tus grupos',
            seccion: 'Seguimiento',
            permiso: 'ver_semaforo_riesgo',
            bloque: 6,
          },
        },
        {
          path: 'alumnos',
          name: 'alumnos',
          component: Pendiente,
          meta: {
            titulo: 'Alumnos',
            icono: markRaw(PhIdentificationCard),
            descripcion: 'Busca a un alumno y abre su expediente',
            seccion: 'Seguimiento',
            permiso: 'consultar_alumnos',
            bloque: 5,
          },
        },
        {
          path: 'asistencias',
          name: 'asistencias',
          component: Pendiente,
          meta: {
            titulo: 'Historial de asistencias',
            icono: markRaw(PhCalendarCheck),
            descripcion: 'Consulta asistencias por grupo, materia o fecha',
            seccion: 'Seguimiento',
            permiso: 'consultar_asistencias',
            bloque: 5,
          },
        },
        {
          path: 'observaciones',
          name: 'observaciones',
          component: Pendiente,
          meta: {
            titulo: 'Observaciones',
            icono: markRaw(PhChatCircleText),
            descripcion: 'Bitácora de seguimiento tutorial',
            seccion: 'Seguimiento',
            permiso: 'registrar_observacion',
            bloque: 6,
          },
        },
        {
          path: 'notificaciones',
          name: 'notificaciones',
          component: Pendiente,
          meta: {
            titulo: 'Notificaciones a tutores',
            icono: markRaw(PhBell),
            descripcion: 'Avisos por SMS o correo a padres y tutores',
            seccion: 'Seguimiento',
            permiso: 'notificar_tutor',
            bloque: 6,
          },
        },
        {
          path: 'reportes',
          name: 'reportes',
          component: Pendiente,
          meta: {
            titulo: 'Reportes',
            icono: markRaw(PhFileText),
            descripcion: 'Reportes de asistencia por grupo y periodo',
            seccion: 'Seguimiento',
            permiso: 'generar_reportes',
            bloque: 6,
          },
        },

        // Administración
        {
          path: 'admin/usuarios',
          name: 'usuarios',
          component: () => import('@/views/admin/UsuariosView.vue'),
          meta: {
            titulo: 'Usuarios',
            icono: markRaw(PhUsers),
            descripcion: 'Cuentas, roles y estado de acceso',
            seccion: 'Administración',
            permiso: 'gestionar_usuarios',
          },
        },
        {
          path: 'admin/roles',
          name: 'roles',
          component: () => import('@/views/admin/RolesView.vue'),
          meta: {
            titulo: 'Roles y permisos',
            icono: markRaw(PhShieldCheck),
            descripcion: 'Qué puede hacer cada rol en el sistema',
            seccion: 'Administración',
            permiso: 'gestionar_usuarios',
          },
        },
        {
          path: 'admin/catalogos',
          name: 'catalogos',
          component: () => import('@/views/admin/CatalogosView.vue'),
          meta: {
            titulo: 'Catálogos',
            icono: markRaw(PhStack),
            descripcion: 'Periodos, grados, grupos y materias',
            seccion: 'Administración',
            permiso: 'gestionar_catalogos',
          },
        },
        {
          path: 'admin/padres-tutores',
          name: 'padres-tutores',
          component: () => import('@/views/admin/PadresTutoresView.vue'),
          meta: {
            titulo: 'Padres y tutores',
            icono: markRaw(PhUsersThree),
            descripcion: 'Contactos de tutores y su vínculo con alumnos',
            seccion: 'Administración',
            permiso: 'gestionar_catalogos',
          },
        },
        {
          path: 'admin/importaciones',
          name: 'importaciones',
          component: Pendiente,
          meta: {
            titulo: 'Importaciones',
            icono: markRaw(PhUploadSimple),
            descripcion: 'Carga masiva de alumnos, docentes y calificaciones',
            seccion: 'Administración',
            permiso: 'importar_datos',
            bloque: 4,
          },
        },
        {
          path: 'admin/configuracion',
          name: 'configuracion',
          component: () => import('@/views/admin/ConfiguracionView.vue'),
          meta: {
            titulo: 'Configuración',
            icono: markRaw(PhSlidersHorizontal),
            descripcion: 'Umbrales del semáforo y parámetros generales',
            seccion: 'Administración',
            permiso: 'gestionar_configuracion',
          },
        },

        {
          path: 'sin-acceso',
          name: 'sin-acceso',
          component: () => import('@/views/SinAccesoView.vue'),
          meta: { titulo: 'Sin acceso' },
        },
      ],
    },
    {
      path: '/:ruta(.*)*',
      name: 'no-encontrado',
      component: () => import('@/views/NoEncontradoView.vue'),
      meta: { publica: true, titulo: 'No encontrado' },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.recuperarSesion()

  if (to.meta.publica) {
    // Ya con sesión no tiene caso volver a ver el login
    if (to.name === 'login' && auth.autenticado) return { name: 'inicio' }
    return true
  }

  if (!auth.autenticado) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }

  if (!auth.puede(to.meta.permiso)) return { name: 'sin-acceso' }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.titulo ? `${to.meta.titulo} – ${PRODUCTO.nombre}` : PRODUCTO.nombre
})

export default router
