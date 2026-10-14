<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { PhMagnifyingGlass, PhPlus, PhTrash, PhUsersFour } from '@phosphor-icons/vue'
import {
  asignarGrupo,
  catalogo,
  crearUsuario,
  desactivarUsuario,
  editarUsuario,
  gruposDeOrientador,
  listarUsuarios,
  quitarGrupo,
  type Grupo,
  type PeriodoEscolar,
  type Usuario,
  type UsuarioInput,
} from '@/api/admin'
import { listarRoles, type Rol } from '@/api/rbac'
import { erroresDeCampos, mensajeDeError } from '@/api/http'
import { avisar } from '@/composables/avisos'
import { confirmar } from '@/composables/confirmar'
import { useAuthStore } from '@/stores/auth'
import VentanaFormulario from '@/components/VentanaFormulario.vue'
import CampoFormulario from '@/components/CampoFormulario.vue'

/** CU-10 y CU-18: cuentas, rol, estado y grupos de cada orientador. */
const auth = useAuthStore()

const usuarios = ref<Usuario[]>([])
const roles = ref<Rol[]>([])
const cargando = ref(true)
const errorCarga = ref('')

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    ;[usuarios.value, roles.value] = await Promise.all([listarUsuarios(), listarRoles()])
  } catch (e) {
    errorCarga.value = mensajeDeError(e)
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

// Filtros (en el navegador: son decenas de cuentas, no miles)
const buscar = ref('')
const filtroRol = ref('')
const verInactivos = ref(false)
const visibles = computed(() => {
  const t = buscar.value.trim().toLowerCase()
  return usuarios.value.filter(
    (u) =>
      (verInactivos.value || u.activo) &&
      (!filtroRol.value || u.rol === filtroRol.value) &&
      (!t || u.nombre.toLowerCase().includes(t) || u.username.toLowerCase().includes(t)),
  )
})
const inactivos = computed(() => usuarios.value.filter((u) => !u.activo).length)

/** Un administrador común no puede tocar a un súper admin (el backend responde 403). */
const editable = (u: Usuario) => !u.es_super_admin || !!auth.usuario?.es_super_admin
const esYo = (u: Usuario) => u.id === auth.usuario?.id

// Alta / edición
const formAbierto = ref(false)
const editando = ref<Usuario | null>(null)
const form = reactive({
  nombre: '',
  username: '',
  correo: '',
  rol_id: 0,
  numero_empleado: '',
  password: '',
})
const errores = ref<Record<string, string>>({})
const guardando = ref(false)
const rolDelForm = computed(() => roles.value.find((r) => r.id === form.rol_id)?.nombre)

function abrirForm(u: Usuario | null) {
  editando.value = u
  Object.assign(form, {
    nombre: u?.nombre ?? '',
    username: u?.username ?? '',
    correo: u?.correo ?? '',
    rol_id: u?.rol_id ?? roles.value.find((r) => r.nombre === 'docente')?.id ?? 0,
    numero_empleado: u?.numero_empleado ?? '',
    password: '',
  })
  errores.value = {}
  formAbierto.value = true
}

async function guardar() {
  guardando.value = true
  errores.value = {}
  const cuerpo: UsuarioInput = {
    nombre: form.nombre,
    username: form.username,
    rol_id: form.rol_id,
    correo: form.correo || undefined,
    // '' borra el número; undefined (otro rol) no lo toca
    numero_empleado: rolDelForm.value === 'docente' ? form.numero_empleado : undefined,
    password: form.password || undefined,
  }
  try {
    const u = editando.value
      ? await editarUsuario(editando.value.id, cuerpo)
      : await crearUsuario(cuerpo)
    reemplazar(u)
    formAbierto.value = false
    avisar(editando.value ? 'Usuario actualizado.' : `Usuario ${u.username} creado.`)
    if (esYo(u)) await auth.refrescarUsuario()
  } catch (e) {
    errores.value = erroresDeCampos(e)
    if (!Object.keys(errores.value).length) avisar(mensajeDeError(e), 'error')
  } finally {
    guardando.value = false
  }
}

function reemplazar(u: Usuario) {
  const i = usuarios.value.findIndex((x) => x.id === u.id)
  if (i >= 0) usuarios.value[i] = u
  else usuarios.value = [...usuarios.value, u].sort((a, b) => a.nombre.localeCompare(b.nombre))
}

async function cambiarEstado(u: Usuario) {
  if (u.activo) {
    const ok = await confirmar({
      titulo: `¿Desactivar a ${u.nombre}?`,
      mensaje: 'Ya no podrá iniciar sesión y se cierran sus sesiones abiertas, también en la app.',
      aceptar: 'Desactivar',
      peligro: true,
    })
    if (!ok) return
  }
  try {
    if (u.activo) {
      await desactivarUsuario(u.id)
      reemplazar({ ...u, activo: false })
      avisar(`${u.nombre} desactivado.`)
    } else {
      reemplazar(
        await editarUsuario(u.id, {
          nombre: u.nombre,
          username: u.username,
          rol_id: u.rol_id,
          activo: true,
        }),
      )
      avisar(`${u.nombre} reactivado.`)
    }
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  }
}

// Grupos del orientador (CU-18)
const gruposAbierto = ref(false)
const orientador = ref<Usuario | null>(null)
const asignados = ref<Grupo[]>([])
const todosGrupos = ref<Grupo[]>([])
const periodos = ref<PeriodoEscolar[]>([])
const grupoNuevo = ref<number | ''>('')
const cargandoGrupos = ref(false)

const etiquetaGrupo = (g: Grupo) => `${g.grado}° ${g.letra} · ${g.turno}`
const nombrePeriodo = (id: number) => periodos.value.find((p) => p.id === id)?.nombre ?? ''
const disponibles = computed(() => {
  const activo = periodos.value.find((p) => p.estado === 'activo')?.id
  return todosGrupos.value.filter(
    (g) => g.periodo_id === activo && !asignados.value.some((a) => a.id === g.id),
  )
})

async function abrirGrupos(u: Usuario) {
  orientador.value = u
  grupoNuevo.value = ''
  gruposAbierto.value = true
  cargandoGrupos.value = true
  try {
    ;[asignados.value, todosGrupos.value, periodos.value] = await Promise.all([
      gruposDeOrientador(u.id),
      catalogo.grupos(),
      catalogo.periodos(),
    ])
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
    gruposAbierto.value = false
  } finally {
    cargandoGrupos.value = false
  }
}

async function agregarGrupo() {
  if (!orientador.value || !grupoNuevo.value) return
  try {
    asignados.value = [
      ...asignados.value,
      await asignarGrupo(orientador.value.id, grupoNuevo.value),
    ]
    grupoNuevo.value = ''
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  }
}

async function retirarGrupo(g: Grupo) {
  if (!orientador.value) return
  try {
    await quitarGrupo(orientador.value.id, g.id)
    asignados.value = asignados.value.filter((a) => a.id !== g.id)
  } catch (e) {
    avisar(mensajeDeError(e), 'error')
  }
}
</script>

<template>
  <div>
    <p v-if="cargando" role="status" class="text-sm text-tinta-500">Cargando usuarios…</p>

    <div v-else-if="errorCarga" role="alert" class="max-w-xl border-t border-linea pt-6">
      <p class="text-[15px] text-tinta-800">{{ errorCarga }}</p>
      <button type="button" class="btn-secundario mt-4" @click="cargar">Reintentar</button>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-end gap-3">
        <div class="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <label for="buscar-usuario" class="sr-only">Buscar por nombre o usuario</label>
          <PhMagnifyingGlass
            :size="16"
            weight="bold"
            class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-tinta-400"
          />
          <input
            id="buscar-usuario"
            v-model="buscar"
            type="search"
            class="campo pl-9"
            placeholder="Buscar por nombre o usuario"
          />
        </div>
        <div>
          <label for="filtro-rol" class="sr-only">Filtrar por rol</label>
          <select id="filtro-rol" v-model="filtroRol" class="campo w-auto pr-8">
            <option value="">Todos los roles</option>
            <option v-for="r in roles" :key="r.id" :value="r.nombre">{{ r.nombre }}</option>
          </select>
        </div>
        <label class="flex h-10 cursor-pointer items-center gap-2 text-sm text-tinta-600">
          <input v-model="verInactivos" type="checkbox" class="size-4 accent-marca-800" />
          Ver inactivos <span class="tabular-nums text-tinta-400">({{ inactivos }})</span>
        </label>
        <button type="button" class="btn-primario ml-auto" @click="abrirForm(null)">
          <PhPlus :size="16" weight="bold" />
          Nuevo usuario
        </button>
      </div>

      <div class="mt-5 relative overflow-x-auto rounded-lg border border-linea bg-white">
        <table class="w-full min-w-[40rem] border-collapse text-sm">
          <caption class="sr-only">
            Usuarios del sistema
          </caption>
          <thead>
            <tr class="border-b border-linea text-left text-tinta-900">
              <th scope="col" class="px-4 py-3 font-semibold">Nombre</th>
              <th scope="col" class="px-4 py-3 font-semibold">Rol</th>
              <th scope="col" class="px-4 py-3 font-semibold">Estado</th>
              <th scope="col" class="px-4 py-3 text-right font-semibold">
                <span class="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-linea">
            <tr v-if="!visibles.length">
              <td colspan="4" class="px-4 py-8 text-center text-tinta-500">
                Ningún usuario coincide con el filtro.
              </td>
            </tr>
            <tr
              v-for="u in visibles"
              :key="u.id"
              class="transition-colors hover:bg-tinta-50/60"
              :class="{ 'text-tinta-500': !u.activo }"
            >
              <td class="px-4 py-3">
                <span
                  class="block font-medium text-tinta-900"
                  :class="{ 'text-tinta-500': !u.activo }"
                >
                  {{ u.nombre }}
                  <span v-if="esYo(u)" class="text-xs font-normal text-tinta-500">(tú)</span>
                </span>
                <span class="block font-mono text-xs text-tinta-500">
                  {{ u.username
                  }}<template v-if="u.numero_empleado"> · {{ u.numero_empleado }}</template>
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="first-letter:uppercase">{{ u.rol }}</span>
                <span v-if="u.es_super_admin" class="pildora ml-2 bg-marca-50 text-marca-800">
                  súper admin
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="pildora"
                  :class="
                    u.activo ? 'bg-riesgo-bajo/10 text-[#11743a]' : 'bg-tinta-100 text-tinta-600'
                  "
                >
                  {{ u.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-4 py-2 text-right whitespace-nowrap">
                <template v-if="editable(u)">
                  <button
                    v-if="u.rol === 'orientador' && u.activo"
                    type="button"
                    class="btn-secundario px-3 py-1.5"
                    @click="abrirGrupos(u)"
                  >
                    <PhUsersFour :size="16" weight="bold" />
                    Grupos
                  </button>
                  <button
                    type="button"
                    class="btn-secundario ml-2 px-3 py-1.5"
                    :aria-label="`Editar a ${u.nombre}`"
                    @click="abrirForm(u)"
                  >
                    Editar
                  </button>
                  <button
                    v-if="!esYo(u)"
                    type="button"
                    class="btn-secundario ml-2 px-3 py-1.5"
                    :aria-label="`${u.activo ? 'Desactivar' : 'Reactivar'} a ${u.nombre}`"
                    @click="cambiarEstado(u)"
                  >
                    {{ u.activo ? 'Desactivar' : 'Reactivar' }}
                  </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <VentanaFormulario
      v-model:abierto="formAbierto"
      :titulo="editando ? `Editar a ${editando.nombre}` : 'Nuevo usuario'"
      :descripcion="editando ? undefined : 'La persona entra con su usuario y contraseña.'"
      @enviar="guardar"
    >
      <CampoFormulario id="u-nombre" etiqueta="Nombre completo" :error="errores.nombre">
        <template #default="{ invalido, describe }">
          <input
            id="u-nombre"
            v-model="form.nombre"
            class="campo"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
            autocomplete="off"
            required
          />
        </template>
      </CampoFormulario>
      <div class="grid gap-4 sm:grid-cols-2">
        <CampoFormulario id="u-username" etiqueta="Usuario" :error="errores.username">
          <template #default="{ invalido, describe }">
            <input
              id="u-username"
              v-model.trim="form.username"
              class="campo font-mono"
              :class="{ 'campo-error': invalido }"
              :aria-invalid="invalido"
              :aria-describedby="describe"
              autocomplete="off"
              spellcheck="false"
              required
            />
          </template>
        </CampoFormulario>
        <CampoFormulario id="u-rol" etiqueta="Rol" :error="errores.rol_id">
          <template #default="{ invalido, describe }">
            <select
              id="u-rol"
              v-model="form.rol_id"
              class="campo"
              :class="{ 'campo-error': invalido }"
              :aria-invalid="invalido"
              :aria-describedby="describe"
            >
              <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.nombre }}</option>
            </select>
          </template>
        </CampoFormulario>
      </div>
      <CampoFormulario
        v-if="rolDelForm === 'docente'"
        id="u-empleado"
        etiqueta="Número de empleado (opcional)"
        :error="errores.numero_empleado"
      >
        <template #default="{ invalido, describe }">
          <input
            id="u-empleado"
            v-model.trim="form.numero_empleado"
            class="campo font-mono"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
          />
        </template>
      </CampoFormulario>
      <CampoFormulario id="u-correo" etiqueta="Correo (opcional)" :error="errores.correo">
        <template #default="{ invalido, describe }">
          <input
            id="u-correo"
            v-model.trim="form.correo"
            type="email"
            class="campo"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
          />
        </template>
      </CampoFormulario>
      <CampoFormulario
        id="u-password"
        :etiqueta="editando ? 'Nueva contraseña' : 'Contraseña'"
        :error="errores.password"
        :ayuda="editando ? 'Déjala vacía para no cambiarla.' : 'Mínimo 8 caracteres.'"
      >
        <template #default="{ invalido, describe }">
          <input
            id="u-password"
            v-model="form.password"
            type="password"
            class="campo"
            :class="{ 'campo-error': invalido }"
            :aria-invalid="invalido"
            :aria-describedby="describe"
            autocomplete="new-password"
            :required="!editando"
          />
        </template>
      </CampoFormulario>

      <template #acciones>
        <button type="button" class="btn-secundario" @click="formAbierto = false">Cancelar</button>
        <button type="submit" class="btn-primario" :disabled="guardando">
          {{ guardando ? 'Guardando' : editando ? 'Guardar cambios' : 'Crear usuario' }}
        </button>
      </template>
    </VentanaFormulario>

    <VentanaFormulario
      v-model:abierto="gruposAbierto"
      :titulo="`Grupos de ${orientador?.nombre ?? ''}`"
      descripcion="El orientador ve el semáforo, las observaciones y los avisos solo de estos grupos."
      @enviar="agregarGrupo"
    >
      <p v-if="cargandoGrupos" role="status" class="text-sm text-tinta-500">Cargando grupos…</p>
      <template v-else>
        <ul v-if="asignados.length" class="divide-y divide-linea rounded-lg border border-linea">
          <li
            v-for="g in asignados"
            :key="g.id"
            class="flex items-center justify-between px-4 py-2"
          >
            <span>
              {{ etiquetaGrupo(g) }}
              <span class="text-xs text-tinta-500">· {{ nombrePeriodo(g.periodo_id) }}</span>
            </span>
            <button
              type="button"
              class="grid size-9 place-items-center rounded-md text-tinta-500 hover:bg-tinta-50 hover:text-riesgo-alto"
              :aria-label="`Quitar ${etiquetaGrupo(g)}`"
              @click="retirarGrupo(g)"
            >
              <PhTrash :size="16" weight="bold" />
            </button>
          </li>
        </ul>
        <p v-else class="text-sm text-tinta-500">Todavía no tiene grupos asignados.</p>

        <div class="flex items-end gap-2">
          <div class="flex-1">
            <label for="grupo-nuevo" class="etiqueta">Asignar grupo del periodo activo</label>
            <select id="grupo-nuevo" v-model="grupoNuevo" class="campo">
              <option value="" disabled>Elige un grupo</option>
              <option v-for="g in disponibles" :key="g.id" :value="g.id">
                {{ etiquetaGrupo(g) }}
              </option>
            </select>
          </div>
          <button type="submit" class="btn-primario" :disabled="!grupoNuevo">Asignar</button>
        </div>
      </template>
    </VentanaFormulario>
  </div>
</template>
