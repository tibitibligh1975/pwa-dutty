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

  // Teste imediato da subscrição
  const testPayload = JSON.stringify({
    title: "Teste de Conexão",
    body: "Sua conexão para notificações está funcionando!",
  });

  webpush
    .sendNotification(subscription, testPayload)
    .then(() => {
      logDebug("Notificação de teste enviada com sucesso");
      res
        .status(201)
        .json({ message: "Subscrição registrada e testada com sucesso" });
    })
    .catch((error) => {
      logDebug("Erro ao enviar notificação de teste:", error);
      res
        .status(201)
        .json({ message: "Subscrição registrada, mas teste falhou" });
    });
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

    logDebug("Subscrição atual:", subscription);

    const comissao = (data.result / 100).toFixed(2).replace(".", ",");

    // Define o título e emoji baseado no status
    let titulo = "Nova Venda";
    let emoji = "🔄";

    if (data.status === "completed") {
      titulo = "Venda Aprovada";
      emoji = "🔥";
    } else if (data.status === "pending") {
      titulo = "Venda Pendente";
      emoji = "⏳";
    }

    const payload = JSON.stringify({
      title: `${titulo} ${emoji}`,
      body: `Sua comissão » R$ ${comissao}`,
    });

    logDebug("Tentando enviar notificação com payload:", payload);

    try {
      await webpush.sendNotification(subscription, payload);
      logDebug("Notificação enviada com sucesso");
      res.status(200).send("OK");
    } catch (pushError) {
      logDebug("Erro ao enviar push:", pushError);
      // Se a subscrição estiver inválida, vamos limpá-la
      if (pushError.statusCode === 410) {
        logDebug("Subscrição expirada ou inválida, limpando...");
        subscription = null;
      }
      throw pushError;
    }
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
