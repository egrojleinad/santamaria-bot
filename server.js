// Author: Jorge Colmenares
// Santamaría Bot - Submenús + Temporizadores + Notificación externa

const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const app = express();
const port = 4040;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER;
const notifyTo = 'whatsapp:+50672297263';
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
9: Terminar sesión

📝 En cualquier momento, escribe 0 para volver al Menú Principal.`
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
9: Volver al Menú

📝 En cualquier momento, escribe 0 para volver al Menú Principal.`
);

const academicoMenu = () => (
  `📓 Gestiones Académicas:
1: Solicitud de documentos
2: Horarios de clase
3: Solicitar información específica
4: Consulta a la Dirección
5: Consulta a la Coordinación académica
6: Volver al Menú

📝 En cualquier momento, escribe 0 para volver al Menú Principal.`
);

const administrativoMenu = () => (
  `📃 Gestiones Administrativas:
1: Cuentas, Bancos, Proveedores
2: Bolsa de trabajo
3: Volver al Menú

📝 En cualquier momento, escribE 0 para volver al Menú Principal.`
);

const capellaniaMenu = () => (
  `⛪ Capellanía:
1: Preguntar por Misas y ceremonias litúrgicas
2: Volver al Menú

📝 En cualquier momento, escribe 0 para volver al Menú Principal.`
);

const returnToMainMenu = (client, twiml) => {
  client.step = 'menu';
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

  if (!clients[from]) {
    clients[from] = { step: 'ask_name', name: '' };
    twiml.message('👋 ¡Hola! Soy SantaMaría, tu asistente virtual. ¿Puedes decirme tu nombre completo antes de continuar?');
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

  if (msg === '0') {
    returnToMainMenu(client, twiml);
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
        twiml.message('👋 ¡Gracias por tu visita! Esperamos haberte ayudado. Visita nuestra web para más información: www.santamariachincha.edu.pe');
      } else {
        twiml.message('❗ Opción no válida. Por favor elige una opción del menú.');
        twiml.message(showMainMenu());
      }
      break;

    case 'submenu_1':
      switch (msg) {
        case '1': delayMessage(twiml, '📄 Puede descargar aquí el brochure informativo para tener toda lo necesario sobre las Admisiones: https://shorturl.at/5TfA2', admisionesMenu); break;
        case '2': delayMessage(twiml, '📄 Descarga aquí el Folleto de Inicial: https://shorturl.at/3RH23', admisionesMenu); break;
        case '3': delayMessage(twiml, '📄 Descarga aquí el Folleto de Primaria: https://shorturl.at/C3prm', admisionesMenu); break;
        case '4': delayMessage(twiml, '📄 Descarga aquí el Folleto de Secundaria: https://shorturl.at/oLXVf', admisionesMenu); break;
        case '5': delayMessage(twiml, '🌐 Conoce el Proceso de admisión en esta sección de nuestra web: https://santamariachincha.edu.pe/admision/', admisionesMenu); break;
        case '6':
          twiml.message('✅ Hemos registrado tu solicitud para una visita guiada. Pronto te contactaremos.');
          twilioClient.messages.create({
            body: `📌 Una persona solicita una visita guiada\nNombre: ${client.name || 'No especificado'}\nWhatsApp: ${from}`,
            from: whatsappFrom,
            to: notifyTo
          });
          twiml.message(admisionesMenu());
          break;
        case '7': delayMessage(twiml, '📝 Regístrate aquí para iniciar el Proceso de Admisión: https://colegiosantamaria.sieweb.com.pe/admision/#/inscripcion', admisionesMenu); break;
        case '8':
          delayMessage(twiml, '📨 Te pondremos en contacto con una Asesora de Admisión.', admisionesMenu);
          twilioClient.messages.create({
            body: `📌 Tenemos una persona que solicita atención personal en WhatsApp.\nNombre: ${client.name || 'No especificado'}\nNúmero: ${from}`,
            from: whatsappFrom,
            to: notifyTo
          });
          break;
        case '9': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Admisiones.');
          twiml.message(admisionesMenu());
      }
      break;

    case 'submenu_2':
      switch (msg) {
        case '1': delayMessage(twiml, '📬 Escriba su solicitud a info@santamariachincha.edu.pe con asunto: "Solicitud de documentos"', academicoMenu); break;
        case '2': delayMessage(twiml, '📅 Conoce los Horarios de clase descargando este documento: https://santamariachincha.edu.pe/', academicoMenu); break;
        case '3': delayMessage(twiml, 'ℹ️ Escriba a este correo acastilla@santamariachincha.edu.pe con el asunto: "Consultas"', academicoMenu); break;
        case '4': delayMessage(twiml, '🎓 Comunícate con nuestra directora Sra. Marlene Morón a este correo: mmoron@santamariachincha.edu.pe', academicoMenu); break;
        case '5': delayMessage(twiml, '📚 Comunícate con nuestro Coordinador Académico Sr. Wilber Hurtado a este correo: whurtado@santamariachincha.edu.pe', academicoMenu); break;
        case '6': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Académicas.');
          twiml.message(academicoMenu());
      }
      break;

    case 'submenu_3':
      switch (msg) {
        case '1': delayMessage(twiml, '📧 Escriba a nuestro director administrativo Sr. Óscar Valdivia a este correo ovaldivia@santamariachincha.edu.pe señalando la consulta en el asunto', administrativoMenu); break;
        case '2': delayMessage(twiml, '📩 Por favor, envíe su CV a postula@santamaria.edu.pe con el área o rol en el asunto', administrativoMenu); break;
        case '3': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Administrativas.');
          twiml.message(administrativoMenu());
      }
      break;

    case 'submenu_4':
      switch (msg) {
        case '1': delayMessage(twiml, '🙏 Comunícate con el diácono Bernardo y pide Información sobre misas o sacramentos: https://wa.link/09hexw', capellaniaMenu); break;
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
