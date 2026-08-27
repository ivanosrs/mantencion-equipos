# Guía de Despliegue - Sistema de Gestión de Mantenciones

Este documento te guiará paso a paso para desplegar el sistema en Vercel con Supabase como backend.

## Fase 1: Configurar Supabase

### 1.1 Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) e inicia sesión con tu cuenta GitHub
2. Haz clic en "New Project"
3. Configura:
   - **Name**: `mantencion-equipos` (o el nombre que prefieras)
   - **Database Password**: Crea una contraseña segura
   - **Region**: Selecciona la región más cercana a ti (ej: `sa-east-1` para Latinoamérica)
4. Espera a que se cree el proyecto (~2 minutos)

### 1.2 Obtener Claves de API

Una vez creado el proyecto:

1. En el panel izquierdo, ve a **Settings** → **API**
2. Verás tres valores que necesitarás:
   - **Project URL** (copiar tal cual, incluye `https://`)
   - **anon public** (copiar la clave completa)
   - **service_role** (copiar la clave completa - **MANTENER PRIVADA**)

**Guarda estos valores en un lugar seguro**, los usaremos en los siguientes pasos.

### 1.3 Ejecutar Migración SQL

1. Ve a **SQL Editor** en el panel izquierdo
2. Haz clic en "+ New Query"
3. Copia el contenido completo de `supabase/migrations/0001_init.sql`
4. Pégalo en el editor
5. Haz clic en "Run" (botón azul en la esquina inferior derecha)
6. Deberías ver mensajes de éxito

### 1.4 Crear Buckets de Almacenamiento

1. Ve a **Storage** en el panel izquierdo
2. Haz clic en "+ New Bucket"
3. **Primer bucket:**
   - Name: `signatures`
   - Make it public: **NO** (deja sin marcar)
   - Haz clic en "Create bucket"

4. **Segundo bucket:**
   - Repite el proceso con Name: `attachments`
   - Make it public: **NO**

### 1.5 Crear Primer Usuario Admin

Necesitas crear manualmente el primer usuario admin (después podrás crear otros desde la aplicación):

1. Ve a **Authentication** → **Users** en el panel izquierdo
2. Haz clic en "Add user"
3. Completa:
   - **Email**: Tu email (ej: `admin@empresa.com`)
   - **Password**: Una contraseña segura
   - Haz clic en "Send invite email" (sin marcar)
4. Una vez creado, en la página de usuarios verás el usuario. Haz clic en él para ver su UUID

5. Ve al **SQL Editor** y ejecuta esta query (reemplaza `UUID_DEL_USUARIO` con el UUID del usuario creado):

```sql
INSERT INTO profiles (id, full_name, role, phone, created_at)
VALUES (
  'UUID_DEL_USUARIO',
  'Administrador',
  'admin',
  '',
  now()
);
```

**Ejemplo:**
```sql
INSERT INTO profiles (id, full_name, role, phone, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Administrador',
  'admin',
  '',
  now()
);
```

## Fase 2: Preparar el Código para Vercel

### 2.1 Crear Repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión
2. Haz clic en "+" en la esquina superior derecha → "New repository"
3. Configura:
   - **Repository name**: `mantencion-equipos`
   - **Public** o **Private** (recomendado: Private)
   - **Initialize with README**: Sin marcar
4. Haz clic en "Create repository"

### 2.2 Hacer Push del Código

En la terminal, dentro de la carpeta del proyecto:

```bash
git add .
git commit -m "Initial commit: Sistema de gestión de mantenciones"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/mantencion-equipos.git
git push -u origin main
```

Reemplaza `TU_USUARIO` con tu usuario de GitHub.

## Fase 3: Desplegar en Vercel

### 3.1 Conectar Vercel con GitHub

