const { createClient } = require("redis");

let client = null;
let ready = false;

async function initRedis() {
  if (client || !process.env.REDIS_URL) {
    return client;
  }

  client = createClient({ url: process.env.REDIS_URL });

  client.on("ready", () => {
    ready = true;
    console.log("✅ Redis connected");
  });

  client.on("end", () => {
    ready = false;
    console.warn("⚠️ Redis connection ended");
  });

  client.on("error", (error) => {
    ready = false;
    console.error("❌ Redis error:", error.message);
  });

  try {
    await client.connect();
  } catch (error) {
    console.error("⚠️ Redis unavailable, continuing without cache:", error.message);
  }

  return client;
}

function isRedisReady() {
  return ready && client;
}

async function redisGetJson(key) {
  if (!isRedisReady()) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function redisSetJsonEx(key, seconds, value) {
  if (!isRedisReady()) return;
  try {
    await client.setEx(key, seconds, JSON.stringify(value));
  } catch {
    // Best-effort cache writes should not affect request flow.
  }
}

async function redisDeleteByPattern(pattern) {
  if (!isRedisReady()) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length) {
      await client.del(keys);
    }
  } catch {
    // Best-effort cache invalidation.
  }
}

module.exports = {
  initRedis,
  isRedisReady,
  redisGetJson,
  redisSetJsonEx,
  redisDeleteByPattern,
};
