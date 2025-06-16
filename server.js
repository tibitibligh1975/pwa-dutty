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
});

// Webhook para receber notificações do gateway
app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;

    // Verifica se há uma subscrição ativa
    if (!subscription) {
      return res.status(400).json({ error: "Nenhuma subscrição encontrada" });
    }

    // Verifica se o status é "completed"
    if (data.status !== "completed") {
      return res.status(200).send("Ignorado: status não é 'completed'");
    }

    const comissao = (data.result / 100).toFixed(2).replace(".", ",");
    const payload = JSON.stringify({
      title: "Venda Realizada! 🎉",
      body: `Sua comissão » R$ ${comissao}`,
    });

    await webpush.sendNotification(subscription, payload);
    console.log("Notificação enviada:", payload);
    res.status(200).send("OK");
  } catch (err) {
    console.error("Erro:", err);
    res.status(500).send("Erro interno");
  }
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
