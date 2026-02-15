const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express().use(bodyParser.json());

// Variables de entorno (las que pusiste en Railway)
const token = process.env.WHATSAPP_TOKEN;
const verify_token = process.env.VERIFY_TOKEN;
const phone_id = process.env.PHONE_NUMBER_ID;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Validación del Webhook (para Meta)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const challenge = req.query['hub.challenge'];
  const token_req = req.query['hub.verify_token'];

  if (mode && token_req) {
    if (mode === 'subscribe' && token_req === verify_token) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// 2. Recepción de mensajes y respuesta con IA
app.post('/webhook', async (req, res) => {
  if (req.body.object) {
    if (req.body.entry && req.body.entry[0].changes && req.body.entry[0].changes[0].value.messages) {
      const msg = req.body.entry[0].changes[0].value.messages[0];
      const from = msg.from; // Número del cliente
      const text = msg.text.body; // Mensaje que envió

      try {
        // Consultar a Gemini IA
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(text);
        const responseText = result.response.text();

        // Enviar respuesta a WhatsApp
        await axios({
          method: "POST",
          url: `https://graph.facebook.com/v18.0/${phone_id}/messages`,
          data: {
            messaging_product: "whatsapp",
            to: from,
            text: { body: responseText },
          },
          headers: { "Authorization": `Bearer ${token}` },
        });
      } catch (error) {
        console.error("Error:", error);
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Bot activo 🚀'));
