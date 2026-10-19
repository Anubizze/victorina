import { getResults } from "../lib/votes.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Метод не поддерживается" });
  }

  try {
    const url = new URL(req.url, "http://localhost");
    const data = await getResults(url.searchParams.get("voterId"));
    return res.status(200).json(data);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: "Не удалось загрузить топ" });
  }
}
