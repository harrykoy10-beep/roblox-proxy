import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Only allow Roblox domains
const ALLOWED_HOSTS = [
  "catalog.roblox.com",
  "inventory.roblox.com",
  "games.roblox.com",
  "apis.roblox.com"
];

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url");

  try {
    const parsed = new URL(targetUrl);
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return res.status(403).send("Domain not allowed");
    }

    const response = await fetch(targetUrl);
    const body = await response.text();
    res.send(body);

  } catch (err) {
    res.status(500).send("Proxy error");
  }
});

app.listen(PORT, () => {
  console.log(`Proxy listening on port ${PORT}`);
});
