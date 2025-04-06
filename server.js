const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const app = express();
const port = 4040;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));

// Objeto en memoria para almacenar clientes (puede sustituirse por una base de datos real)
const clients = {};

// Ruta webhook de Twilio
app.post('/webhook', async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const from = req.body.From;
  const msg = req.body.Body.trim();
  
  // Usuario nuevo
  if (!clients[from]) {
    clients[from] = {
      step: 'welcome',
      name: '',
      phone: '',
      email: '',
      subject: '',
    };
    twiml.message(
      '👋 ¡Hola! Soy SantaMaría, tu asistente virtual. ¿Cómo podemos ayudarte hoy?\n\nOpciones:\n0: Registro inicial\n1: Admisiones\n2: Gestiones académicas\n3: Gestiones administrativas\n4: Recepción'
    );
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  }

  // Usuario existente
  const client = clients[from];

  switch (client.step) {
    case 'welcome':
      switch (msg) {
        case '0':
          client.step = 'ask_name';
          twiml.message('Perfecto, vamos a registrarte. ¿Cuál es tu nombre completo?');
          break;
        case '1':
          twiml.message('📚 Para Admisiones, por favor visita: https://santamaria.cr/admisiones o responde con tu pregunta específica.');
          break;
        case '2':
          twiml.message('📖 Para gestiones académicas, ¿qué necesitas? Puedes consultar sobre horarios, materias, etc.');
          break;
        case '3':
          twiml.message('💼 Para gestiones administrativas, indícanos tu consulta: pagos, certificados, etc.');
          break;
        case '4':
          twiml.message('📞 Te estamos conectando con Recepción. Por favor, indica tu nombre y motivo de contacto.');
          break;
        default:
          twiml.message('❗ Opción no válida. Por favor responde con 0, 1, 2, 3 o 4.');
          break;
      }
      break;

    case 'ask_name':
      client.name = msg;
      client.step = 'ask_phone';
      twiml.message('Gracias. Ahora, por favor indícanos tu número de teléfono.');
      break;

    case 'ask_phone':
      client.phone = msg;
      client.step = 'ask_email';
      twiml.message('Perfecto. Ahora, ¿cuál es tu correo electrónico?');
      break;

    case 'ask_email':
      client.email = msg;
      client.step = 'ask_subject';
      twiml.message('¿Sobre qué tema estás interesado?');
      break;

    case 'ask_subject':
      client.subject = msg;
      client.step = 'done';
      twiml.message(`✅ ¡Gracias por registrarte, ${client.name}!\n\nResumen:\n📞 Teléfono: ${client.phone}\n📧 Email: ${client.email}\n📚 Interés: ${client.subject}`);
      break;

    case 'done':
      if (msg.toLowerCase() === 'actualizar') {
        client.step = 'ask_name';
        twiml.message('Vamos a actualizar tus datos. ¿Cuál es tu nombre completo?');
      } else {
        twiml.message('Ya estás registrado. Si deseas actualizar algún dato, responde con "actualizar".');
      }
      break;

    default:
      twiml.message('No entiendo tu mensaje. Por favor responde con una opción del menú.');
      break;
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${port}`);
});