1. Ve a [vercel.com](https://vercel.com) e inicia sesión con GitHub
2. Haz clic en "Add New..." → "Project"
3. Busca el repositorio `mantencion-equipos` y haz clic en "Import"

### 3.2 Configurar Variables de Entorno

En la página de importación de Vercel, antes de hacer clic en "Deploy":

1. Expande la sección **Environment Variables**
2. Agrega las siguientes variables (usa los valores que obtuviste en la Fase 1):

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tu-proyecto.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Tu service role key de Supabase |

**Importante:** Las variables que comienzan con `NEXT_PUBLIC_` son públicas (se envían al navegador). La `SUPABASE_SERVICE_ROLE_KEY` es privada y solo se usa en el servidor.

### 3.3 Deploy

1. Haz clic en el botón "Deploy"
2. Espera a que termine el despliegue (~3-5 minutos)
3. Verás una URL como: `https://mantencion-equipos-xxxxxx.vercel.app`

## Fase 4: Verificar el Despliegue

1. Abre la URL de tu proyecto en Vercel
2. Deberías ver la página de login
3. Inicia sesión con el usuario admin que creaste en el Supabase:
   - Email: El que usaste en la Fase 1.5
   - Contraseña: La que configuraste

4. Una vez dentro, deberías ver:
   - Panel de "Equipos" (vacío porque no has creado ninguno)
   - Menú lateral con opciones: Equipos, Escanear QR, Usuarios (solo admin)

## Fase 5: Crear Primer Equipo de Prueba

1. Haz clic en "Nuevo Equipo" (botón azul)
2. Completa el formulario con datos de prueba:
   - **Tipo**: Centrífuga
   - **Marca**: Hettich
   - **Modelo**: Centri F064
   - **Número de Serie**: 0046561-05
   - **Ubicación**: Laboratorio Clínico
3. Haz clic en "Crear Equipo"
4. Verás el equipo en la lista. Haz clic en él.
5. En la vista de detalle, haz clic en "Imprimir QR"
6. Prueba escanear el QR (o copia la URL manualmente en la barra de direcciones)

## Fase 6: Próximas Acciones

### Crear Más Equipos
1. Vuelve al dashboard y haz clic en "Nuevo Equipo"
2. Repite para cada equipo de tu parque

### Crear Usuarios Técnicos
1. Ve a la sección **Usuarios** (solo visible para admins)
2. Haz clic en "Nuevo Usuario"
3. Completa el formulario con:
   - Email del técnico
   - Contraseña temporal
   - Nombre completo
   - Teléfono (opcional)
   - Rol: Técnico
4. El técnico puede iniciar sesión y:
   - Escanear QR de equipos
   - Registrar Órdenes de Trabajo
   - Ver historial de mantenciones

### Registrar Órdenes de Trabajo
Desde la vista de detalle de un equipo:
1. Haz clic en "Nueva OT"
2. Completa:
   - Número de OT
   - Fecha de intervención
   - Datos del cliente
   - Tipo de servicio
   - Acciones ejecutadas (checkboxes)
   - Repuestos utilizados
   - Firma digital del cliente
   - Foto/PDF de la OT física (opcional)
3. Haz clic en "Guardar Orden de Trabajo"

## Troubleshooting

### Error: "No se puede acceder a la cámara"
- Comprueba que usas HTTPS (Vercel usa HTTPS automáticamente)
- Verifica permisos de cámara en el navegador (settings del navegador)
- En dispositivos móviles, asegúrate de usar la app del navegador, no una web-view

### Error: "Credenciales de Supabase no válidas"
- Verifica que las variables de entorno en Vercel son exactas (sin espacios extra)
- Comprueba que usaste el correcto:
  - `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto (incluye `https://`)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anon (comienza con `eyJ...`)
  - `SUPABASE_SERVICE_ROLE_KEY`: Clave service role (más larga)

### Error: "Usuario no encontrado" al iniciar sesión
- Comprueba que creaste el usuario en Supabase Authentication
- Verifica que insertaste el perfil en la tabla `profiles`

### Los datos no se guardan
- Abre la consola del navegador (F12) y busca errores de red
- Ve a Supabase → **SQL Editor** → Ejecuta:
  ```sql
  SELECT * FROM equipments LIMIT 10;
  ```
  Esto te dirá si los datos llegan a la BD.

## Mantenimiento y Actualizaciones

### Hacer cambios en el código
1. Edita los archivos en tu computadora
2. Haz commit y push:
   ```bash
   git add .
   git commit -m "Descripción del cambio"
   git push
   ```
3. Vercel se redeploy automáticamente (~2 minutos)

### Actualizar la BD (migraciones)
1. Ve a Supabase → **SQL Editor**
2. Escribe la query de cambios
3. Haz clic en "Run"

## Endpoints Disponibles

### Públicas
- `GET /equipments/[id]` - Ficha pública del equipo (sin login)

### Privadas (requieren login)
- `GET /dashboard` - Listado de equipos con filtros
- `GET /dashboard/equipments/[id]` - Detalle completo del equipo
- `POST /dashboard/equipments/new` - Crear equipo (admin)
- `GET /dashboard/scan` - Escanear QR
- `POST /dashboard/work-orders/new` - Crear OT
- `GET /dashboard/users` - Gestión de usuarios (admin)
- `POST /api/users` - Crear usuario (admin)

## Documentación Adicional

- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Vercel**: https://vercel.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

## Soporte

Si tienes problemas:
1. Revisa el archivo de logs de Vercel: **Deployments** → Última versión → **Logs**
2. Revisa los logs de Supabase: **Database** → **Inspector** o **SQL Editor**
3. Abre la consola del navegador (F12) en la aplicación

---

**Proyecto completado**: Sistema de Gestión de Mantenciones de Equipos  
**Versión**: 1.0  
**Última actualización**: 2026-08-27
