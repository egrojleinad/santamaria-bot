// Santamaría Bot - Submenús + Temporizadores + Contenido completo (correlativo)

const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const app = express();
const port = 4040;

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
  `🟣 Admisiones:
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

const setTimers = (from, client, twiml) => {
  if (client.inactivityTimer) clearTimeout(client.inactivityTimer);
  if (client.menuTimer) clearTimeout(client.menuTimer);

  client.inactivityTimer = setTimeout(() => {
    delete clients[from];
    console.log(`⏰ Sesión finalizada por inactividad: ${from}`);
  }, 60000);
};

app.post('/webhook', (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const from = req.body.From;
  const msg = req.body.Body.trim();

  if (!clients[from]) {
    clients[from] = { step: 'menu' };
    twiml.message('👋 ¡Hola! Soy SantaMaría, tu asistente virtual.');
    twiml.message(showMainMenu());
    setTimers(from, clients[from], twiml);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  }

  const client = clients[from];
  setTimers(from, client, twiml);

  const delayedReply = (msg1, menu) => {
    twiml.message(msg1);
    setTimeout(() => {
      twiml.message(menu);
      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(twiml.toString());
    }, 3000);
  };

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
        case '1': delayedReply('📄 Puede descargar aquí el brochure informativo: https://shorturl.at/5TfA2', admisionesMenu()); return;
        case '2': delayedReply('📄 Inicial: https://shorturl.at/3RH23', admisionesMenu()); return;
        case '3': delayedReply('📄 Primaria: https://shorturl.at/C3prm', admisionesMenu()); return;
        case '4': delayedReply('📄 Secundaria: https://shorturl.at/oLXVf', admisionesMenu()); return;
        case '5': delayedReply('🌐 Proceso de admisión: https://santamariachincha.edu.pe/admision/', admisionesMenu()); return;
        case '6':
        case '8': delayedReply('🧑‍💼 Te conectaremos con una asesora de Admisión. Si no recibís respuesta pronto, llamá al 920 411 270', admisionesMenu()); return;
        case '7': delayedReply('📝 Registrate aquí para iniciar el proceso: https://colegiosantamaria.sieweb.com.pe/admision/#/inscripcion', admisionesMenu()); return;
        case '9': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Admisiones.');
          twiml.message(admisionesMenu());
      }
      break;

    case 'submenu_2':
      switch (msg) {
        case '1': delayedReply('📨 Escriba su solicitud a info@santamariachincha.edu.pe con asunto: "Solicitud de documentos"', academicoMenu()); return;
        case '2': delayedReply('📅 Horarios de clase: https://santamariachincha.edu.pe/', academicoMenu()); return;
        case '3': delayedReply('ℹ️ Escriba a acastilla@santamariachincha.edu.pe con asunto: "Consultas"', academicoMenu()); return;
        case '4': delayedReply('🎓 Dirección general: mmoron@santamariachincha.edu.pe', academicoMenu()); return;
        case '5': delayedReply('📚 Coordinación académica: whurtado@santamariachincha.edu.pe', academicoMenu()); return;
        case '6': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Académicas.');
          twiml.message(academicoMenu());
      }
      break;

    case 'submenu_3':
      switch (msg) {
        case '1': delayedReply('📧 Escriba a ovaldivia@santamariachincha.edu.pe para consultas administrativas', administrativoMenu()); return;
        case '2': delayedReply('📬 Envíe su CV a postula@santamaria.edu.pe con el área o rol en el asunto', administrativoMenu()); return;
        case '3': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Administrativas.');
          twiml.message(administrativoMenu());
      }
      break;

    case 'submenu_4':
      switch (msg) {
        case '1': delayedReply('🙏 Información sobre misas: https://wa.link/09hexw', capellaniaMenu()); return;
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
