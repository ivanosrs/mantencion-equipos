// Cuentas de servicio del equipo: los unicos administradores autorizados a
// ver y manipular usuarios ocultos en /dashboard/usuarios.
//
// Vive aca y no en la base a proposito. Crear un admin nuevo es una tarea
// habitual de la app (POST /api/users), pero sumar una cuenta a esta lista es
// deliberado: queda en el historial de git, con revision humana.
//
// OJO: esto es una restriccion de aplicacion, no de seguridad. El codigo corre
// en el servidor y las sesiones de Supabase firman un JWT con el email del
// usuario, asi que un atacante con el service role key o acceso al codigo
// podria leer la lista igual. Para ocultar cuentas de verdad haria falta RLS
// con una tabla de permisos, no un array en TS.
export const SERVICE_ADMIN_EMAILS = [
  'diegop.salas@gmail.com',
  'ivanvidalsepulveda@gmail.com',
] as const;

export function isServiceAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return (SERVICE_ADMIN_EMAILS as readonly string[]).includes(email.toLowerCase());
}
