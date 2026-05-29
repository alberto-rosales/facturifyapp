# facturifyapp
# 📬 Facturify MiInbox - Prueba Técnica (Senior Full-Stack Developer)

Este repositorio contiene la solución para el módulo de sistema de mensajería tipo "inbox" , desarrollado bajo el enfoque **Backend-Frontend** (implementando tanto el backend en Laravel como el frontend en React con TypeScript).

El sistema permite listar conversaciones, ver mensajes dentro de un hilo y responder a mensajes existentes.

La IA fue utilizada para consultar algunos errores de conección en el Reverb.
---

## 📐 Decisiones de Diseño y Arquitectura

**Backend** Se crea un API en laravel con los end points solicitados, con una conexion a base de datos postgres en un servidor de supabase. Los mensajes se propagan con Reverb para tener realtime. (Se agregan los test y un collection para Postman, solo hay que remplasar el dominio a local).

**Frontend** Se crea proyecto React con Vite y tailwind para los estilos, integrando al backend.

---

## 💾 Estructura de Datos (Modelos y Migraciones)

De acuerdo con el flujo de la aplicación y las relaciones requeridas, se crearon los siguientes componentes en Laravel:

1. **User (Usuario):** Modelo de identidad para el manejo de sesión y asignación de autorías.
2. **Thread (Hilo):** Modelo que representa la conversación o ticket de soporte. Contiene el asunto (*subject*) del mensaje.
3. **Message (Mensaje):** Modelo que almacena el cuerpo del mensaje (*body*), la fecha, hora y el estado de lectura.

---



## 🚀 Instrucciones de Instalación y Arranque

Para inicializar el ecosistema completo y habilitar la comunicación por WebSockets en tiempo real, se deben ejecutar los siguientes comandos distribuidos en **3 terminales independientes**:

### 📁 Terminal 1: Servidor HTTP del Back-End (Laravel API)

En la raiz del proyecto backend en una terminal ejecutar el comando
php artisan serve

En la raiz del proyecto backend en una terminal ejecutar el comando
php artisan reverb:start

En la raiz del proyecto frontend en una terminal ejecutar el comando
npm run dev