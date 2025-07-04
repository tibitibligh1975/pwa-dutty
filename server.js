const express = require("express");
const webpush = require("web-push");
const path = require("path");
const fs = require("fs");
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

// Arquivo para persistir subscrições
const SUBSCRIPTION_FILE = path.join(__dirname, "subscriptions.json");

// Carregar subscrições do arquivo
function loadSubscriptions() {
  try {
    if (fs.existsSync(SUBSCRIPTION_FILE)) {
      const data = fs.readFileSync(SUBSCRIPTION_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    logDebug("Erro ao carregar subscrições:", error);
  }
  return [];
}

// Salvar subscrições no arquivo
function saveSubscriptions(subscriptions) {
  try {
    fs.writeFileSync(SUBSCRIPTION_FILE, JSON.stringify(subscriptions, null, 2));
    logDebug("Subscrições salvas com sucesso");
  } catch (error) {
    logDebug("Erro ao salvar subscrições:", error);
  }
}

// Array para armazenar múltiplas subscrições
let subscriptions = loadSubscriptions();

// Log para debug
function logDebug(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Função para limpar subscrições inválidas
function removeInvalidSubscription(invalidSubscription) {
  subscriptions = subscriptions.filter(
    (sub) => sub.endpoint !== invalidSubscription.endpoint
  );
  saveSubscriptions(subscriptions);
  logDebug("Subscrição inválida removida:", invalidSubscription.endpoint);
}

// Função para testar se uma subscrição ainda é válida
async function testSubscription(subscription) {
  try {
    const testPayload = JSON.stringify({
      title: "Teste de Validação",
      body: "Verificando se a subscrição ainda está ativa",
      silent: true, // Notificação silenciosa para não incomodar
    });

    await webpush.sendNotification(subscription, testPayload);
    return true;
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 413) {
      // Subscrição expirada ou inválida
      removeInvalidSubscription(subscription);
      return false;
    }
    logDebug("Erro ao testar subscrição:", error);
    return false;
  }
}

// Verificar e limpar subscrições inválidas periodicamente (a cada 6 horas)
setInterval(async () => {
  logDebug("Iniciando verificação de subscrições...");
  const validSubscriptions = [];

  for (const subscription of subscriptions) {
    const isValid = await testSubscription(subscription);
    if (isValid) {
      validSubscriptions.push(subscription);
    }
  }

  if (validSubscriptions.length !== subscriptions.length) {
    subscriptions = validSubscriptions;
    saveSubscriptions(subscriptions);
    logDebug(`Limpeza concluída. Subscrições ativas: ${subscriptions.length}`);
  }
}, 6 * 60 * 60 * 1000); // 6 horas

app.get("/api/vapid-public-key", (req, res) => {
  logDebug("Chave VAPID pública solicitada");
  res.send(vapidKeys.publicKey);
});

// Endpoint para verificar status da subscrição
app.get("/api/subscription-status", (req, res) => {
  logDebug(`Status das subscrições: ${subscriptions.length} ativas`);
  res.json({
    activeSubscriptions: subscriptions.length,
    hasSubscriptions: subscriptions.length > 0,
  });
});

app.post("/api/subscribe", (req, res) => {
  const newSubscription = req.body;
  logDebug("Nova subscrição recebida:", newSubscription);

  // Verificar se a subscrição já existe
  const existingIndex = subscriptions.findIndex(
    (sub) => sub.endpoint === newSubscription.endpoint
  );

  if (existingIndex !== -1) {
    // Atualizar subscrição existente
    subscriptions[existingIndex] = newSubscription;
    logDebug("Subscrição atualizada");
  } else {
    // Adicionar nova subscrição
    subscriptions.push(newSubscription);
    logDebug("Nova subscrição adicionada");
  }

  // Salvar no arquivo
  saveSubscriptions(subscriptions);

  // Teste imediato da subscrição
  const testPayload = JSON.stringify({
    title: "Teste de Conexão",
    body: "Sua conexão para notificações está funcionando!",
  });

  webpush
    .sendNotification(newSubscription, testPayload)
    .then(() => {
      logDebug("Notificação de teste enviada com sucesso");
      res
        .status(201)
        .json({ message: "Subscrição registrada e testada com sucesso" });
    })
    .catch((error) => {
      logDebug("Erro ao enviar notificação de teste:", error);
      if (error.statusCode === 410) {
        removeInvalidSubscription(newSubscription);
      }
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

    // Verifica se há subscrições ativas
    if (subscriptions.length === 0) {
      logDebug("Erro: Nenhuma subscrição encontrada");
      return res.status(400).json({ error: "Nenhuma subscrição encontrada" });
    }

    logDebug(`Enviando para ${subscriptions.length} subscrições`);

    const comissao = (data.result / 100).toFixed(2).replace(".", ",");

    // Só enviar notificação se a venda for aprovada
    if (data.status === "completed") {
      const payload = JSON.stringify({
        title: `Venda Aprovada 🔥`,
        body: `Sua comissão » R$ ${comissao}`,
      });

      logDebug("Tentando enviar notificação com payload:", payload);

      // Enviar para todas as subscrições ativas
      const sendPromises = subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(subscription, payload);
          logDebug("Notificação enviada para:", subscription.endpoint);
          return { success: true, subscription };
        } catch (pushError) {
          logDebug("Erro ao enviar push:", pushError);
          if (pushError.statusCode === 410) {
            removeInvalidSubscription(subscription);
          }
          return { success: false, subscription, error: pushError };
        }
      });

      const results = await Promise.all(sendPromises);
      const successful = results.filter((r) => r.success).length;

      logDebug(`Notificações enviadas: ${successful}/${subscriptions.length}`);
      res.status(200).send("OK");
    } else {
      // Se não for aprovada, apenas retorna OK sem enviar notificação
      res.status(200).send("OK");
    }
  } catch (err) {
    logDebug("Erro no webhook:", err);
    res.status(500).send("Erro interno");
  }
});

// Rota para enviar notificação manualmente (para testes)
app.get("/api/send-notification", async (req, res) => {
  if (subscriptions.length === 0) {
    logDebug("Erro: Tentativa de envio manual sem subscrições");
    return res.status(400).json({ error: "Nenhuma subscrição encontrada" });
  }

  const payload = JSON.stringify({
    title: "Duttyon",
    body: "Notificação manual enviada com sucesso!",
  });

  logDebug("Enviando notificação manual:", { payload });

  try {
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
        return { success: true };
      } catch (error) {
        if (error.statusCode === 410) {
          removeInvalidSubscription(subscription);
        }
        return { success: false, error };
      }
    });

    const results = await Promise.all(sendPromises);
    const successful = results.filter((r) => r.success).length;

    logDebug(
      `Notificações manuais enviadas: ${successful}/${subscriptions.length}`
    );
    res.json({ success: true, sent: successful, total: subscriptions.length });
  } catch (error) {
    logDebug("Erro ao enviar notificações manuais:", error);
    res.status(500).json({ error: "Erro ao enviar notificações" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logDebug(`Servidor rodando na porta ${PORT}`);
  logDebug(`Subscrições carregadas: ${subscriptions.length}`);
});
