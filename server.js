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
  MAIN: 'main',
  ASK_NAME: 'ask_name',
  ADMISIONES: 'admision',
  ACADEMICO: 'academico',
  ADMINISTRATIVO: 'administrativo',
  CAPELLANIA: 'capellania',
  MENSAJE_PERSONAL: 'mensaje'
};

const showMainMenu = () =>
  `👋 ¿Cómo podemos ayudarle hoy? Seleccione una opción:\n1: Admisiones\n2: Gestiones Académicas\n3: Gestiones Administrativas\n4: Capellanía\n0: Terminar sesión`;

const submenus = {
  admision: `🔸 Admisiones:\n1: Información general\n2: Inicial\n3: Primaria\n4: Secundaria\n5: Proceso de admisión\n6: Solicitar visita guiada\n7: Iniciar proceso de admisión\n8: Conversar con asesora\n0: Volver al menú principal`,
  academico: `📘 Académico:\n1: Solicitud de documentos\n2: Horarios de clase\n3: Información específica\n4: Dirección\n5: Coordinación académica\n0: Volver al menú principal`,
  administrativo: `📋 Administrativo:\n1: Cuentas y proveedores\n2: Bolsa de trabajo\n3: Conversar con Secretaría\n0: Volver al menú principal`,
  capellania: `⛪ Capellanía:\n1: Misas y ceremonias\n2: Conversar con la Capellanía\n0: Volver al menú principal`
};

const getHoraLima = () =>
  new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });

const getFechaLima = () =>
  new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' });

const enviarNotificacion = (client, from, menu, opcion, mensaje) => {
  const fecha = getFechaLima();
  const hora = getHoraLima();
  const texto = `📌 NUEVA SOLICITUD\nFecha: ${fecha}\nHora: ${hora}\nNombre: ${client.name}\nWhatsApp: ${from}\nMenú: ${menu} > ${opcion}\nMensaje: ${mensaje}`;
  twilioClient.messages.create({ from: whatsappFrom, to: notifyTo, body: texto });
};

const setInactividad = (from, name) => {
  clearTimeout(activityTimeouts[from]);
  activityTimeouts[from] = setTimeout(() => {
    delete clients[from];
    twilioClient.messages.create({
      from: whatsappFrom,
      to: from,
      body: `⌛ La sesión ha finalizado por inactividad. Muchas gracias, ${name || 'usuario'}, por contactarnos.`
    });
  }, 120000);
};

