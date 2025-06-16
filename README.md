# PWA de Teste com Notificações Push

Este é um PWA simples para testar notificações push no iPhone.

## Configuração

1. Primeiro, instale as dependências:

```bash
npm install
```

2. Gere suas próprias chaves VAPID:

```bash
npx web-push generate-vapid-keys
```

3. Substitua as chaves VAPID no arquivo `server.js` com as suas chaves geradas e atualize o email.

4. Inicie o servidor:

```bash
npm start
```

5. Acesse a aplicação em `http://localhost:3000`

## Uso no iPhone

1. Abra o Safari e acesse a URL do seu servidor
2. Toque no ícone de compartilhamento
3. Selecione "Adicionar à Tela de Início"
4. Dê um nome ao atalho e confirme
5. Abra o app pela tela inicial
6. Clique em "Ativar Notificações" para permitir notificações push

## Testando Notificações

Para testar o envio de notificações manualmente, acesse:
`http://localhost:3000/api/send-notification`

## Observações

- Certifique-se de que seu servidor está acessível via HTTPS para produção
- Para desenvolvimento local, o HTTP funcionará
- As notificações push no iOS têm algumas limitações em comparação com Android
