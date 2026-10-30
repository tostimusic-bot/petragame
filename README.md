# PETRA · Más duros que la piedra

Prototipo de juego web para móvil. Incluye 10 nombres y 10 curiosidades ficticias.

## 1. Probar la interfaz rápidamente
Abre `index.html` en un navegador o publica la carpeta en Vercel / Netlify.
`DEMO_MODE: true` guarda las respuestas en el almacenamiento local del navegador.
**Importante:** en este modo las respuestas no se comparten entre móviles. Sirve para probar diseño y navegación.

## 2. Publicar una demo en Vercel
1. Crea una cuenta en https://vercel.com
2. Sube esta carpeta a un repositorio de GitHub.
3. En Vercel elige Add New → Project e importa ese repositorio.
4. Framework preset: Other. Build command y Output directory: déjalos vacíos / raíz según indique Vercel.
5. Deploy. Vercel te dará una URL pública que puedes abrir y convertir en QR.

También puedes publicar la carpeta en Netlify mediante su opción de despliegue manual.

## 3. Guardar respuestas de distintos móviles (Supabase)
Para el evento real, configura Supabase:
1. Crea un proyecto en https://supabase.com
2. En SQL Editor ejecuta `supabase-schema.sql`.
3. En Authentication → Providers / Sign In, deja desactivados los registros públicos (no queremos que los jugadores creen cuentas).
4. En Authentication → Users, crea un usuario para Laura (correo y contraseña).
5. En Project Settings → API copia Project URL y la clave `anon` / publishable.
6. Pega ambos valores en `config.js` y cambia `DEMO_MODE: false`.
7. Vuelve a desplegar la carpeta en Vercel.

Los jugadores no necesitan cuenta: envían su nombre y respuestas. Laura entra por ADMIN con su correo y contraseña para ver la clasificación y descargar el CSV. La política RLS permite inserciones públicas y lectura solo a usuarios autenticados.

## 4. Cambiar nombres y curiosidades
Edita los arrays `PEOPLE` y `QUESTIONS` al principio de `app.js`.
Cada curiosidad tiene este formato:
`{text: "La frase o curiosidad", answer: "Nombre exacto de la persona"}`
El nombre de `answer` debe coincidir exactamente con uno de `PEOPLE`.

## 5. Nota de seguridad
Este es un prototipo para un juego informal. La clave anon de Supabase está pensada para estar en el navegador y queda protegida por RLS. La corrección de respuestas se hace en el navegador, así que una persona técnica podría inspeccionar el código y descubrir las respuestas correctas. Para un concurso donde evitar trampas sea importante, conviene mover la corrección al servidor antes del evento.
