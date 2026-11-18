Te pasamos nuestros dos informes de Mano Amiga (diseño y seguridad). La arquitectura ya está definida: app en Expo, front-service en la DMZ, API en Express en la red segura y MongoDB, con docker-compose en EC2. Implementá el Sprint 1 con R9, R10, R13 y R14, más RS1+RS4, RS8, RS2 y RS3. Queremos la matriz endpoint × rol en código con un test que la recorra, denegar por defecto, permisos releídos de la base en cada pedido, control de IDOR y de organización, y ABAC para voluntarios judiciales. Explicanos paso a paso cómo correrlo en Windows.


Guianos para crear el cluster gratuito en Atlas: un usuario para la API con readWrite solo sobre mano_amiga, la lista de IPs sin 0.0.0.0/0, y cómo sacar la cadena de conexión para el .env.


Cada vez que cambiamos de red hay que cambiar la IP en el .env de la app. Hacé que la detecte sola en desarrollo.


La interfaz está muy sobria y es una app de voluntariado, queremos que sea alegre. Usá de inspiración superdesigner.co, realtimecolors.com, colorhunt.co, drawkit.com y shapes.co: más colores, figuras decorativas, tipografías redondeadas y animaciones suaves. Decinos qué archivos reemplazar. Agregá figuras orgánicas (círculos, manchas, ondas) en los fondos de las cabeceras, en el color del tipo con transparencia. Son solo decoración: no pueden tapar texto ni responder al toque. Animaciones suaves y cortas, de 200 a 400 ms, solo donde ayudan a entender qué pasó: abrir, cerrar o confirmar una acción. Nada que rebote ni que haga esperar. Sin efectos de hover, porque en el celular no hay mouse. 


Usamos cards para cada actividad de la lista, porque juntan foto, tipo, fecha y lugar en un bloque que se toca entero. Pero:
•	sin sombras pesadas;
•	nunca una card adentro de otra, porque se pierde la jerarquía y no se entiende qué se toca;
•	lo que es solo información (por ejemplo "Ya marcaste tu asistencia") va como texto con un ícono, no en una card.



Arrancamos el Sprint 2 con R5 (mapa), R15 (admin) y R16 (perfil), más RS5, RS9 y RS10. Queremos revocación inmediata de sesiones con una versión de sesión en el token, reautenticación del admin para las acciones de escritura, el mapa solo con ubicaciones institucionales, perfil con edición de datos, cambio de contraseña e historial de accesos, y la matriz completa con tests.


Agregá tema claro, oscuro y automático, guardado en el perfil del usuario.


Escribí la guía para desplegar en la instancia gratuita de EC2 respetando la DMZ y la red segura: security group, IP fija, dominio gratis, HTTPS con Let's Encrypt y docker compose. La base queda en Atlas porque la instancia tiene poca RAM.


Preciso que investigues en la web por campañas de donaciones reales, voluntariados, campañas, etc. Y crea un archivo seed .js para cargarlos todos juntos a la pagina desde el back.


Queremos sumar un chat por actividad para que el grupo se organice, aparte de las novedades, que son públicas y solo las escribe el coordinador. Lo pensamos así: solo entran los voluntarios aceptados y los coordinadores de esa organización, y el control va en la API, no solo en la app. Los mensajes nuevos se consultan cada pocos segundos para no tocar el front-service de la DMZ. Si la actividad se cancela o terminó hace unos días, el chat queda solo para leer. El coordinador puede borrar mensajes para moderar. En la app, burbujas: las tuyas a la derecha y las de los demás a la izquierda con su nombre.
Guianos paso a paso para armarlo respetando la matriz de seguridad, la ABAC para judiciales y los tests que ya tenemos. Si ves una forma mejor o más simple de resolver algo de esto, proponela y hacela vos, explicándonos por qué.


El coordinador muestra un QR en su celular y el voluntario lo escanea para marcar que fue. El QR sirve desde 1 hora antes del inicio hasta 2 horas después del fin: antes no tiene sentido, y después ya no es creíble. La regla se controla en la API y no solo en la app, porque la app se puede modificar. Fuera de ese horario, el voluntario ve: "Te esperamos el sábado 22 a las 10:00. Ese día marcás tu asistencia acá". Después de escanear, la asistencia queda "esperando validación" hasta que la confirma el coordinador. El coordinador puede registrar la asistencia a mano, por si a alguien no le anda la cámara, pero solo una vez que empezó la actividad (RS-20). Antes no tiene sentido y se presta a cargar horas falsas. Si la organización cancela una actividad, desaparece de "Mis inscripciones" del voluntario aunque ya tuviera asistencia. Las cancelaciones pasan antes del día y no queremos que ensucien la lista.


Queremos que la app avise cuando pasa algo importante: cuando te aceptan o rechazan en una actividad, cuando se cancela o cambia de fecha o lugar, cuando hay una novedad y cuando llegan mensajes al chat. Pensamos en una campanita con el número de avisos sin leer y una lista donde cada aviso te lleva a su pantalla. Los mensajes del chat irían agrupados para no llenar de avisos. Cada aviso es privado de su dueño y no lleva datos personales. Después queremos que también lleguen como notificación push con la app cerrada.
Guianos en qué orden conviene hacerlo y qué necesitamos para el push (Expo, Firebase, APK), teniendo en cuenta que todavía no desplegamos. Lo que veas que se puede resolver mejor, hacelo vos y explicanos la decisión.