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

// Log para debug
function logDebug(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

app.get("/api/vapid-public-key", (req, res) => {
  logDebug("Chave VAPID pública solicitada");
  res.send(vapidKeys.publicKey);
});

app.post("/api/subscribe", (req, res) => {
  subscription = req.body;
  logDebug("Nova subscrição recebida:", subscription);
  res.status(201).json({ message: "Subscrição registrada com sucesso" });
});

// Webhook para receber notificações do gateway
app.post("/webhook", async (req, res) => {
  try {
    logDebug("Webhook recebido:", req.body);

    const data = req.body;

    // Verifica se há uma subscrição ativa
    if (!subscription) {
      logDebug("Erro: Nenhuma subscrição encontrada");
      return res.status(400).json({ error: "Nenhuma subscrição encontrada" });
    }

    // Verifica se o status é "completed"
    if (data.status !== "completed") {
      logDebug(`Pedido ignorado - Status: ${data.status}`);
      return res.status(200).send(`Ignorado: status é '${data.status}'`);
    }

    const comissao = (data.result / 100).toFixed(2).replace(".", ",");
    const nomeCliente = data.customer?.name || "Cliente";

    const payload = JSON.stringify({
      title: "Nova Venda! 🎉",
      body: `${nomeCliente} - Comissão: R$ ${comissao}\nEmail: ${
        data.customer?.email || "N/A"
      }`,
    });

    logDebug("Enviando notificação:", { payload });
    await webpush.sendNotification(subscription, payload);
    logDebug("Notificação enviada com sucesso");
    res.status(200).send("OK");
  } catch (err) {
    logDebug("Erro no webhook:", err);
    res.status(500).send("Erro interno");
  }
});

// Rota para enviar notificação manualmente (para testes)
app.get("/api/send-notification", (req, res) => {
  if (!subscription) {
    logDebug("Erro: Tentativa de envio manual sem subscrição");
    return res.status(400).json({ error: "Nenhuma subscrição encontrada" });
  }

  const payload = JSON.stringify({
    title: "Checkoutinho",
    body: "Notificação manual enviada com sucesso!",
  });

  logDebug("Enviando notificação manual:", { payload });
  webpush
    .sendNotification(subscription, payload)
    .then(() => {
      logDebug("Notificação manual enviada com sucesso");
      res.json({ success: true });
    })
    .catch((error) => {
      logDebug("Erro ao enviar notificação manual:", error);
      res.status(500).json({ error: "Erro ao enviar notificação" });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logDebug(`Servidor rodando na porta ${PORT}`);
});
