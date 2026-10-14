Te pasamos nuestros dos informes de Mano Amiga (diseño y seguridad). La arquitectura ya está definida: app en Expo, front-service en la DMZ, API en Express en la red segura y MongoDB, con docker-compose en EC2. Implementá el Sprint 1 con R9, R10, R13 y R14, más RS1+RS4, RS8, RS2 y RS3. Queremos la matriz endpoint × rol en código con un test que la recorra, denegar por defecto, permisos releídos de la base en cada pedido, control de IDOR y de organización, y ABAC para voluntarios judiciales. Explicanos paso a paso cómo correrlo en Windows.

Guianos para crear el cluster gratuito en Atlas: un usuario para la API con readWrite solo sobre mano_amiga, la lista de IPs sin 0.0.0.0/0, y cómo sacar la cadena de conexión para el .env.

Cada vez que cambiamos de red hay que cambiar la IP en el .env de la app. Hacé que la detecte sola en desarrollo.

La interfaz está muy sobria y es una app de voluntariado, queremos que sea alegre. Usá de inspiración superdesigner.co, realtimecolors.com, colorhunt.co, drawkit.com y shapes.co: más colores, figuras decorativas, tipografías redondeadas y animaciones suaves. Decinos qué archivos reemplazar.

Arrancamos el Sprint 2 con R5 (mapa), R15 (admin) y R16 (perfil), más RS5, RS9 y RS10. Queremos revocación inmediata de sesiones con una versión de sesión en el token, reautenticación del admin para las acciones de escritura, el mapa solo con ubicaciones institucionales, perfil con edición de datos, cambio de contraseña e historial de accesos, y la matriz completa con tests.

Agregá tema claro, oscuro y automático, guardado en el perfil del usuario.

Escribí la guía para desplegar en la instancia gratuita de EC2 respetando la DMZ y la red segura: security group, IP fija, dominio gratis, HTTPS con Let's Encrypt y docker compose. La base queda en Atlas porque la instancia tiene poca RAM.

