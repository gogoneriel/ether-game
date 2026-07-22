# hermes-game-agent

OpenRouter (**`z-ai/glm-5.2`**) analyst for Ether Game / Magnolia Arena.

## Local

```bash
cd server/hermes-game-agent
cp .env.example .env   # set AGENT_SECRET, OPENROUTER_API_KEY, Supabase
npm install
npm run build:knowledge
npm start
# → http://127.0.0.1:8080/healthz
```

Chat:

```bash
curl -s http://127.0.0.1:8080/agent/chat \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -H "content-type: application/json" \
  -d '{"message":"Summarize current duel rules","mode":"architect"}'
```

## Docker

```bash
docker compose up -d --build
```

Joins external network `liber-game_default` when present (Caddy `/agent/*`). Also publishes host `:8081`.

See [docs/hermes-game-agent.md](../../docs/hermes-game-agent.md).
