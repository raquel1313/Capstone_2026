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

## Instalación y ejecución

### Requisitos previos

- [Node.js](https://nodejs.org/) (versión LTS reciente).
- npm (incluido con Node.js).
- Git para clonar el repositorio.

### Pasos de instalación

1. Clonar el repositorio:

```bash
git clone https://github.com/raquel1313/Capstone_2026
```

2. Ingresar a la carpeta del proyecto:

```bash
cd CampusFood
```

3. Instalar las dependencias:

```bash
npm install
```

4. Iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en:

```text
http://localhost:3000
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