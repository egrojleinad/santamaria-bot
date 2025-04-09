// Santamaría Bot - Submenús + Temporizadores + Notificación externa

const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const app = express();
const port = 4040;

const accountSid = 'YOUR_ACCOUNT_SID';
const authToken = 'YOUR_AUTH_TOKEN';
const twilioClient = twilio(accountSid, authToken);

app.use(bodyParser.urlencoded({ extended: false }));

const clients = {};

const showMainMenu = () => (
  `👋 ¿Cómo podemos ayudarte hoy?

Opciones:
1: Admisiones
2: Gestiones Académicas
3: Gestiones Administrativas
4: Capellanía
9: Terminar sesión`
);

const admisionesMenu = () => (
  `🔸 Admisiones:
1: Información general
2: Inicial
3: Primaria
4: Secundaria
5: Proceso de admisión
6: Solicitar visita guiada
7: Iniciar proceso de admisión
8: Conversar con asesora
9: Volver al Menú`
);

const academicoMenu = () => (
  `📓 Gestiones Académicas:
1: Solicitud de documentos
2: Horarios de clase
3: Información específica
4: Dirección
5: Coordinación académica
6: Volver al Menú`
);

const administrativoMenu = () => (
  `📃 Gestiones Administrativas:
1: Cuentas, bancos, proveedores
2: Bolsa de trabajo
3: Volver al Menú`
);

const capellaniaMenu = () => (
  `⛪ Capellanía:
1: Misas y ceremonias
2: Volver al Menú`
);

const returnToMainMenu = (client, twiml) => {
  client.step = 'menu';
  twiml.message(showMainMenu());
};

const delayMessage = (twiml, message, menuFn) => {
  twiml.message(message);
  setTimeout(() => {
    twiml.message(menuFn());
  }, 3000);
};

app.post('/webhook', (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const from = req.body.From;
  const msg = req.body.Body.trim();

  if (!clients[from]) {
    clients[from] = { step: 'ask_name', name: '' };
    twiml.message('👋 ¡Hola! Soy SantaMaría, tu asistente virtual. ¿Podés decirme tu nombre completo antes de continuar?');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  
  }

  const client = clients[from];

  if (client.step === 'ask_name') {
    client.name = msg;
    client.step = 'menu';
    twiml.message(`¡Gracias, ${client.name}!`);
    twiml.message(showMainMenu());
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  }

  switch (client.step) {
    case 'menu':
      if (msg === '1') {
        client.step = 'submenu_1';
        twiml.message(admisionesMenu());
      } else if (msg === '2') {
        client.step = 'submenu_2';
        twiml.message(academicoMenu());
      } else if (msg === '3') {
        client.step = 'submenu_3';
        twiml.message(administrativoMenu());
      } else if (msg === '4') {
        client.step = 'submenu_4';
        twiml.message(capellaniaMenu());
      } else if (msg === '9') {
        delete clients[from];
        twiml.message('👋 ¡Gracias por tu visita! Esperamos ayudarte pronto.');
      } else {
        twiml.message('❗ Opción no válida. Por favor elegí una opción del menú.');
        twiml.message(showMainMenu());
      }
      break;

    case 'submenu_1':
      switch (msg) {
        case '1': delayMessage(twiml, '📄 Puede descargar aquí el brochure informativo: https://shorturl.at/5TfA2', admisionesMenu); break;
        case '2': delayMessage(twiml, '📄 Inicial: https://shorturl.at/3RH23', admisionesMenu); break;
        case '3': delayMessage(twiml, '📄 Primaria: https://shorturl.at/C3prm', admisionesMenu); break;
        case '4': delayMessage(twiml, '📄 Secundaria: https://shorturl.at/oLXVf', admisionesMenu); break;
        case '5': delayMessage(twiml, '🌐 Proceso de admisión: https://santamariachincha.edu.pe/admision/', admisionesMenu); break;
        case '6':
          twiml.message('✅ Hemos registrado tu solicitud para una visita guiada. Pronto te contactaremos.');
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            auth: {
              user: 'jcolmenares@santamariachincha.edu.pe',
              pass: 'TotusTuus2019'
            }
          });

          const mailOptions = {
            from: 'jcolmenares@santamariachincha.edu.pe',
            to: 'acastilla@santamariachincha.edu.pe',
            subject: 'Solicitud de Visita Guiada',
            text: `Nombre: ${client.name || 'No especificado'}
WhatsApp: ${from}`
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error al enviar correo:', error);
            } else {
              console.log('Correo enviado:', info.response);
            }
          });
          break;
        case '7': delayMessage(twiml, '📝 Registrate aquí: https://colegiosantamaria.sieweb.com.pe/admision/#/inscripcion', admisionesMenu); break;
        case '9': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Admisiones.');
          twiml.message(admisionesMenu());
      }
      break;

    case 'submenu_2':
      switch (msg) {
        case '1': delayMessage(twiml, '📬 Escriba su solicitud a info@santamariachincha.edu.pe con asunto: "Solicitud de documentos"', academicoMenu); break;
        case '2': delayMessage(twiml, '📅 Horarios de clase: https://santamariachincha.edu.pe/', academicoMenu); break;
        case '3': delayMessage(twiml, 'ℹ️ Escriba a acastilla@santamariachincha.edu.pe con asunto: "Consultas"', academicoMenu); break;
        case '4': delayMessage(twiml, '🎓 Dirección general: mmoron@santamariachincha.edu.pe', academicoMenu); break;
        case '5': delayMessage(twiml, '📚 Coordinación académica: whurtado@santamariachincha.edu.pe', academicoMenu); break;
        case '6': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Académicas.');
          twiml.message(academicoMenu());
      }
      break;

    case 'submenu_3':
      switch (msg) {
        case '1': delayMessage(twiml, '📧 Escriba a ovaldivia@santamariachincha.edu.pe para consultas administrativas', administrativoMenu); break;
        case '2': delayMessage(twiml, '📩 Envíe su CV a postula@santamaria.edu.pe con el área o rol en el asunto', administrativoMenu); break;
        case '3': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Administrativas.');
          twiml.message(administrativoMenu());
      }
      break;

    case 'submenu_4':
      switch (msg) {
        case '1': delayMessage(twiml, '🙏 Información sobre misas: https://wa.link/09hexw', capellaniaMenu); break;
        case '2': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Capellanía.');
          twiml.message(capellaniaMenu());
      }
      break;

    default:
      client.step = 'menu';
      twiml.message(showMainMenu());
      break;
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(port, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${port}`);
});
