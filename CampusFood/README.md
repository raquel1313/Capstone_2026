# CampusFood 🍽️

## Descripción

**CampusFood** es una plataforma web diseñada para facilitar la gestión y consulta de información del casino y la cafetería de la sede universitaria.

Permite a los estudiantes consultar el menú semanal de almuerzos, realizar pedidos de productos de cafetería para retirarlos directamente en el mesón y expresar sus preferencias mediante reacciones y votaciones.

El sistema busca mejorar el acceso a la información, optimizar la gestión de los pedidos y reducir los tiempos de espera en la cafetería.

## Funcionalidades principales

### 👨‍🎓 Estudiantes

- **Inicio de sesión por rol:** acceso mediante credenciales, con redirección a la vista correspondiente según el tipo de usuario (estudiante o personal). Las cuentas desactivadas no pueden ingresar.
- **Pantalla de bienvenida:** splash screen con animación y transición a la aplicación.
- **Inicio:** buscador, categorías de cafetería, carrusel "Para tu break" y acceso al menú semanal.
- **Menú semanal:** consulta de los platos disponibles por día, indicador de productos agotados y sistema de reacciones mediante emojis (Excelente, Bueno, Regular y Wakala).
- **Cafetería:** catálogo de productos con búsqueda y filtros por categoría. Los productos agotados se muestran al final y no pueden agregarse al carrito.
- **Carrito y pedidos:** permite agregar productos, validar disponibilidad y stock, conservar el carrito al recargar la página y generar un código de retiro. El pago se realiza presencialmente en el mesón.
- **Votaciones:** participación en encuestas activas, con confirmación del voto y restricción de un voto por usuario.
- **Perfil:** visualización de datos personales, estadísticas, historial y estado de pedidos. Permite cancelar pedidos completos o retirar productos individuales mientras el pedido esté pendiente. Incluye contador de faltas.
- **Notificaciones:** avisos persistentes por usuario sobre pedidos listos, pedidos cancelados por el casino y productos retirados de un pedido. Permite descartar notificaciones deslizando.

### 🛠️ Colaboradores y administración

- **Dashboard:** resumen del período, reacciones mensuales con comparación respecto al mes anterior, ranking de días y platos mejor valorados, productos más pedidos y resultados de encuestas.
- **Gestión de pedidos:** filtros por estado, fecha, producto, horario y texto. Permite cancelar pedidos indicando un motivo, quitar productos individuales, marcar pedidos como listos o retirados, detectar productos agotados en pedidos pendientes y consultar clientes bloqueados.
- **Gestión del menú semanal:** creación, edición y eliminación de días y platos, control de disponibilidad y consulta de métricas de reacciones.
- **Gestión de productos de cafetería:** creación, edición y eliminación de productos, control de stock, disponibilidad y filtros por categoría.
- **Gestión de votaciones:** creación de encuestas con rangos de fechas, consulta de resultados y opciones para cerrar o reabrir votaciones. Disponible únicamente para administradores.
- **Usuarios y permisos:** administración de cuentas, estados y permisos de acceso. Disponible únicamente para administradores.

## Tecnologías utilizadas

El proyecto fue desarrollado utilizando las siguientes tecnologías y herramientas:

| Tecnología | Descripción |
|---|---|
| [Next.js](https://nextjs.org/) | Framework de desarrollo web basado en React. |
| [React](https://react.dev/) | Biblioteca para la construcción de interfaces de usuario. |
| [TypeScript](https://www.typescriptlang.org/) | Lenguaje que incorpora tipado estático a JavaScript. |
| [Tailwind CSS](https://tailwindcss.com/) | Framework CSS para el diseño de interfaces. |
| [Lucide React](https://lucide.dev/) | Biblioteca de iconos. |
| [Google Fonts](https://fonts.google.com/) | Tipografías DM Sans, Fraunces y Caveat. |
| [Prisma ORM](https://www.prisma.io/) | Acceso a la base de datos, esquema y migraciones. |
| [PostgreSQL en Supabase](https://supabase.com/) | Base de datos y autenticación de usuarios (Supabase Auth). |

## Instalación y ejecución

### Requisitos previos

- [Node.js](https://nodejs.org/) (versión LTS reciente).
- npm (incluido con Node.js).
- Git para clonar el repositorio.

### Pasos de instalación

1. Clonar el repositorio e ingresar a la carpeta del proyecto:

```bash
git clone https://github.com/raquel1313/Capstone_2026
cd Capstone_2026/CampusFood
```

2. Instalar las dependencias (en el mismo sistema operativo en que se ejecutará; no copies `node_modules` entre equipos):

```bash
npm install
```

3. Configurar las variables de entorno. Copia `.env.example` a `.env` y `.env.local` y completa los valores de tu proyecto de Supabase (conexión a la base de datos, URL y llaves). Estos archivos están ignorados por Git.

4. Crear las tablas y cargar los datos iniciales (roles, permisos, estados de pedido y catálogo de productos). Usa una base de datos de **desarrollo**:

```bash
npm run db:migrate    # aplica las migraciones
npm run db:generate   # genera el cliente de Prisma
npm run db:seed       # roles, permisos, estados y productos (se puede repetir sin perder datos)
```

5. Crear los usuarios de prueba. Las contraseñas las guarda Supabase Auth, no la base de datos de CampusFood:

   - En el panel de Supabase, *Authentication → Users*, crea un usuario con correo y contraseña e incluye `nombre` y `apellido` en los metadatos. Un disparador lo registra en CampusFood con el rol `student`.
   - Para convertirlo en trabajador o administrador, ejecuta en el *SQL Editor* (cambia el correo y el rol `worker` o `admin`):

```sql
INSERT INTO public.usuario_rol (id_usuario, id_rol)
SELECT u.id, r.id_rol
FROM auth.users u, public.roles r
WHERE u.email = 'correo@ejemplo.cl' AND r.nombre = 'admin'
ON CONFLICT DO NOTHING;
```

   Una vez que exista un administrador, el resto de las cuentas se crean desde el panel *Usuarios*.

6. Iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en:

```text
http://localhost:3000
```

### Verificación

```bash
npm run db:validate   # valida el esquema de Prisma
npm run typecheck     # tipos de TypeScript
npm run lint          # reglas de ESLint
npm run build         # compilación de producción
```

### Compilación para producción

Para generar y ejecutar la versión de producción:

```bash
# Generar la compilación
npm run build

# Iniciar la aplicación
npm run start
```

---

**CampusFood** — Plataforma web para la gestión del casino y la cafetería universitaria.