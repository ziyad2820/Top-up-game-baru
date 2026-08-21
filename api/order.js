import { nanoid } from "nanoid";
import supabase from "../lib/supabase.js";
import { setCors } from "../lib/cors.js";
import { PRODUCTS } from "../lib/products.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { product_id, customer_no } = req.body;
  if (!product_id || !customer_no) {
    return res.status(400).json({ error: "product_id dan customer_no wajib diisi" });
  }
  const product = PRODUCTS[product_id];
  if (!product) {
    return res.status(400).json({ error: "Produk tidak ditemukan" });
  }

  const ref_id = `TOPUP-${nanoid(10)}`;
  const { data, error } = await supabase
    .from("orders")
    .insert({
      ref_id,
      product_id,
      buyer_sku_code: product.buyer_sku_code,
      customer_no,
      price: product.price,
      status: "menunggu_konfirmasi",
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: "Gagal membuat order" });
  }

  res.status(200).json(data);
}
