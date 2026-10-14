/**
 * Alias legibles sobre los tipos generados de openapi.yaml.
 * schema.d.ts NO se edita a mano: se regenera con `npm run gen:api`.
 */
import type { components, paths } from './schema'

export type Esquemas = components['schemas']
export type UsuarioSesion = Esquemas['UsuarioSesion']

export type LoginBody = NonNullable<
  paths['/login']['post']['requestBody']
>['content']['application/json']
export type LoginRespuesta =
  paths['/login']['post']['responses']['200']['content']['application/json']

/** Forma de error de Laravel ({ message } / { message, errors }). */
export interface ErrorApi {
  message: string
  errors?: Record<string, string[]>
}
