// index.js

require('dotenv').config();

// Importación de dependencias necesarias
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const nodemailer = require('nodemailer')
const { Boom } = require('@hapi/boom')
const readline = require('readline')

// Almacena la información de cada cliente en memoria
let clients = {}

// Función principal para iniciar el bot
async function startBot() {
  // Manejo de autenticación de sesión con Baileys
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const { version } = await fetchLatestBaileysVersion()

  // Crear el socket de WhatsApp
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true // Muestra el código QR para vincular WhatsApp
  })

  // Guarda las credenciales cuando se actualizan
  sock.ev.on('creds.update', saveCreds)

  // Maneja los mensajes entrantes
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return // Solo procesar notificaciones nuevas
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return // Ignorar mensajes vacíos o enviados por el bot

    const sender = msg.key.remoteJid // Número del remitente
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text // Texto del mensaje

    // Si el cliente es nuevo, crear su estado y enviar mensaje de bienvenida
    if (!clients[sender]) {
      clients[sender] = {
        step: 'welcome',
        name: '',
        phone: '',
        email: '',
        subject: '',
      }

      // Mostrar opciones del menú principal
      await sock.sendMessage(sender, { text: "👋 ¡Hola! Soy SantaMaría, tu asistente virtual. ¿Cómo podemos ayudarte hoy?\n\nOpciones:\n0: Registro inicial\n1: Admisiones\n2: Gestiones académicas\n3: Gestiones administrativas\n4: Recepción" })
      return
    }

    const client = clients[sender] // Obtener los datos del cliente actual

    // Flujo principal basado en el paso actual del cliente
    switch (client.step) {
      // MENÚ PRINCIPAL
      case 'welcome':
        if (text === '0') {
          client.step = 'kyc_name'
          await sock.sendMessage(sender, { text: 'Por favor, indique su nombre y apellido:' })
        } else if (text === '1') {
          client.step = 'admission_name'
          await sock.sendMessage(sender, { text: 'Estamos encantados de poder brindarle información sobre la propuesta educativa del Santa María.\n\nPor favor, indique su nombre y apellido:' })
        } else if (text === '2') {
          client.step = 'academic_menu'
          await sock.sendMessage(sender, { text: 'Seleccione una opción:\n2.1: Dirección General\n2.2: Coordinación Académica' })
        } else if (text === '3') {
          client.step = 'admin_email'
          await sock.sendMessage(sender, { text: `Estimad@ ${client.name || ''}, por favor indique su correo electrónico:` })
        } else if (text === '4') {
          // Compartir contacto de recepción
          await sock.sendMessage(sender, { text: `Estimad@ ${client.name || ''}, puede comunicarse con Recepción al 📞 +51 264315 anexo 1 o por WhatsApp: https://wa.me/51934160100` })
          client.step = 'welcome'
        } else {
          await sock.sendMessage(sender, { text: 'Opción no válida. Por favor, seleccione una opción válida.' })
        }
        break

      // FLUJO DE REGISTRO INICIAL (KYC)
      case 'kyc_name':
        client.name = text
        client.step = 'welcome'
        await sock.sendMessage(sender, { text: `Gracias ${client.name}. ¿En qué puedo ayudarte hoy?\n\n0: Registro inicial\n1: Admisiones\n2: Gestiones académicas\n3: Gestiones administrativas\n4: Recepción` })
        break

      // FLUJO DE ADMISIONES
      case 'admission_name':
        client.name = text
        client.step = 'admission_phone'
        await sock.sendMessage(sender, { text: 'Indique su número celular:' })
        break

      case 'admission_phone':
        client.phone = text
        client.step = 'admission_email'
        await sock.sendMessage(sender, { text: 'Indique su correo electrónico:' })
        break

      case 'admission_email':
        client.email = text
        // Enviar correo con los datos del lead
        await sendEmail('acastilla@santamariachincha.edu.pe', 'Nuevo lead de admisión', `Nombre: ${client.name}\nTeléfono: ${client.phone}\nEmail: ${client.email}`)
        // Confirmación y recursos
        await sock.sendMessage(sender, {
          text: `¡Gracias ${client.name}! Si desea más información puede visitar https://santamariachincha.edu.pe/ o directamente: https://santamariachincha.edu.pe/admision/\n\nTambién puede comunicarse con la oficina de admisión al 📞 +51 264315 anexo 2`
        })
        client.step = 'welcome'
        break

      // SUBMENÚ GESTIONES ACADÉMICAS
      case 'academic_menu':
        if (text === '2.1') {
          client.step = 'dir_email'
          await sock.sendMessage(sender, { text: `Estimad@ ${client.name}, indique su correo electrónico:` })
        } else if (text === '2.2') {
          client.step = 'coord_email'
          await sock.sendMessage(sender, { text: `Estimad@ ${client.name}, indique su correo electrónico:` })
        } else {
          await sock.sendMessage(sender, { text: 'Opción no válida. Por favor, seleccione 2.1 o 2.2.' })
        }
        break

      // FLUJO DIRECCIÓN GENERAL
      case 'dir_email':
        client.email = text
        client.step = 'dir_subject'
        await sock.sendMessage(sender, { text: 'Indique su consulta o asunto:' })
        break

      case 'dir_subject':
        client.subject = text
        await sendEmail('mmoron@santamariachincha.edu.pe', 'Consulta Dirección General', `Nombre: ${client.name}\nEmail: ${client.email}\nAsunto: ${client.subject}`)
        await sock.sendMessage(sender, { text: 'Mensaje enviado. Recibirá una respuesta en su correo. Volviendo al menú principal...' })
        client.step = 'welcome'
        break

      // FLUJO COORDINACIÓN ACADÉMICA
      case 'coord_email':
        client.email = text
        client.step = 'coord_subject'
        await sock.sendMessage(sender, { text: 'Indique su consulta o asunto:' })
        break

      case 'coord_subject':
        client.subject = text
        await sendEmail('whurtado@santamariachincha.edu.pe', 'Consulta Coordinación Académica', `Nombre: ${client.name}\nEmail: ${client.email}\nAsunto: ${client.subject}`)
        await sock.sendMessage(sender, { text: 'Mensaje enviado. Recibirá una respuesta en su correo. Volviendo al menú principal...' })
        client.step = 'welcome'
        break

      // FLUJO ADMINISTRACIÓN GENERAL
      case 'admin_email':
        client.email = text
        client.step = 'admin_subject'
        await sock.sendMessage(sender, { text: 'Indique su consulta o asunto:' })
        break

      case 'admin_subject':
        client.subject = text
        await sendEmail('info@santamariachincha.edu.pe', 'Consulta Administración General', `Nombre: ${client.name}\nEmail: ${client.email}\nAsunto: ${client.subject}`)
        await sock.sendMessage(sender, { text: 'Mensaje enviado. Recibirá una respuesta en su correo. Volviendo al menú principal...' })
        client.step = 'welcome'
        break
    }
  })
}

// Inicia el bot
startBot()

// Función para enviar correos electrónicos usando Nodemailer
async function sendEmail(to, subject, text) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
        }
          
    })
  }

  await transporter.sendMail({
    from: 'SantaMaría Bot <tucorreo@gmail.com>',
    to,
    subject,
    text
  })
