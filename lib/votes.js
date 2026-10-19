import { Redis } from "@upstash/redis";
import roster from "../roster.json" with { type: "json" };
const memory = new Map();
const KEY = "victorina:votes";

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function redisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function isCandidate(klass, person) {
  return roster.some((group) => group.klass === klass && group.people.includes(person));
}

function choiceKey(klass, person) {
  return `${klass}|${person}`;
}

function parseChoice(value) {
  if (typeof value !== "string") return null;
  const index = value.indexOf("|");
  if (index === -1) return null;
  const klass = value.slice(0, index);
  const person = value.slice(index + 1);
  if (!isCandidate(klass, person)) return null;
  return { klass, person };
}

function validVoter(voterId) {
  return typeof voterId === "string" && /^[a-zA-Z0-9_-]{16,80}$/.test(voterId);
}

function buildTop(values) {
  const counts = new Map();
  for (const group of roster) {
    for (const person of group.people) {
      counts.set(choiceKey(group.klass, person), 0);
    }
  }
  for (const value of values) {
    const choice = parseChoice(value);
    if (!choice) continue;
    const key = choiceKey(choice.klass, choice.person);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const rows = [];
  for (const group of roster) {
    for (const person of group.people) {
      rows.push({
        klass: group.klass,
        person,
        votes: counts.get(choiceKey(group.klass, person)) || 0,
      });
    }
  }
  rows.sort((a, b) => b.votes - a.votes || a.person.localeCompare(b.person, "ru"));

  let rank = 0;
  let previous = null;
  return rows.map((row, index) => {
    if (row.votes !== previous) {
      rank = index + 1;
      previous = row.votes;
    }
    return { rank, ...row };
  });
}

async function readAll(client) {
  if (!client) return [...memory.values()];
  const all = await client.hgetall(KEY);
  return all ? Object.values(all) : [];
}

function payload(choice, values) {
  return {
    choice,
    total: values.filter((value) => parseChoice(value)).length,
    top: buildTop(values),
  };
}

export async function castVote(voterId, klass, person) {
  if (!validVoter(voterId)) throw fail(400, "Некорректный голос");
  if (!isCandidate(klass, person)) throw fail(400, "Такого участника нет");

  const client = redisClient();
  if (!client && process.env.VERCEL) {
    throw fail(503, "Хранилище голосов не подключено");
  }

  const value = choiceKey(klass, person);
  if (!client) memory.set(voterId, value);
  else await client.hset(KEY, { [voterId]: value });

  return payload({ klass, person }, await readAll(client));
}

export async function getResults(voterId) {
  if (!validVoter(voterId)) throw fail(400, "Некорректный голос");

  const client = redisClient();
  if (!client && process.env.VERCEL) {
    throw fail(503, "Хранилище голосов не подключено");
  }

  const raw = client ? await client.hget(KEY, voterId) : memory.get(voterId);
  const choice = parseChoice(raw);
  if (!choice) throw fail(404, "Сначала проголосуй");
  return payload(choice, await readAll(client));
}
