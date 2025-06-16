const messagesElement = document.getElementById("messages");
const subscribeButton = document.getElementById("subscribe");

function updateSubscriptionStatus(status) {
  messagesElement.innerHTML = `<p>${status}</p>`;
}

async function checkNotificationSupport() {
  // Verifica se o navegador suporta service workers
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Workers não são suportados neste navegador");
  }

  // Verifica se o navegador suporta notificações push
  if (!("PushManager" in window)) {
    throw new Error("Notificações Push não são suportadas neste navegador");
  }

  // No iOS, precisamos verificar se window.Notification existe
  if (!("Notification" in window)) {
    throw new Error("Notificações não são suportadas neste dispositivo");
  }
}

async function subscribeToPushNotifications() {
  try {
    // Primeiro, verifica o suporte
    await checkNotificationSupport();

    const registration = await navigator.serviceWorker.ready;

    // Solicitar permissão de notificação
    const permission = await window.Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Permissão de notificação negada");
    }

    // Gerar chaves VAPID no servidor
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
    if (error.message.includes("não são suportadas")) {
      updateSubscriptionStatus(
        `Este dispositivo não suporta notificações push. Por favor, use um navegador compatível como Chrome ou Firefox em um computador ou dispositivo Android.`
      );
    } else {
      updateSubscriptionStatus(`Erro ao ativar notificações: ${error.message}`);
    }
    console.error("Erro detalhado:", error);
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

// Verifica o suporte assim que a página carrega
window.addEventListener("load", async () => {
  try {
    await checkNotificationSupport();
    subscribeButton.disabled = false;
  } catch (error) {
    updateSubscriptionStatus(
      `Este dispositivo não suporta notificações push. Por favor, use um navegador compatível como Chrome ou Firefox em um computador ou dispositivo Android.`
    );
    subscribeButton.disabled = true;
  }
});

subscribeButton.addEventListener("click", subscribeToPushNotifications);
