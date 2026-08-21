import supabase from "../../../lib/supabase.js";
import { setCors } from "../../../lib/cors.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { ref_id } = req.query;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("ref_id", ref_id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Order tidak ditemukan" });
  }

  res.status(200).json(data);
}