app.post('/webhook', (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const from = req.body.From;
  const msg = req.body.Body.trim();

  if (!clients[from]) {
    clients[from] = { step: MENUS.ASK_NAME };
    twiml.message('👋 ¡Bienvenido/a al Colegio Santa María de Chincha! ¿Podría indicarnos su nombre completo? 📝');
    setInactividad(from);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    return res.end(twiml.toString());
  }

  const client = clients[from];
  setInactividad(from, client.name);

  if (client.step === MENUS.ASK_NAME) {
    client.name = msg;
    client.step = MENUS.MAIN;
    twiml.message(`¡Gracias, ${client.name}!\n\n${showMainMenu()}`);
    return res.end(twiml.toString());
  }  

  if (client.awaitingMenu) {
    client.awaitingMenu = false;
    twiml.message(showMainMenu());
    return res.end(twiml.toString());
  }

  if (client.step === MENUS.MENSAJE_PERSONAL && client.contexto) {
    const { menu, opcion } = client.contexto;
    enviarNotificacion(client, from, menu, opcion, msg);
    twiml.message('✅ Su mensaje ha sido recibido y enviado al área correspondiente.');
    client.step = MENUS.MAIN;
    client.awaitingMenu = true;
    return res.end(twiml.toString());
  }

  if (msg === '0') {
    if (client.step !== MENUS.MAIN) {
      client.step = MENUS.MAIN;
      client.awaitingMenu = true;
    } else {
      delete clients[from];
      twiml.message(`👋 Gracias por su visita, ${client.name}. ¡Hasta pronto!`);
    }
    return res.end(twiml.toString());
  }

  const derivar = (menu, opcion) => {
    client.step = MENUS.MENSAJE_PERSONAL;
    client.contexto = { menu, opcion };
    twiml.message('Por favor, escriba el mensaje con su consulta o solicitud:');
  };

  if (client.step === MENUS.MAIN) {
    switch (msg) {
      case '1': client.step = MENUS.ADMISIONES; twiml.message(submenus.admision); break;
      case '2': client.step = MENUS.ACADEMICO; twiml.message(submenus.academico); break;
      case '3': client.step = MENUS.ADMINISTRATIVO; twiml.message(submenus.administrativo); break;
      case '4': client.step = MENUS.CAPELLANIA; twiml.message(submenus.capellania); break;
      default:
        client.awaitingMenu = true;
        twiml.message('❗ Opción no válida. Intente nuevamente.');
    }
    return res.end(twiml.toString());
  }

  // SUBMENÚS Y DERIVACIÓN
  const respuestasNormales = {
    admision: {
      '1': '📄 Puede descargar el brochure general desde: https://shorturl.at/5TfA2',
      '2': '📄 Brochure Inicial: https://shorturl.at/3RH23',
      '3': '📄 Brochure Primaria: https://shorturl.at/C3prm',
      '4': '📄 Brochure Secundaria: https://shorturl.at/oLXVf',
      '5': '🌐 Proceso de admisión: https://santamariachincha.edu.pe/admision/',
      '7': '📝 Inicie el proceso aquí: https://colegiosantamaria.sieweb.com.pe/admision/#/inscripcion'
    },
    academico: {
      '1': '✉️ Escriba a info@santamariachincha.edu.pe con asunto: "Solicitud de documentos".',
      '2': '🕒 Horarios de clase en: https://santamariachincha.edu.pe/',
      '4': '🎓 Dirección: mmoron@santamariachincha.edu.pe',
      '5': '📚 Coordinación: whurtado@santamariachincha.edu.pe'
    },
    administrativo: {
      '1': '📧 ovaldivia@santamariachincha.edu.pe (consultas de cuentas).',
      '2': '📄 Envíe su CV a postula@santamaria.edu.pe con asunto: "Bolsa de trabajo".'
    },
    capellania: {
      '1': '🙏 Misas y ceremonias: https://wa.link/09hexw'
    }
  };

  const handleSubmenu = (tipo) => {
    const normal = respuestasNormales[tipo]?.[msg];
    if (normal) {
      twiml.message(normal);
      client.awaitingMenu = true;
    } else if (tipo === 'admision' && msg === '6') {
      derivar('Admisiones', 'Solicitar visita guiada');
    } else if (tipo === 'admision' && msg === '8') {
      derivar('Admisiones', 'Conversar con asesora');
    } else if (tipo === 'academico' && msg === '3') {
      derivar('Académico', 'Información específica');
    } else if (tipo === 'administrativo' && msg === '3') {
      derivar('Administrativo', 'Conversar con Secretaría');
    } else if (tipo === 'capellania' && msg === '2') {
      derivar('Capellanía', 'Conversar con la Capellanía');
    } else if (msg === '0') {
      client.step = MENUS.MAIN;
      client.awaitingMenu = true;
    } else {
      twiml.message('❗ Opción no válida.');
      client.awaitingMenu = true;
    }
  };

  switch (client.step) {
    case MENUS.ADMISIONES: handleSubmenu('admision'); break;
    case MENUS.ACADEMICO: handleSubmenu('academico'); break;
    case MENUS.ADMINISTRATIVO: handleSubmenu('administrativo'); break;
    case MENUS.CAPELLANIA: handleSubmenu('capellania'); break;
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(port, () => {
  console.log(`✅ Bot Colegio Santa María corriendo en http://localhost:${port}`);
});
