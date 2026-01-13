# Configuración de Webhook de GitHub para Despliegue Automático

Este documento explica cómo configurar el webhook de GitHub para que el servidor se actualice automáticamente cuando se haga push a la rama `main`.

## Requisitos Previos

1. El servidor debe tener acceso a internet para recibir webhooks de GitHub
2. El servidor debe tener git configurado con acceso al repositorio
3. El servidor debe tener permisos para ejecutar `git pull` y reiniciar el servicio

## Paso 1: Configurar el Secret del Webhook

1. Genera un secret seguro (ya generado):
   ```
   3d38b2dc9ddf8a1cd45a68e28625bdb0c619a02521bd86994e4973873322bdec
   ```

2. Agrega este secret a tu archivo `.env`:
   ```bash
   GITHUB_WEBHOOK_SECRET=3d38b2dc9ddf8a1cd45a68e28625bdb0c619a02521bd86994e4973873322bdec
   ```

3. Reinicia el servidor para cargar la nueva variable de entorno:
   ```bash
   sudo systemctl restart listas-bichoto.service
   ```

## Paso 2: Configurar el Webhook en GitHub

1. Ve a tu repositorio en GitHub: `https://github.com/herbertzap/listas_escolares`

2. Ve a **Settings** > **Webhooks** > **Add webhook**

3. Configura el webhook:
   - **Payload URL**: `https://tu-dominio.com/api/webhook/github`
     - Si no tienes dominio público, puedes usar un servicio como ngrok para pruebas
     - Ejemplo con ngrok: `https://abc123.ngrok.io/api/webhook/github`
   
   - **Content type**: `application/json`
   
   - **Secret**: `3d38b2dc9ddf8a1cd45a68e28625bdb0c619a02521bd86994e4973873322bdec`
   
   - **Which events would you like to trigger this webhook?**: 
     - Selecciona **Just the push event**
   
   - **Active**: ✅ (marcado)

4. Haz clic en **Add webhook**

## Paso 3: Verificar que Funciona

1. Haz un cambio pequeño en el repositorio (por ejemplo, agregar un comentario)

2. Haz commit y push a la rama `main`:
   ```bash
   git add .
   git commit -m "test: Verificar webhook"
   git push origin main
   ```

3. Verifica los logs del servidor:
   ```bash
   sudo journalctl -u listas-bichoto.service -f
   ```

4. Deberías ver mensajes como:
   ```
   🔔 Webhook recibido: push
   🚀 Iniciando despliegue automático desde GitHub...
   ✅ Git pull exitoso
   ✅ Servidor listas-bichoto.service reiniciado automáticamente
   ```

5. También puedes verificar en GitHub:
   - Ve a **Settings** > **Webhooks**
   - Haz clic en tu webhook
   - Verás el historial de entregas (deliveries)
   - Debería aparecer un check verde ✅ si fue exitoso

## Solución de Problemas

### El webhook no se recibe

1. Verifica que la URL del webhook sea accesible públicamente
2. Verifica que el servidor esté corriendo y escuchando en el puerto correcto
3. Revisa los logs de Apache/Nginx si usas proxy reverso

### Error de permisos al hacer git pull

1. Asegúrate de que el usuario que ejecuta el servidor tenga permisos:
   ```bash
   sudo chown -R ec2-user:apache /var/www/html/listas-bichoto/listas.bichoto.cl
   ```

2. Verifica que git esté configurado correctamente:
   ```bash
   cd /var/www/html/listas-bichoto/listas.bichoto.cl
   git config --global user.name "Tu Nombre"
   git config --global user.email "tu@email.com"
   ```

### Error al reiniciar el servicio

1. Verifica el nombre del servicio:
   ```bash
   sudo systemctl status listas-bichoto.service
   ```

2. Si el nombre es diferente, actualiza la variable de entorno:
   ```bash
   # En .env
   SYSTEMD_SERVICE_NAME=tu-servicio.service
   ```

## Seguridad

- ✅ El webhook verifica la firma usando HMAC SHA-256
- ✅ Solo procesa eventos de push a la rama `main`
- ✅ El secret está almacenado en variables de entorno (no en el código)

## Notas

- El webhook solo procesa eventos de push a `main`
- Otros eventos (pull requests, issues, etc.) se ignoran
- El servidor se reinicia automáticamente después de cada pull exitoso
- Los logs se guardan en los logs del sistema (journalctl)
