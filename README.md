# Sistema de Gestión de Mantenciones de Equipos

Sistema web MVP responsive (mobile-first estilo iOS 2026) para la gestión y seguimiento de mantenciones de equipos mediante códigos QR.

## 🎯 Características Principales

### Para Administradores
- ✅ CRUD completo de equipos
- ✅ Generación automática de códigos QR imprimibles
- ✅ Gestión de usuarios (creación de técnicos y admins)
- ✅ Visualización de historial completo de Órdenes de Trabajo

### Para Técnicos
- ✅ Escaneo de QR con cámara del celular
- ✅ Registro de Órdenes de Trabajo en terreno
- ✅ Captura de firma digital del cliente
- ✅ Upload de fotos/PDF de la orden física
- ✅ Checklist de acciones realizadas
- ✅ Registro de repuestos/insumos utilizados

### Para Clientes (Acceso Público)
- ✅ Escaneo de QR sin login
- ✅ Vista pública con información básica del equipo
- ✅ Fecha de última mantención
- ✅ Estado actual del equipo

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **QR**: html5-qrcode (lectura), qrcode (generación)
- **Firma Digital**: Canvas HTML5
- **Deploy**: Vercel

## 📦 Instalación Local

### Requisitos
- Node.js 18+ 
- npm o yarn

### Pasos

1. **Clonar el repositorio**
```bash
git clone <tu-repo-url>
cd mantencion-equipos
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Copia `.env.local` y reemplaza con tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

4. **Ejecutar servidor de desarrollo**
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🚢 Despliegue en Producción

**Ver [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) para instrucciones detalladas paso a paso.**

Resumen:
1. Configurar Supabase (crear proyecto, ejecutar migraciones, buckets)
2. Crear repositorio en GitHub
3. Conectar con Vercel
4. Agregar variables de entorno en Vercel
5. Hacer push y Vercel redeploy automáticamente

## 📁 Estructura del Proyecto

```
app/
├── dashboard/              # Rutas protegidas (requieren login)
│   ├── equipments/        # CRUD de equipos
│   ├── work-orders/       # Registro de órdenes de trabajo
│   ├── scan/              # Escaneo de QR
│   ├── users/             # Gestión de usuarios (admin)
│   └── layout.tsx         # Layout con sidebar
├── equipments/            # Rutas públicas
│   └── [id]/page.tsx     # Ficha pública del equipo (sin login)
├── api/
│   └── users/route.ts    # Crear usuarios (admin only)
├── login/page.tsx        # Página de login
└── layout.tsx            # Layout raíz

components/
├── qr/                   # Componentes QR
│   ├── QrScanner.tsx    # Lector de QR
│   └── QrPrintLabel.tsx # Generador e impresor de QR
├── work-orders/         # Componentes de OT
│   └── SignaturePad.tsx # Canvas para firma digital
└── ui/                  # Componentes shadcn/ui

lib/
├── supabase/           # Clientes de Supabase
│   ├── client.ts      # Browser client
│   ├── server.ts      # Server client (cookies)
│   ├── admin.ts       # Admin/Service role client
│   └── middleware.ts  # Protección de rutas
├── auth.ts            # Funciones de autenticación
├── types.ts           # Tipos TypeScript de la BD
└── utils.ts           # Utilidades (cn, etc)

supabase/
└── migrations/
    └── 0001_init.sql  # Schema de BD
```

## 🔐 Seguridad

- **RLS (Row Level Security)**: Cada tabla tiene políticas de acceso
- **Auth**: Supabase Auth con email/password
- **Roles**: Admin y Technician
- **Storage Privado**: Firmas y adjuntos en buckets privados, acceso vía URLs firmadas
- **API Protegida**: Rutas admin protegidas con verificación de roles server-side

## 📱 Funcionalidades de Móvil

- ✅ Diseño mobile-first responsive
- ✅ Acceso a cámara para escaneo de QR
- ✅ Canvas táctil para firma digital
- ✅ Upload de fotos desde galería/cámara
- ✅ Optimizado para navegadores móviles

## 🛠️ Desarrollo

### Comandos Disponibles

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build para producción
npm run lint      # ESLint
npm run start     # Iniciar servidor producción
```

### Estructura de Componentes

Los componentes están organizados por dominio:
- `components/qr/` - QR scanning y printing
- `components/work-orders/` - Formularios y lógica de OT
- `components/ui/` - Componentes base (Button, Input, Card, etc)

### Agregar Nuevas Rutas

1. Crear folder con estructura `app/path/page.tsx`
2. Si es protegida (requiere auth), ponerla dentro de `/dashboard`
3. El middleware redirige automáticamente a `/login` si no hay sesión

## 📖 Documentación Adicional

- [Next.js](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- [Vercel](https://vercel.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Contribuir

Para cambios, crear una rama y hacer PR.

## 📝 Licencia

Proyecto privado.

---

**Versión**: 1.0  
**Última actualización**: 2026-08-27  
**Autor**: Sistema de Gestión de Mantenciones
