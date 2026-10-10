#!/usr/bin/env node
/**
 * Point the ElevenLabs agent at our custom LLM.
 *
 * Their agent is transport only: this tells it to call /api/agent/llm on
 * the deployed site for every turn, so the prompt, guards, tools and kill
 * switch are ours. ElevenLabs cannot reach localhost, so the URL must be
 * a deployed one.
 *
 * Run:  node scripts/configure-voice.mjs https://themotorhouse.vercel.app
 *
 * Reads ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID and AGENT_LLM_SECRET from
 * .env.local. The secret is stored in ElevenLabs' own secret store and
 * sent back to us as a bearer token on every call.
 */
import { readFileSync } from "node:fs";

const API = "https://api.elevenlabs.io/v1";

function env() {
  const out = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

const { ELEVENLABS_API_KEY: key, ELEVENLABS_AGENT_ID: agentId, AGENT_LLM_SECRET: secret } = env();
const base = process.argv[2];

if (!key || !agentId || !secret) {
  console.error("Missing ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID or AGENT_LLM_SECRET in .env.local");
  process.exit(1);
}
if (!base || !base.startsWith("https://")) {
  console.error("Usage: node scripts/configure-voice.mjs https://your-deployment");
  process.exit(1);
}

const headers = { "xi-api-key": key, "content-type": "application/json" };

async function main() {
  // 1. Store the shared secret in their secret store, or reuse it.
  const existing = await fetch(`${API}/convai/secrets`, { headers }).then((r) =>
    r.ok ? r.json() : { secrets: [] },
  );
  const NAME = "TMH_AGENT_LLM_SECRET";
  let secretId = (existing.secrets ?? []).find((s) => s.name === NAME)?.secret_id;

  if (!secretId) {
    const created = await fetch(`${API}/convai/secrets`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "new", name: NAME, value: secret }),
    });
    const body = await created.json().catch(() => ({}));
    if (!created.ok) {
      console.error("Could not create the secret:", created.status, JSON.stringify(body).slice(0, 300));
      process.exit(1);
    }
    secretId = body.secret_id;
    console.log(`Created secret ${NAME}`);
  } else {
    console.log(`Reusing secret ${NAME}`);
  }

  // 2. Point the agent's LLM at us.
  const llmUrl = `${base.replace(/\/$/, "")}/api/agent/llm`;
  const patch = await fetch(`${API}/convai/agents/${agentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            llm: "custom-llm",
            custom_llm: {
              url: llmUrl,
              model_id: "the-motor-house",
              api_key: { secret_id: secretId },
            },
          },
        },
      },
    }),
  });

  const detail = await patch.text();
  if (!patch.ok) {
    console.error("Could not update the agent:", patch.status, detail.slice(0, 400));
    process.exit(1);
  }

  console.log(`Agent ${agentId} now calls ${llmUrl}`);

  // 3. Read it back rather than trusting the write.
  const check = await fetch(`${API}/convai/agents/${agentId}`, { headers }).then((r) => r.json());
  const configured = check?.conversation_config?.agent?.prompt;
  console.log("Verified:", JSON.stringify({ llm: configured?.llm, url: configured?.custom_llm?.url }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
