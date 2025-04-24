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
  ESPERA_MENSAJE: 'espera_mensaje'
};

const showMainMenu = () => (
  `👋 ¿Cómo podemos ayudarle hoy? Seleccione una opción:\n` +
  `1: Admisiones\n` +
  `2: Gestiones Académicas\n` +
  `3: Gestiones Administrativas\n` +
  `4: Capellanía\n` +
  `0: Terminar sesión`
);

const showSubMenu = (menu) => {
  switch (menu) {
    case MENUS.ADMISIONES:
      return `🔸 Admisiones:\n1: Información general\n2: Inicial\n3: Primaria\n4: Secundaria\n5: Proceso de admisión\n6: Solicitar visita guiada\n7: Iniciar proceso de admisión\n8: Conversar con asesora\n0: Volver al menú principal`;
    case MENUS.ACADEMICO:
      return `📘 Académico:\n1: Solicitud de documentos\n2: Horarios de clase\n3: Información específica\n4: Dirección\n5: Coordinación académica\n0: Volver al menú principal`;
    case MENUS.ADMINISTRATIVO:
      return `📋 Administrativo:\n1: Cuentas y proveedores\n2: Bolsa de trabajo\n3: Conversar con Secretaría\n0: Volver al menú principal`;
    case MENUS.CAPELLANIA:
      return `⛪ Capellanía:\n1: Misas y ceremonias\n2: Conversar con la Capellanía\n0: Volver al menú principal`;
    default:
      return '';
  }
};

const getFechaHoraLocal = () => {
  const fecha = new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
  const hora = new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' });
  return { fecha, hora };
};

const enviarNotificacionDetallada = (client, from, menu, subopcion, mensajeEspecifico = '') => {
  const { fecha, hora } = getFechaHoraLocal();
  const texto = `📌 NUEVA SOLICITUD\nFecha: ${fecha}\nHora: ${hora}\nNombre: ${client.name || 'No registrado'}\nWhatsApp: ${from}\nMenú: ${menu} > ${subopcion}\nMensaje: ${mensajeEspecifico}`;
  twilioClient.messages.create({ from: whatsappFrom, to: notifyTo, body: texto });
};

const setInactivityTimeout = (from, name = '') => {
  clearTimeout(activityTimeouts[from]);
  activityTimeouts[from] = setTimeout(() => {
    delete clients[from];
    twilioClient.messages.create({
      from: whatsappFrom,
      to: from,
      body: `⌛ La sesión ha finalizado por inactividad. Muchas gracias, ${name || 'estimado usuario'}, por su interés en el Colegio Santa María.`
    });
  }, 120000);
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
    clients[from] = { step: 'ask_name', name: '', awaiting: false };
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
    client.awaiting = false;
    twiml.message(`¡Gracias, ${client.name}!\n\n${showMainMenu()}`);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    return res.end(twiml.toString());
  }

  if (client.step === MENUS.ESPERA_MENSAJE && client.pendienteMenu && client.pendienteSubmenu) {
    enviarNotificacionDetallada(client, from, client.pendienteMenu, client.pendienteSubmenu, msg);
    twiml.message('✅ Hemos recibido su mensaje y se ha derivado al área correspondiente.');
    client.step = MENUS.MAIN;
    twiml.message(showMainMenu());
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    return res.end(twiml.toString());
  }

  if (msg === '0') {
    if (client.step !== MENUS.MAIN) {
      client.step = MENUS.MAIN;
      twiml.message(showMainMenu());
    } else {
      exitSession(client, from, twiml);
    }
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    return res.end(twiml.toString());
  }

  if (client.step === MENUS.MAIN) {
    switch (msg) {
      case '1': client.step = MENUS.ADMISIONES; twiml.message(showSubMenu(MENUS.ADMISIONES)); break;
      case '2': client.step = MENUS.ACADEMICO; twiml.message(showSubMenu(MENUS.ACADEMICO)); break;
      case '3': client.step = MENUS.ADMINISTRATIVO; twiml.message(showSubMenu(MENUS.ADMINISTRATIVO)); break;
      case '4': client.step = MENUS.CAPELLANIA; twiml.message(showSubMenu(MENUS.CAPELLANIA)); break;
      default:
        twiml.message('❗ La opción ingresada no es válida. Por favor, seleccione una opción del menú.');
        twiml.message(showMainMenu());
    }
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    return res.end(twiml.toString());
  }

  const redirigirConMensaje = (menu, subopcion) => {
    client.step = MENUS.ESPERA_MENSAJE;
    client.pendienteMenu = menu;
    client.pendienteSubmenu = subopcion;
    twiml.message('Por favor, escriba el mensaje con su consulta o solicitud:');
  };

  switch (client.step) {
    case MENUS.ADMISIONES:
      if (msg === '6') redirigirConMensaje('Admisiones', 'Solicitar visita guiada');
      else if (msg === '8') redirigirConMensaje('Admisiones', 'Conversar con asesora');
      else twiml.message('Gracias por su interés. Para más opciones, seleccione nuevamente.');
      break;

    case MENUS.ACADEMICO:
      if (msg === '3') redirigirConMensaje('Académico', 'Información específica');
      else twiml.message('Gracias por su interés. Para más opciones, seleccione nuevamente.');
      break;

    case MENUS.ADMINISTRATIVO:
      if (msg === '3') redirigirConMensaje('Administrativo', 'Conversar con Secretaría');
      else twiml.message('Gracias por su interés. Para más opciones, seleccione nuevamente.');
      break;

    case MENUS.CAPELLANIA:
      if (msg === '2') redirigirConMensaje('Capellanía', 'Conversar con la Capellanía');
      else twiml.message('Gracias por su interés. Para más opciones, seleccione nuevamente.');
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
