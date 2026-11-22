# Patitas Cubanas 🇨🇺🐾 — Red Nacional de Adopción Animal

Plataforma web moderna, rápida y adaptable para la adopción responsable de animales en todas las provincias y municipios de Cuba.

---

## 🛠️ Tecnologías y Arquitectura

- **Framework**: Astro 5 (generación estática ultra rápida y ligera para conexiones móviles 3G/4G en Cuba) + React Islands (`@astrojs/react`)
- **Estilos**: Tailwind CSS con paleta cálida y profesional (esmeralda, ámbar y tonos oscuros confortables)
- **Base de Datos & Backend**: Supabase (PostgreSQL, Row Level Security, procedimientos RPC seguros con verificación PBKDF2)
- **Almacenamiento de Fotos**: Supabase Storage (`media` bucket) con compresión WebP multirresolución en cliente (400, 900 y 1600 px)
- **Despliegue**: Cloudflare Workers (`wrangler.jsonc` + `worker.js`) con Static Assets y proxy de API de medios en `/api/media`

---

## 🐾 Características Principales

1. **Catálogo Territorial Completo de Cuba**:
   - 16 Provincias (Pinar del Río hasta Guantánamo + Isla de la Juventud).
   - 168 Municipios con selector dinámico dependiente para encontrar animales cerca del adoptante.

2. **Panel de Administración Blindado (Referencia OLIMPO)**:
   - Acceso con PIN administrativo seguro (algoritmo PBKDF2 con 25,000 iteraciones y protección contra fuerza bruta).
   - Gestión integral de Mascotas: alta, edición, estado (Disponible, Urgente, En Adopción, Adoptado), badges y datos médicos.
   - Módulo de Tarjetas Bancarias en Cuba: edición directa de tarjetas CUP y MLC, bancos, titular y teléfono de confirmación.
   - Biblioteca de Medios integrada: sube fotos con compresión WebP automática y asócialas a cualquier mascota en un clic.
   - Configuración general: lemas, teléfonos, WhatsApp, marquesina de avisos y preguntas frecuentes.
   - Seguridad: cambio de PIN cifrado en servidor.

3. **Módulo de Donativos para Cuba**:
   - Tarjetas CUP (Transfermóvil & EnZona).
   - Tarjeta MLC (BPA, BANDEC, Banco Metropolitano).
   - Botón de 1-clic para copiar número al portapapeles.
   - Botón directo de confirmación vía WhatsApp.
   - Lista dinámica de medicamentos e insumos urgentes necesitados en Cuba.

4. **Secciones de Alto Impacto Comunitario**:
   - **Hogares de Tránsito**: llamado voluntario para acoger animales en recuperación.
   - **Finales Felices**: testimonios reales con fotos.
   - **Preguntas Frecuentes**: orientación legal y ética sobre la adopción responsable.

---

## 🚀 Comandos de Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Previsualizar compilación
npm run preview
```

---

## 🗄️ Base de Datos Supabase

El archivo `database/schema_adopcion.sql` contiene todas las sentencias SQL necesarias para crear:
- Tablas (`pets`, `donation_settings`, `site_settings`, `media_assets`, `admin_auth_vault`)
- Políticas de seguridad RLS
- Bucket de Storage `media`
- Funciones RPC con validación criptográfica de PIN
