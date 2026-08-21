import supabase from "../lib/supabase.js";
import { setCors } from "../lib/cors.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: "Gagal mengambil data order" });
  }

  res.status(200).json(data);
}
