const express = require("express");
const webpush = require("web-push");
const path = require("path");
const app = express();

// Middleware para processar JSON
app.use(express.json());
app.use(express.static(path.join(__dirname, "/")));

// Gerar VAPID keys usando webpush.generateVAPIDKeys() e substituir estas chaves
const vapidKeys = {
  publicKey:
    "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
  privateKey: "UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls",
};

webpush.setVapidDetails(
  "mailto:seu-email@exemplo.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

let subscription;

app.get("/api/vapid-public-key", (req, res) => {
  res.send(vapidKeys.publicKey);
});

app.post("/api/subscribe", (req, res) => {
  subscription = req.body;
  res.status(201).json({});

  // Enviar uma notificação de teste
  const payload = JSON.stringify({
    title: "PWA Test",
    body: "Notificação de teste enviada com sucesso!",
  });

  webpush
    .sendNotification(subscription, payload)
    .catch((error) => console.error(error));
});

// Rota para enviar notificação manualmente (para testes)
app.get("/api/send-notification", (req, res) => {
  if (!subscription) {
    return res.status(400).json({ error: "Nenhuma subscrição encontrada" });
  }

  const payload = JSON.stringify({
    title: "PWA Test",
    body: "Notificação manual enviada com sucesso!",
  });

  webpush
    .sendNotification(subscription, payload)
    .then(() => {
      res.json({ success: true });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: "Erro ao enviar notificação" });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
