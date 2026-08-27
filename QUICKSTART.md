# Quick Start Guide - Primeros 30 Minutos

## 🎯 Tu situación actual

El código del sistema está 100% listo en: `c:\Users\Ivan\Desktop\mantencion-equipos`

✅ Código compilado exitosamente  
✅ TypeScript strict mode pasando  
✅ ESLint configurado  
✅ Git inicializado con 3 commits  
✅ Todas las funcionalidades implementadas  

## ⏱️ Lo que falta (3 pasos principales)

### Paso 1: Subir código a GitHub (5 minutos)

1. Ve a [github.com](https://github.com)
2. Crea un nuevo repositorio:
   - Nombre: `mantencion-equipos`
   - Descripción: "Sistema de gestión de mantenciones de equipos"
   - Privado
3. Copia el comando que GitHub te muestra (algo como):
   ```bash
   git remote add origin https://github.com/TU_USUARIO/mantencion-equipos.git
   git branch -M main
   git push -u origin main
   ```
4. Pega en terminal en la carpeta del proyecto

**Estado**: El código está en GitHub ✓

### Paso 2: Configurar Supabase (10 minutos)

1. Ve a [supabase.com](https://supabase.com)
2. Crea nuevo proyecto
3. Copia tu **Project URL** (formato: `https://xxxxx.supabase.co`)
4. Copia tu **anon key** (empieza con `eyJ...`)
5. Copia tu **service_role key** (aún más larga)
6. Ve a **SQL Editor** y ejecuta el contenido de: `supabase/migrations/0001_init.sql`
7. Crea buckets: `signatures` y `attachments` (ambos privados)
8. Crea un usuario admin en **Authentication**

**Estado**: Base de datos lista con schema, buckets y primer usuario ✓

### Paso 3: Desplegar en Vercel (10 minutos)

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en "Add New" → "Project"
3. Busca tu repo `mantencion-equipos`
4. En Environment Variables, agrega:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   SUPABASE_SERVICE_ROLE_KEY = eyJ...
   ```
5. Haz clic en "Deploy"
6. Espera ~3 minutos

**Estado**: App en vivo en Vercel ✓

## 📖 Documentación

Tienes 3 documentos principales:

1. **README.md** - Qué es el proyecto, cómo instalar localmente
2. **DEPLOYMENT_GUIDE.md** - Guía DETALLADA paso a paso (6 fases)
3. **PROJECT_SUMMARY.md** - Checklist de todas las funcionalidades

## 🧪 Probar Localmente (Opcional)

Si quieres probar en tu computadora ANTES de desplegar:

```bash
cd c:\Users\Ivan\Desktop\mantencion-equipos

# 1. Actualizar .env.local con tus credenciales Supabase
# (edita el archivo y reemplaza los valores placeholder)

# 2. Instalar dependencias (ya está hecho, pero por si acaso)
npm install

# 3. Ejecutar servidor de desarrollo
npm run dev

# 4. Abre http://localhost:3000 en tu navegador
```

Luego inicia sesión con el usuario admin que creaste en Supabase.

## ✨ Qué puedes hacer una vez deployado

### Immediatamente (sin configuración extra)
- ✅ Login con email/password
- ✅ Ver dashboard de equipos
- ✅ Crear equipos (admin)
- ✅ Generar e imprimir QR
- ✅ Escanear QR (desde celular con cámara)
- ✅ Registrar Órdenes de Trabajo
- ✅ Capturar firma del cliente
- ✅ Upload de fotos/PDFs
- ✅ Ver ficha pública de equipo (sin login)

### Próximas mejoras (opcionales)
- 📊 Reportes y dashboards
- 📧 Notificaciones de próxima mantención
- 🌙 Dark mode
- 🌍 Multiidioma
- 💳 Pagos integrados (Stripe)

## 🚨 Si algo no funciona

### "No se puede acceder a la cámara"
- Usa HTTPS (Vercel usa HTTPS automáticamente)
- Verifica permisos de cámara en el navegador

### "Credenciales de Supabase no válidas"
- Verifica que copiaste exactamente las claves
- Sin espacios en blanco extras
- NEXT_PUBLIC_SUPABASE_URL debe incluir `https://`

### "Usuario no encontrado al iniciar sesión"
- ¿Creaste el usuario en Supabase Auth?
- ¿Ejecutaste el INSERT en la tabla `profiles`?

## 📋 Checklist de Despliegue

- [ ] Crear repositorio en GitHub
- [ ] Hacer git push del código
- [ ] Crear proyecto en Supabase
- [ ] Ejecutar script SQL `0001_init.sql`
- [ ] Crear buckets `signatures` y `attachments`
- [ ] Crear usuario admin en Supabase
- [ ] Conectar Vercel a GitHub
- [ ] Agregar variables de entorno en Vercel
- [ ] Deploy a Vercel
- [ ] Probar en celular (escanear QR)
- [ ] Probar firma digital
- [ ] Probar upload de archivo

## 🎓 Estructura de Directorios (Para Referencia)

```
c:\Users\Ivan\Desktop\mantencion-equipos\
├── app/                 # 10 páginas del sistema
├── components/          # 15+ componentes React
├── lib/                 # Lógica reutilizable
├── supabase/           # Script SQL
├── .env.local          # Variables desarrollo
├── package.json        # Dependencias (452 paquetes)
├── README.md           # Documentación
├── DEPLOYMENT_GUIDE.md # Guía paso a paso
└── PROJECT_SUMMARY.md  # Checklist de funcionalidades
```

## 🔗 Links Útiles

- Supabase Dashboard: https://supabase.com/dashboard
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub: https://github.com
- Next.js Docs: https://nextjs.org/docs
- Tailwind Docs: https://tailwindcss.com/docs

## ✅ Preguntas Frecuentes

**P: ¿Necesito instalar Supabase localmente?**  
R: No, usamos Supabase en la nube. Solo necesitas crear una cuenta.

**P: ¿Puedo usar mi propio dominio?**  
R: Sí, en Vercel puedes agregar dominios custom. Va en Project Settings → Domains.

**P: ¿Cómo agrego más técnicos?**  
R: Una vez desplegado, ve a Dashboard → Usuarios → Nuevo Usuario (solo admin).

**P: ¿Los datos se pierden si apago Vercel?**  
R: No, los datos están en Supabase (BD en la nube). Vercel solo ejecuta el código.

**P: ¿Puedo modificar el código después de desplegar?**  
R: Sí, edita, haz git commit/push, y Vercel redeploy automáticamente.

**P: ¿Es seguro subir a GitHub?**  
R: Sí, tu repositorio es privado. Las claves sensibles van en variables de entorno de Vercel, no en el código.

## 🎉 Una Vez Deployado

1. Tu app estará en: `https://mantencion-equipos-xxxxx.vercel.app`
2. Usa ese link desde cualquier dispositivo
3. Usa desde celular para probar QR y firma
4. El admin puedes crear nuevos técnicos en la app

---

## 🆘 Soporte

Si tienes dudas en cualquier paso:
1. Revisa el archivo relevante:
   - Paso 2 (Supabase) → Lee sección "Fase 1" en DEPLOYMENT_GUIDE.md
   - Paso 3 (Vercel) → Lee sección "Fase 3" en DEPLOYMENT_GUIDE.md
2. Revisa "Troubleshooting" en DEPLOYMENT_GUIDE.md
3. Revisa README.md

---

**⏱️ Tiempo estimado: 25-30 minutos de configuración manual**  
**🎊 Resultado: App completamente funcional en producción**

¡Adelante! 🚀
