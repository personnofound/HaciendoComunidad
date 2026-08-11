# Haciendo Comunidad

Aplicación para pedir ayuda en tiempo real durante una emergencia sísmica, reportar personas/mascotas desaparecidas, y pedir u ofrecer servicios comunitarios. Sin registro.

## Qué incluye este proyecto

- **Mapa de ayuda**: cualquiera toca el mapa, elige qué tipo de ayuda necesita y se publica al instante para todos. Abre centrado en Cali por defecto, y se recentra solo en la ubicación real de quien visita si da permiso de GPS. Se puede filtrar por localidad/barrio.
- **Desaparecidos**: fichas de personas y mascotas, con filtro por tipo (persona/mascota) y por localidad/barrio.
- **Comunidad**: la gente publica una petición ("Necesito…") o una oferta ("Puedo ofrecer…"), cada una con una categoría (agua, alimentos, transporte, salud, etc.). Se puede filtrar por tipo de publicación y por categoría.
- **Contra la desinformación**: quien crea una publicación puede marcarla como resuelta ("ya fue atendido", "ya se encontró", "ya está cubierto / ya no tengo más"), y cualquiera puede marcar una publicación como "🚩 desactualizada". Al llegar a varias marcas, se oculta sola del feed principal (queda visible con el interruptor "mostrar también..."). Ver la sección 8 para el detalle y sus límites.


## 6. Desplegar el sitio (gratis, con CDN global)

Recomiendo **Firebase Hosting**: es gratis, va en el mismo proyecto que ya creaste, tiene CDN global (rápido en cualquier país) y HTTPS automático.

### 6.1 Primer despliegue manual

```bash
firebase init hosting
```
- "What do you want to use as your public directory?" → escribe `.` (la carpeta raíz).
- "Configure as a single-page app?" → `No` (ya viene configurado en `firebase.json`).
- "Set up automatic builds and deploys with GitHub?" → puedes decir `Yes` aquí mismo para que te configure el paso 6.2 automáticamente, o hacerlo manual como abajo.

```bash
firebase deploy --only hosting
```

Te dará una URL tipo `https://tuproyecto.web.app` — ese es tu sitio público, ya con HTTPS y CDN.

### 6.2 Auto-despliegue en cada `git push` (ya viene el workflow listo)

Este proyecto incluye `.github/workflows/firebase-hosting.yml`, que despliega automáticamente cada vez que haces push a `main`. Para activarlo:

1. Genera una cuenta de servicio: en Firebase Console → ⚙️ **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Se descarga un `.json`.
2. En tu repositorio de GitHub → **Settings → Secrets and variables → Actions → New repository secret**.
   - Nombre: `FIREBASE_SERVICE_ACCOUNT`
   - Valor: pega el contenido completo del `.json` descargado.
3. Edita `.github/workflows/firebase-hosting.yml` y reemplaza `REEMPLAZA_CON_TU_PROJECT_ID` por el ID real de tu proyecto (lo ves en Configuración del proyecto).
4. Haz `git push` — desde ahora cada push a `main` despliega solo, sitio y reglas de Firestore incluidas.

> **Importante:** ese archivo `.json` de la cuenta de servicio SÍ es secreto de verdad. Nunca lo subas al repositorio; solo pégalo como GitHub Secret (que está cifrado).

### Alternativa: Vercel / Netlify / GitHub Pages

Como el sitio es 100% estático, también puedes conectarlo directo a Vercel o Netlify (arrastran el repo y listo) o incluso GitHub Pages. Firebase seguirá siendo el backend igual — solo cambia dónde vive el HTML/CSS/JS. Si usas Vercel/Netlify, activa igualmente el dominio en la lista de dominios permitidos de tu reCAPTCHA (paso 2.3) y en Firebase → Authentication → Settings → Authorized domains (por si luego agregas login de administrador).

---

## 7. Probar la instalación como app (PWA)

- **Android (Chrome)**: entra al sitio, aparece automáticamente la franja "Instalar" abajo, o Menú (⋮) → **Instalar app**.
- **iPhone (Safari)**: entra al sitio → botón **Compartir** (cuadrado con flecha) → **Añadir a pantalla de inicio**. iOS no permite el banner automático de instalación (limitación de Apple), por eso la app le muestra esta instrucción directamente.

---

## 8. Cómo se combate la desinformación (estados y reportes de "desactualizado")

Un problema típico en estos mapas comunitarios: alguien reporta que falta gente, o que ya se cubrió una necesidad, pero la publicación se queda ahí para siempre y otras personas siguen actuando sobre información vieja. Esta app ataca eso con dos mecanismos, **sin necesitar que nadie se registre**:

**a) Quien publica puede marcar su propia publicación como resuelta.**
Cuando creas un reporte, un desaparecido o una publicación de comunidad, la app lo recuerda en tu propio dispositivo (en `localStorage`). Mientras sigas en ese mismo navegador/teléfono, vas a ver un botón "✅ Marcar como atendido / encontrado / cubierto" en tus propias tarjetas. Al usarlo, la publicación pasa a un estado final y se oculta del feed principal (pero no se borra, queda disponible con el interruptor "Mostrar también...").

