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
  `👋 ¿Cómo podemos ayudarle hoy? Seleccione una opción:\n` +
  `1: Admisiones\n` +
  `2: Gestiones Académicas\n` +
  `3: Gestiones Administrativas\n` +
  `4: Capellanía\n` +
  `0: Terminar sesión`
);

const setInactivityTimeout = (from, name = '') => {
  clearTimeout(activityTimeouts[from]);
  activityTimeouts[from] = setTimeout(() => {
    delete clients[from];
    twilioClient.messages.create({
      from: whatsappFrom,
      to: from,
      body: `⌛ Hemos cerrado la sesión por inactividad. ${name ? `Gracias por su tiempo, ${name}. ` : ''}Si desea retomar la conversación, por favor, escríbanos nuevamente.`
    });
  }, 120000);
};

const notify = (asunto, client, from) => {
  twilioClient.messages.create({
    body: `📌 ${asunto}\nNombre: ${client.name || 'No registrado'}\nWhatsApp: ${from}\nFecha: ${new Date().toLocaleDateString('es-PE')}\nHora: ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`,
    from: whatsappFrom,
    to: notifyTo
  });
};

const exitSession = (client, from, twiml) => {
  const name = client.name || '';
  delete clients[from];
  twiml.message(`👋 Gracias por su visita${name ? ', ' + name : ''}. Si necesita más información, no dude en escribirnos nuevamente.`);
};

app.post('/webhook', (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const from = req.body.From;
  const msg = req.body.Body.trim();

  if (!clients[from]) {
    clients[from] = { step: 'ask_name', name: '' };
    twiml.message('👋 ¡Bienvenido/a al Colegio Santa María de Chincha! Antes de continuar, por favor indíquenos su nombre completo. 📝');
    setInactivityTimeout(from);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    return res.end(twiml.toString());
  }

  const client = clients[from];
  setInactivityTimeout(from, client.name);

  if (client.step === 'ask_name') {
    client.name = msg;
    client.step = MENUS.MAIN;
    twiml.message(`¡Gracias, ${client.name}!`);
    twiml.message(showMainMenu());
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    return res.end(twiml.toString());
  }

  if (msg === '0') {
    exitSession(client, from, twiml);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    return res.end(twiml.toString());
  }

  switch (client.step) {
    case MENUS.MAIN:
      switch (msg) {
        case '1': client.step = MENUS.ADMISIONES; twiml.message(`🔸 Admisiones:\n1: Información general\n2: Inicial\n3: Primaria\n4: Secundaria\n5: Proceso de admisión\n6: Solicitar visita guiada\n7: Iniciar proceso de admisión\n8: Conversar con asesora\n0: Terminar sesión`); break;
        case '2': client.step = MENUS.ACADEMICO; twiml.message(`📓 Gestiones Académicas:\n1: Solicitud de documentos\n2: Horarios de clase\n3: Información específica\n4: Dirección\n5: Coordinación académica\n0: Terminar sesión`); break;
        case '3': client.step = MENUS.ADMINISTRATIVO; twiml.message(`📃 Gestiones Administrativas:\n1: Cuentas, bancos, proveedores\n2: Bolsa de trabajo\n3: Conversar con Secretaría\n0: Terminar sesión`); break;
        case '4': client.step = MENUS.CAPELLANIA; twiml.message(`⛪ Capellanía:\n1: Misas y ceremonias\n2: Conversar con la Capellanía\n0: Terminar sesión`); break;
        default:
          twiml.message('❗ La opción ingresada no es válida. Por favor, seleccione una opción del menú.');
          twiml.message(showMainMenu());
      }
      break;

    case MENUS.ADMISIONES:
      switch (msg) {
        case '1': twiml.message('📄 Puede descargar el brochure informativo desde el siguiente enlace: https://shorturl.at/5TfA2'); break;
        case '2': twiml.message('📄 Brochure del nivel Inicial: https://shorturl.at/3RH23'); break;
        case '3': twiml.message('📄 Brochure del nivel Primaria: https://shorturl.at/C3prm'); break;
        case '4': twiml.message('📄 Brochure del nivel Secundaria: https://shorturl.at/oLXVf'); break;
        case '5': twiml.message('🌐 Información sobre el proceso de admisión: https://santamariachincha.edu.pe/admision/'); break;
        case '6': twiml.message('✅ Hemos registrado su solicitud para una visita guiada. En breve nos pondremos en contacto con usted.'); notify('Solicitud de visita guiada', client, from); break;
        case '7': twiml.message('📝 Puede iniciar el proceso de inscripción ingresando a: https://colegiosantamaria.sieweb.com.pe/admision/#/inscripcion'); break;
        case '8': twiml.message('📨 Lo derivaremos con una asesora de admisión para una atención personalizada.'); notify('Solicitud de atención personal con asesora de admisión', client, from); break;
        case '0': exitSession(client, from, twiml); break;
        default: twiml.message('❗ La opción ingresada no es válida.'); break;
      }
      break;

    case MENUS.ACADEMICO:
      switch (msg) {
        case '1': twiml.message('📬 Puede enviar su solicitud a info@santamariachincha.edu.pe con el asunto: "Solicitud de documentos".'); break;
        case '2': twiml.message('📅 Los horarios de clase están disponibles en: https://santamariachincha.edu.pe/'); break;
        case '3': twiml.message('ℹ️ Lo derivaremos al área correspondiente para una atención adecuada.'); notify('Solicitud de información académica', client, from); break;
        case '4': twiml.message('🎓 Dirección general: mmoron@santamariachincha.edu.pe'); break;
        case '5': twiml.message('📚 Coordinación académica: whurtado@santamariachincha.edu.pe'); break;
        case '0': exitSession(client, from, twiml); break;
        default: twiml.message('❗ La opción ingresada no es válida.'); break;
      }
      break;

    case MENUS.ADMINISTRATIVO:
      switch (msg) {
        case '1': twiml.message('📧 Para consultas administrativas, escriba a ovaldivia@santamariachincha.edu.pe'); break;
        case '2': twiml.message('📩 Envíe su currículum a postula@santamaria.edu.pe, indicando el cargo o área en el asunto.'); break;
        case '3': twiml.message('📨 Lo pondremos en contacto con la Secretaría del colegio.'); notify('Solicitud de contacto con Secretaría', client, from); break;
        case '0': exitSession(client, from, twiml); break;
        default: twiml.message('❗ La opción ingresada no es válida.'); break;
      }
      break;

    case MENUS.CAPELLANIA:
      switch (msg) {
        case '1': twiml.message('🙏 Puede consultar los horarios de misas y celebraciones en: https://wa.link/09hexw'); break;
        case '2': twiml.message('📨 Lo pondremos en contacto con la Capellanía para una atención espiritual.'); notify('Solicitud de contacto con Capellanía', client, from); break;
        case '0': exitSession(client, from, twiml); break;
        default: twiml.message('❗ La opción ingresada no es válida.'); break;
      }
      break;

    default:
      client.step = MENUS.MAIN;
      twiml.message(showMainMenu());
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(port, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${port}`);
});
