import express from "express";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;

// Only allow Roblox domains
const ALLOWED_HOSTS = new Set([
  "catalog.roblox.com",
  "inventory.roblox.com",
  "games.roblox.com",
  "apis.roblox.com"
]);

// In-memory cache (for production you can use Redis or similar)
const cache = new Map();

// Simple rate limiter to prevent abuse
const limiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 20, // max 20 requests per 10 seconds per IP
  message: "Too many requests, slow down."
});
app.use(limiter);

// Fetch with retry and exponential backoff
async function fetchWithRetry(url, retries = 3, delay = 300) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "RobloxProxy/1.0",
          "Accept": "*/*"
        },
        timeout: 5000 // 5s timeout
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      } else {
        return await res.text();
      }
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1))); // exponential backoff
    }
  }
}

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url");

  try {
    const parsed = new URL(targetUrl);
    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return res.status(403).send("Domain not allowed");
    }

    // Return cached response if available
    if (cache.has(targetUrl)) {
      console.log(`Cache hit: ${targetUrl}`);
      const cachedData = cache.get(targetUrl);
      return res.send(typeof cachedData === "string" ? cachedData : JSON.stringify(cachedData));
    }

    // Fetch from Roblox
    const data = await fetchWithRetry(targetUrl);

    // Cache for 30-60 seconds (adjust as needed)
    cache.set(targetUrl, data);
    setTimeout(() => cache.delete(targetUrl), 60000);

    console.log(`Fetched: ${targetUrl}`);
    res.send(typeof data === "string" ? data : JSON.stringify(data));

  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy error");
  }
});

app.listen(PORT, () => {
  console.log(`Roblox proxy listening on port ${PORT}`);
});