> **Límite honesto de este mecanismo:** como no hay cuentas de usuario, la app "recuerda que es tuyo" únicamente en tu propio navegador. Si cambias de dispositivo, no vas a ver el botón en esa publicación (podés seguir viéndola y usándola normalmente, solo no vas a poder marcarla como resuelta desde otro equipo). Alguien con conocimientos técnicos que llame directamente a la API de Firestore, sin pasar por esta web, técnicamente podría marcar como resuelta una publicación ajena — las reglas de Firestore SOLO permiten avanzar el estado en un sentido (nunca "reabrir" algo, nunca tocar el contenido, el contacto o la ubicación), así que el daño posible de un mal uso está muy acotado, y siempre se puede corregir manualmente desde la consola de Firebase. Si más adelante quieres blindar esto del todo, la solución es agregar login (Firebase Authentication) para que cada quien solo pueda editar lo suyo de verdad — puedo ayudarte con eso cuando lo necesites.

**b) Cualquiera puede marcar una publicación como "🚩 desactualizada".**
Cada tarjeta (menos las ya resueltas) tiene un botón para avisar que esa información parece vieja o falsa. Cada dispositivo puede marcarla una sola vez (se recuerda localmente para no repetir el aviso). Cuando una publicación junta **3 marcas** de dispositivos distintos (`UMBRAL_DESACTUALIZADO` en `js/config.js`, ajustable), se oculta sola del feed principal, igual que las resueltas.

**c) El filtro "Mostrar también..."**
Arriba de cada lista (Reportes recientes, Publicados recientemente, Publicaciones recientes) hay un interruptor para volver a ver lo resuelto/encontrado/cubierto o lo marcado como desactualizado — así nadie pierde el historial, solo se limpia la vista por defecto.

**d) Moderación manual (borrar del todo)**
Si algo es directamente falso o abusivo, sigue existiendo el camino de siempre: Firebase Console → Firestore Database → Datos → busca la colección (`reportes_ayuda`, `desaparecidos` o `comunidad_servicios`) → abre el documento problemático → **Eliminar documento**. Desaparece de la app al instante (es tiempo real). Si quieres un panel de administración con login para esto, dímelo y te ayudo a montarlo (requiere activar Firebase Authentication, también gratis).

---

## 9. Costos: cómo se mantiene en $0 y qué vigilar

Con el plan gratuito **Spark** de Firebase (el que ya tienes por defecto):

| Recurso | Límite gratis/mes | Suficiente para |
|---|---|---|
| Lecturas Firestore | 50,000/día | Miles de visitas viendo el mapa |
| Escrituras Firestore | 20,000/día | Miles de reportes nuevos |
| Almacenamiento | 1 GB | Cientos de miles de reportes de texto |
| Hosting | 10 GB transferencia/mes | Decenas de miles de visitas |

Si un evento se vuelve masivo y superas esto, Firebase **no apaga el sitio**: te pide pasar al plan **Blaze** (pago por uso, con esos mismos límites gratis incluidos igual — solo pagas lo que excede). Como dijiste que puedes pagar si hace falta, te recomiendo:

1. Activa alertas de presupuesto: Google Cloud Console → **Facturación → Presupuestos y alertas** → crea una alerta en, por ejemplo, $5 USD, para que te avisen antes de gastar de más.
2. Esto te avisa sin cortar el servicio, así nunca te toma por sorpresa.

---

## 10. Estructura del proyecto

```
haciendo-comunidad/
├── index.html                  Página principal (3 secciones/pestañas)
├── manifest.json                Configuración PWA
├── service-worker.js            Cachea el "shell" para funcionar offline
├── offline.html                 Pantalla de respaldo sin conexión ni caché
├── firebase.json                Config de Firebase Hosting
├── firestore.rules              Reglas de seguridad (LO MÁS IMPORTANTE)
├── firestore.indexes.json       Índices de Firestore
├── .firebaserc                  ID de tu proyecto Firebase
├── css/
│   └── styles.css
├── icons/                       Iconos de la PWA (reemplázalos si quieres tu marca)
├── js/
│   ├── config.js                 ← AQUÍ pegas tus claves de Firebase
│   ├── firebase-init.js          Inicializa Firebase + App Check + offline
│   ├── datos.js                  Lectura/escritura/paginación reutilizable
│   ├── cache.js                  Caché en localStorage
│   ├── utils.js                  Sanitizado, anti-spam de cliente, formato
│   ├── mapa.js                   Sección "Mapa de ayuda"
│   ├── desaparecidos.js          Sección "Desaparecidos"
│   ├── comunidad.js              Sección "Comunidad"
│   └── app.js                    Arranque: pestañas, conexión, instalar PWA
└── .github/workflows/
    └── firebase-hosting.yml     Auto-despliegue en cada push
```

---

## 11. Checklist final antes de compartir el link públicamente

- [ ] `js/config.js` tiene tus claves reales (no dice `REEMPLAZA`).
- [ ] App Check activado y "aplicado (enforce)" sobre Firestore.
- [ ] Reglas de `firestore.rules` publicadas en la consola.
- [ ] Probaste crear un reporte, un desaparecido y un servicio, y aparecen en tiempo real.
- [ ] Probaste "Cargar más" con varios documentos de prueba.
- [ ] Probaste instalar la PWA en un Android y un iPhone reales.
- [ ] Configuraste la alerta de presupuesto en Google Cloud.
- [ ] Le contaste a alguien más cómo moderar (borrar) contenido desde la consola, por si tú no estás disponible.

---

## 12. Ideas para mejorar más adelante (opcionales)

- Marcar un reporte como **"ya resuelto"** (requiere login de admin con Firebase Authentication).
- Subir **fotos** en desaparecidos (Firebase Storage, gratis hasta 5 GB).
- **Notificaciones push** cuando aparece un reporte cerca de tu ubicación (Firebase Cloud Messaging).
- Traducir la interfaz a otros idiomas si la comunidad lo necesita.

Si quieres que te ayude a construir cualquiera de estas, dímelo.
