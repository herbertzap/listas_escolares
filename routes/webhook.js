const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');

// Secret del webhook (debe coincidir con el configurado en GitHub)
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'tu_secreto_aqui_cambiar';

// Función para verificar la firma del webhook de GitHub
function verifyGitHubSignature(payload, signature) {
  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// POST /api/webhook/github - Webhook para recibir eventos de GitHub
router.post('/github', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const payload = JSON.parse(req.body.toString());

    console.log(`🔔 Webhook recibido: ${event}`);

    // Verificar la firma del webhook
    if (!verifyGitHubSignature(req.body, signature)) {
      console.error('❌ Firma del webhook inválida');
      return res.status(401).json({ success: false, error: 'Firma inválida' });
    }

    // Solo procesar eventos de push a la rama main
    if (event === 'push' && payload.ref === 'refs/heads/main') {
      console.log('🚀 Iniciando despliegue automático desde GitHub...');
      
      const repoPath = path.resolve(__dirname, '..');
      
      // Ejecutar git pull
      exec('git pull origin main', { cwd: repoPath }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Error ejecutando git pull:', error);
          return res.status(500).json({
            success: false,
            error: 'Error ejecutando git pull',
            details: error.message
          });
        }

        console.log('✅ Git pull exitoso');
        console.log('📝 Output:', stdout);
        
        if (stderr) {
          console.warn('⚠️ Warnings:', stderr);
        }

        // Reiniciar el servidor si está configurado con systemd
        const serviceName = process.env.SYSTEMD_SERVICE_NAME || 'listas-bichoto.service';
        exec(`sudo systemctl restart ${serviceName}`, (restartError) => {
          if (restartError) {
            console.warn('⚠️ No se pudo reiniciar el servidor automáticamente:', restartError.message);
            console.log('💡 Puedes reiniciarlo manualmente con: sudo systemctl restart ' + serviceName);
          } else {
            console.log(`✅ Servidor ${serviceName} reiniciado automáticamente`);
          }
        });

        res.json({
          success: true,
          message: 'Despliegue completado exitosamente',
          commit: payload.head_commit?.id,
          author: payload.head_commit?.author?.name,
          message: payload.head_commit?.message
        });
      });
    } else {
      // Evento no relevante, responder OK pero no hacer nada
      res.json({
        success: true,
        message: 'Evento recibido pero no procesado',
        event: event,
        ref: payload.ref
      });
    }
  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando webhook',
      details: error.message
    });
  }
});

// GET /api/webhook/github - Endpoint para verificar que el webhook está funcionando
router.get('/github', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint activo',
    instructions: 'Configura este endpoint en GitHub Settings > Webhooks'
  });
});

module.exports = router;
