// Santamaría Bot - Submenús + Temporizadores + Notificación externa (con niveles de menú más claros)

const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const app = express();
const port = 4040;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER;
const notifyTo = 'whatsapp:+51986040443';
const twilioClient = twilio(accountSid, authToken);

app.use(bodyParser.urlencoded({ extended: false }));

const clients = {};
const activityTimeouts = {};

const MENUS = {
  MAIN: 'menu',
  ADMISIONES: 'submenu_1',
  ACADEMICO: 'submenu_2',
  ADMINISTRATIVO: 'submenu_3',
  CAPELLANIA: 'submenu_4',
};

const showMainMenu = () => (
  `👋 ¿Cómo podemos ayudarte hoy?

Opciones:
1: Admisiones
2: Gestiones Académicas
3: Gestiones Administrativas
4: Capellanía
0: Terminar sesión`
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
0: Terminar sesión`
);

const academicoMenu = () => (
  `📓 Gestiones Académicas:
1: Solicitud de documentos
2: Horarios de clase
3: Información específica
4: Dirección
5: Coordinación académica
0: Terminar sesión`
);

const administrativoMenu = () => (
  `📃 Gestiones Administrativas:
1: Cuentas, bancos, proveedores
2: Bolsa de trabajo
3: Conversar con Secretaría
0: Terminar sesión`
);

const capellaniaMenu = () => (
  `⛪ Capellanía:
1: Misas y ceremonias
2: Conversar con la Capellanía
0: Terminar sesión`
);

const returnToMainMenu = (client, twiml) => {
  client.step = MENUS.MAIN;
  twiml.message(showMainMenu());
};

const delayMessage = (twiml, message, menuFn) => {
  twiml.message(message);
  twiml.message(menuFn());
};

app.post('/webhook', (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const from = req.body.From;
  const msg = req.body.Body.trim();

  clearTimeout(activityTimeouts[from]);

  if (!clients[from]) {
    clients[from] = { step: 'ask_name', name: '' };
    twiml.message('👋 ¡Hola! Soy SantaMaría, tu asistente virtual. ¿Podrías indicarme tu nombre completo antes de continuar? 📝 En cualquier momento, podés escribir 0 para terminar la sesión.');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());

    activityTimeouts[from] = setTimeout(() => {
      delete clients[from];
      twilioClient.messages.create({
        from: whatsappFrom,
        to: from,
        body: '⌛ Hemos cerrado la sesión por inactividad. Si deseas retomar la conversación, por favor, envíame un mensaje.'
      });
    }, 120000);
    return;
  }

  const client = clients[from];

  if (client.step === 'ask_name') {
    client.name = msg;
    client.step = MENUS.MAIN;
    twiml.message(`¡Gracias, ${client.name}!`);
    setTimeout(() => {
      twilioClient.messages.create({
        body: showMainMenu(),
        from: whatsappFrom,
        to: from
      });
    }, 3000);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  }

  const handleExit = () => {
    delete clients[from];
    twiml.message('👋 ¡Gracias por tu visita! Espero haberte ayudado. Si necesitas algo más, no dudes en escribirme.');
  };

  const notify = (asunto) => {
    twilioClient.messages.create({
      body: `📌 ${asunto}
Nombre: ${client.name || 'No especificado'}
WhatsApp: ${from}
Fecha: ${new Date().toLocaleDateString('es-PE')}
Hora: ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`,
      from: whatsappFrom,
      to: notifyTo
    });
  };

  switch (client.step) {
    case MENUS.MAIN:
      switch (msg) {
        case '1': client.step = MENUS.ADMISIONES; twiml.message(admisionesMenu()); break;
        case '2': client.step = MENUS.ACADEMICO; twiml.message(academicoMenu()); break;
        case '3': client.step = MENUS.ADMINISTRATIVO; twiml.message(administrativoMenu()); break;
        case '4': client.step = MENUS.CAPELLANIA; twiml.message(capellaniaMenu()); break;
        case '0': handleExit(); break;
        default:
          twiml.message('❗ Opción no válida. Por favor, elige una de las opciones del menú.');
          twiml.message(showMainMenu());
      }
      break;

    case MENUS.ADMISIONES:
      switch (msg) {
        case '1': delayMessage(twiml, '📄 Podés descargar el brochure informativo desde aquí: https://shorturl.at/5TfA2', admisionesMenu); break;
        case '2': delayMessage(twiml, '📄 Inicial - Brochure: https://shorturl.at/3RH23', admisionesMenu); break;
        case '3': delayMessage(twiml, '📄 Primaria - Brochure: https://shorturl.at/C3prm', admisionesMenu); break;
        case '4': delayMessage(twiml, '📄 Secundaria - Brochure: https://shorturl.at/oLXVf', admisionesMenu); break;
        case '5': delayMessage(twiml, '🌐 Proceso de admisión: https://santamariachincha.edu.pe/admision/', admisionesMenu); break;
        case '6':
          delayMessage(twiml, '✅ Hemos registrado tu solicitud para una visita guiada. Pronto te contactaremos.', admisionesMenu);
          notify('Solicitud de visita guiada');
          break;
        case '7': delayMessage(twiml, '📝 Podés registrarte aquí: https://colegiosantamaria.sieweb.com.pe/admision/#/inscripcion', admisionesMenu); break;
        case '8':
          delayMessage(twiml, '📨 Te pondré en contacto con una asesora de admisión.', admisionesMenu);
          notify('Solicitud de atención personal con asesora de admisión');
          break;
        case '0': handleExit(); break;
        default:
          twiml.message('❗ Ups, parece que esa opción no es válida. Por favor, elige una opción correcta del menú.');
          twiml.message(admisionesMenu());
      }
      break;

    case MENUS.ACADEMICO:
      switch (msg) {
        case '1': delayMessage(twiml, '📬 Por favor, escribí tu solicitud a info@santamariachincha.edu.pe con asunto: "Solicitud de documentos"', academicoMenu); break;
        case '2': delayMessage(twiml, '📅 Horarios de clase: https://santamariachincha.edu.pe/', academicoMenu); break;
        case '3':
          delayMessage(twiml, 'ℹ️ Te pondremos en contacto con el área correspondiente.', academicoMenu);
          notify('Solicitud de información académica');
          break;
        case '4': delayMessage(twiml, '🎓 Dirección general: mmoron@santamariachincha.edu.pe', academicoMenu); break;
        case '5': delayMessage(twiml, '📚 Coordinación académica: whurtado@santamariachincha.edu.pe', academicoMenu); break;
        case '0': handleExit(); break;
        default:
          twiml.message('❗ Opción inválida en Académicas.');
          twiml.message(academicoMenu());
      }
      break;

    case MENUS.ADMINISTRATIVO:
      switch (msg) {
        case '1': delayMessage(twiml, '📧 Por favor, escribí a ovaldivia@santamariachincha.edu.pe para consultas administrativas', administrativoMenu); break;
        case '2': delayMessage(twiml, '📩 Podés enviar tu CV a postula@santamaria.edu.pe con el área o rol en el asunto', administrativoMenu); break;
        case '3':
          delayMessage(twiml, '📨 Te pondremos en contacto con la Secretaría.', administrativoMenu);
          notify('Solicitud de contacto con Secretaría');
          break;
        case '0': handleExit(); break;
        default:
          twiml.message('❗ Opción inválida en Administrativas.');
          twiml.message(administrativoMenu());
      }
      break;

    case MENUS.CAPELLANIA:
      switch (msg) {
        case '1': delayMessage(twiml, '🙏 Aquí podés consultar sobre misas y celebraciones: https://wa.link/09hexw', capellaniaMenu); break;
        case '2':
          delayMessage(twiml, '📨 Te pondremos en contacto con la Capellanía.', capellaniaMenu);
          notify('Solicitud de contacto con Capellanía');
          break;
        case '0': handleExit(); break;
        default:
          twiml.message('❗ Opción inválida en Capellanía.');
          twiml.message(capellaniaMenu());
      }
      break;

    default:
      client.step = MENUS.MAIN;
      twiml.message(showMainMenu());
      break;
  }

  activityTimeouts[from] = setTimeout(() => {
    delete clients[from];
    twilioClient.messages.create({
      from: whatsappFrom,
      to: from,
      body: '⌛ Hemos cerrado la sesión por inactividad. Si deseas retomar la conversación, por favor, envíame un mensaje.'
    });
  }, 120000);

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(port, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${port}`);
});
