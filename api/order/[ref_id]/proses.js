import supabase from "../../../lib/supabase.js";
import { setCors } from "../../../lib/cors.js";
import { requestTopup } from "../../../lib/digiflazz.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { ref_id } = req.query;

  const { data: order, error: findError } = await supabase
    .from("orders")
    .select("*")
    .eq("ref_id", ref_id)
    .single();

  if (findError || !order) {
    return res.status(404).json({ error: "Order tidak ditemukan" });
  }
  if (order.status === "selesai") {
    return res.status(400).json({ error: "Order ini sudah pernah diproses" });
  }

  try {
    const result = await requestTopup({
      buyer_sku_code: order.buyer_sku_code,
      customer_no: order.customer_no,
      ref_id: order.ref_id,
    });

    let newStatus = "diproses_digiflazz";
    let extra = {};
    if (result.status === "Sukses") {
      newStatus = "selesai";
      extra.sn = result.sn;
    } else if (result.status === "Gagal") {
      newStatus = "gagal";
      extra.message = result.message;
    }

    const { data: updated } = await supabase
      .from("orders")
      .update({ status: newStatus, ...extra })
      .eq("ref_id", ref_id)
      .select()
      .single();

    res.status(200).json(updated);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Gagal memproses order ke Digiflazz" });
  }
}
