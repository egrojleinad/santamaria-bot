// Santamaría Bot - Submenús + Temporizadores + Contenido completo (con corrección de texto multilínea)

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
1.0 Información general
1.1 Inicial
1.2 Primaria
1.3 Secundaria
1.4 Proceso de admisión
1.5 Solicitar visita guiada
1.6 Iniciar proceso de admisión
1.7 Conversar con asesora
1.8 Volver al Menú`
);

const academicoMenu = () => (
  `📘 Gestiones Académicas:
2.0 Solicitud de documentos
2.1 Horarios de clase
2.2 Información específica
2.3 Dirección
2.4 Coordinación académica
2.5 Volver al Menú`
);

const administrativoMenu = () => (
  `📙 Gestiones Administrativas:
3.0 Cuentas, bancos, proveedores
3.1 Bolsa de trabajo
3.2 Volver al Menú`
);

const capellaniaMenu = () => (
  `⛪ Capellanía:
4.0 Misas y ceremonias
4.1 Volver al Menú`
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

  client.menuTimer = setTimeout(() => {
    if (clients[from]) {
      clients[from].step = 'menu';
    }
  }, 8000);
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
        case '1.0': twiml.message('📄 Puede descargar aquí el brochure informativo: https://shorturl.at/5TfA2'); break;
        case '1.1': twiml.message('📄 Inicial: https://shorturl.at/3RH23'); break;
        case '1.2': twiml.message('📄 Primaria: https://shorturl.at/C3prm'); break;
        case '1.3': twiml.message('📄 Secundaria: https://shorturl.at/oLXVf'); break;
        case '1.4': twiml.message('🌐 Proceso de admisión: https://santamariachincha.edu.pe/admision/'); break;
        case '1.5':
        case '1.7':
          twiml.message('🧑‍💼 Te conectaremos con una asesora de Admisión. Si no recibís respuesta pronto, llamá al 920 411 270');
          break;
        case '1.6':
          twiml.message('📝 Registrate aquí para iniciar el proceso: https://colegiosantamaria.sieweb.com.pe/admision/#/inscripcion');
          break;
        case '1.8': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Admisiones.');
          twiml.message(admisionesMenu());
      }
      break;

    case 'submenu_2':
      switch (msg) {
        case '2.0':
          twiml.message('📨 Escriba su solicitud a info@santamariachincha.edu.pe con asunto: "Solicitud de documentos"');
          break;
        case '2.1':
          twiml.message('📅 Horarios de clase: https://santamariachincha.edu.pe/');
          break;
        case '2.2':
          twiml.message('ℹ️ Escriba a acastilla@santamariachincha.edu.pe con asunto: "Consultas"');
          break;
        case '2.3':
          twiml.message('🎓 Dirección general: mmoron@santamariachincha.edu.pe');
          break;
        case '2.4':
          twiml.message('📚 Coordinación académica: whurtado@santamariachincha.edu.pe');
          break;
        case '2.5': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Académicas.');
          twiml.message(academicoMenu());
      }
      break;

    case 'submenu_3':
      switch (msg) {
        case '3.0':
          twiml.message('📧 Escriba a ovaldivia@santamariachincha.edu.pe para consultas administrativas');
          break;
        case '3.1':
          twiml.message('📩 Envíe su CV a postula@santamaria.edu.pe con el área o rol en el asunto');
          break;
        case '3.2': returnToMainMenu(client, twiml); break;
        default:
          twiml.message('❗ Opción inválida en Administrativas.');
          twiml.message(administrativoMenu());
      }
      break;

    case 'submenu_4':
      switch (msg) {
        case '4.0':
          twiml.message('🙏 Información sobre misas: https://wa.link/09hexw');
          break;
        case '4.1': returnToMainMenu(client, twiml); break;
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
