# 🤖 Bot de Atención por WhatsApp - Colegio Santa María de Chincha

Este proyecto implementa un agente virtual para WhatsApp usando Twilio y Node.js, destinado a brindar atención automática a las familias del Colegio Santa María de Chincha.

## ✨ Funcionalidades principales

- Solicita el nombre del usuario al iniciar.
- Muestra el menú principal de opciones automáticamente después de recibir el nombre.
- Permite navegar por submenús como Admisiones, Capellanía, Gestiones Académicas y Administrativas.
- Notifica automáticamente a la administración según la opción elegida.
- Cierra la sesión tras 2 minutos de inactividad, con mensaje personalizado.

## 🚀 Requisitos

- Node.js 16+
- Cuenta Twilio con número habilitado para WhatsApp
- `.env` configurado

## 🔧 Instalación

```bash
git clone https://github.com/tucuenta/santamaria-whatsapp-bot.git
cd santamaria-whatsapp-bot
npm install
