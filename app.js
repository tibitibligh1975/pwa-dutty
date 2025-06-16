const messagesElement = document.getElementById("messages");
const subscribeButton = document.getElementById("subscribe");

function updateSubscriptionStatus(status) {
  messagesElement.innerHTML = `<p>${status}</p>`;
}

async function subscribeToPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;

    // Solicitar permissão de notificação
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Permissão de notificação negada");
    }

    // Gerar chaves VAPID no servidor (você precisará implementar isso)
    const response = await fetch("/api/vapid-public-key");
    const vapidPublicKey = await response.text();
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // Obter subscrição push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    // Enviar subscrição para o servidor
    await fetch("/api/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });

    updateSubscriptionStatus("Notificações ativadas com sucesso!");
    subscribeButton.disabled = true;
  } catch (error) {
    updateSubscriptionStatus(`Erro ao ativar notificações: ${error.message}`);
  }
}

// Função auxiliar para converter chave VAPID
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

subscribeButton.addEventListener("click", subscribeToPushNotifications);
