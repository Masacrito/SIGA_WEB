<script setup lang="ts">
/**
 * Lista de asistencia ilustrada para el panel del login: dos semanas de clase
 * de un grupo, que se "pasan" una sola vez al cargar (columna por columna,
 * como lo hace el docente). Es el único momento animado de la interfaz.
 * Los datos son fijos y no representan alumnos reales.
 */
type Marca = 'p' | 'f' | 'r'

const DIAS = ['L', 'M', 'M', 'J', 'V', 'L', 'M', 'M', 'J', 'V']

// 7 alumnos x 10 días. p = presente, f = falta, r = retardo
const FILAS: { ancho: number; marcas: Marca[] }[] = [
  { ancho: 72, marcas: 'pppppppppp'.split('') as Marca[] },
  { ancho: 58, marcas: 'pppprppppp'.split('') as Marca[] },
  { ancho: 80, marcas: 'pfpppppfpp'.split('') as Marca[] },
  { ancho: 64, marcas: 'pppppppppp'.split('') as Marca[] },
  { ancho: 70, marcas: 'ppfpprfffp'.split('') as Marca[] },
  { ancho: 54, marcas: 'pppprppppp'.split('') as Marca[] },
  { ancho: 76, marcas: 'pppppppppp'.split('') as Marca[] },
]
</script>

<template>
  <figure class="w-full max-w-[30rem]" aria-hidden="true">
    <div
      class="grid items-center gap-x-[6px] gap-y-[10px]"
      style="grid-template-columns: minmax(0, 1fr) repeat(5, 1.35rem) 0.6rem repeat(5, 1.35rem)"
    >
      <span />
      <template v-for="(d, i) in DIAS" :key="'d' + i">
        <span v-if="i === 5" />
        <span class="text-center font-mono text-[11px] text-tinta-500">{{ d }}</span>
      </template>

      <template v-for="(fila, r) in FILAS" :key="r">
        <span class="h-2 rounded-full bg-tinta-200" :style="{ width: fila.ancho + '%' }" />
        <template v-for="(m, c) in fila.marcas" :key="c">
          <span v-if="c === 5" />
          <span
            class="casilla aspect-square rounded-[5px]"
            :class="[
              {
                'bg-marca-800': m === 'p',
                'border-[1.5px] border-riesgo-alto/70 bg-white': m === 'f',
                'bg-linear-to-t from-amber-400 from-50% to-white to-50% ring-1 ring-amber-400 ring-inset':
                  m === 'r',
              },
            ]"
            :style="{ '--c': c, '--r': r }"
          />
        </template>
      </template>
    </div>

    <figcaption class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-tinta-500">
      <span class="inline-flex items-center gap-2"
        ><span class="size-3 rounded-[3px] bg-marca-800" />Asistió</span
      >
      <span class="inline-flex items-center gap-2"
        ><span
          class="size-3 rounded-[3px] bg-linear-to-t from-amber-400 from-50% to-white to-50% ring-1 ring-amber-400 ring-inset"
        />Retardo</span
      >
      <span class="inline-flex items-center gap-2"
        ><span
          class="size-3 rounded-[3px] border-[1.5px] border-riesgo-alto/70 bg-white"
        />Falta</span
      >
    </figcaption>
  </figure>
</template>

<style scoped>
/* Se pasa lista columna por columna, de arriba hacia abajo, una sola vez */
.casilla {
  animation: marcar 420ms var(--ease-salida) both;
  animation-delay: calc(300ms + var(--c) * 110ms + var(--r) * 35ms);
}

@keyframes marcar {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .casilla {
    animation: none;
  }
}
</style>
