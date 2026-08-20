import "dotenv/config";
import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import { createOrder, getOrder, updateOrder, listOrders } from "./db.js";
import { requestTopup } from "./digiflazz.js";

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// DAFTAR PRODUK — GANTI SESUAI PRICE LIST DIGIFLAZZ ASLI KAMU
// ============================================================
const PRODUCTS = {
  // ===== MOBILE LEGENDS =====
  "ml-406": { label: "406 Diamond Mobile Legends", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 110000 },
  "ml-429": { label: "429 Diamond Mobile Legends", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 120000 },
  "ml-500": { label: "500 Diamond Mobile Legends", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 130000 },
  "ml-530": { label: "530 Diamond Mobile Legends", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 160000 },
  "ml-600": { label: "600 Diamond Mobile Legends", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 162000 },
  "ml-642": { label: "642 Diamond Mobile Legends", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 165000 },
  "ml-720": { label: "720 Diamond Mobile Legends", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 187000 },
  "ml-790": { label: "790 Diamond Mobile Legends", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 205000 },

  // ===== FREE FIRE =====
  "ff-25":   { label: "25 Diamond Free Fire",   buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 5000 },
  "ff-75":   { label: "75 Diamond Free Fire",   buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 10000 },
  "ff-150":  { label: "150 Diamond Free Fire",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 20000 },
  "ff-210":  { label: "210 Diamond Free Fire",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 30000 },
  "ff-300":  { label: "300 Diamond Free Fire",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 40000 },
  "ff-375":  { label: "375 Diamond Free Fire",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 50000 },
  "ff-770":  { label: "770 Diamond Free Fire",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 100000 },
  "ff-1145": { label: "1145 Diamond Free Fire", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 150000 },
  "ff-1580": { label: "1580 Diamond Free Fire", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 200000 },
  "ff-2720": { label: "2720 Diamond Free Fire", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 350000 },

  // ===== PUBG MOBILE =====
  "pubg-60":   { label: "60 UC PUBG Mobile",   buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 15000 },
  "pubg-325":  { label: "325 UC PUBG Mobile",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 75000 },
  "pubg-660":  { label: "660 UC PUBG Mobile",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 150000 },
  "pubg-1800": { label: "1800 UC PUBG Mobile", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 375000 },

  // ===== GENSHIN IMPACT =====
  "gi-60":   { label: "60 Crystal Genshin Impact",   buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 16000 },
  "gi-300":  { label: "300 Crystal Genshin Impact",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 79000 },
  "gi-980":  { label: "980 Crystal Genshin Impact",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 249000 },
  "gi-1980": { label: "1980 Crystal Genshin Impact", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 479000 },

  // ===== CALL OF DUTY MOBILE =====
  "codm-80":   { label: "80 CP Call of Duty Mobile",   buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 15000 },
  "codm-420":  { label: "420 CP Call of Duty Mobile",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 75000 },
  "codm-880":  { label: "880 CP Call of Duty Mobile",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 150000 },
  "codm-2400": { label: "2400 CP Call of Duty Mobile", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 375000 },

  // ===== HONKAI: STAR RAIL =====
  "hsr-60":   { label: "60 Oneiric Shard Honkai Star Rail",   buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 16000 },
  "hsr-300":  { label: "300 Oneiric Shard Honkai Star Rail",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 79000 },
  "hsr-980":  { label: "980 Oneiric Shard Honkai Star Rail",  buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 249000 },
  "hsr-1980": { label: "1980 Oneiric Shard Honkai Star Rail", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 479000 },
};


// ------------------------------------------------------------
// 1) BUAT ORDER BARU (tanpa QRIS otomatis, cukup simpan data)
// ------------------------------------------------------------
app.post("/api/order", (req, res) => {
  const { product_id, customer_no } = req.body;
  if (!product_id || !customer_no) {
    return res.status(400).json({ error: "product_id dan customer_no wajib diisi" });
  }
  const product = PRODUCTS[product_id];
  if (!product) {
    return res.status(400).json({ error: "Produk tidak ditemukan" });
  }

  const ref_id = `TOPUP-${nanoid(10)}`;
  const order = createOrder({
    ref_id,
    product_id,
    buyer_sku_code: product.buyer_sku_code,
    customer_no,
    price: product.price,
    status: "menunggu_konfirmasi", // menunggu admin cek pembayaran manual
    created_at: new Date().toISOString(),
  });

  res.json(order);
});

// ------------------------------------------------------------
// 2) LIST SEMUA ORDER (dipakai halaman admin)
// ------------------------------------------------------------
app.get("/api/orders", (req, res) => {
  res.json(listOrders());
});

// ------------------------------------------------------------
// 3) CEK STATUS 1 ORDER (dipakai frontend kalau perlu)
// ------------------------------------------------------------
app.get("/api/order/:ref_id", (req, res) => {
  const order = getOrder(req.params.ref_id);
  if (!order) return res.status(404).json({ error: "Order tidak ditemukan" });
  res.json(order);
});

// ------------------------------------------------------------
// 4) PROSES ORDER — DIPANGGIL ADMIN SETELAH CEK MANUAL PEMBAYARAN
// Ini yang bikin diamond kekirim OTOMATIS lewat Digiflazz
// ------------------------------------------------------------
app.post("/api/order/:ref_id/proses", async (req, res) => {
  const order = getOrder(req.params.ref_id);
  if (!order) return res.status(404).json({ error: "Order tidak ditemukan" });
  if (order.status === "selesai") {
    return res.status(400).json({ error: "Order ini sudah pernah diproses" });
  }

  try {
    const result = await requestTopup({
      buyer_sku_code: order.buyer_sku_code,
      customer_no: order.customer_no,
      ref_id: order.ref_id,
    });

    if (result.status === "Sukses") {
      const updated = updateOrder(order.ref_id, { status: "selesai", sn: result.sn });
      return res.json(updated);
    } else if (result.status === "Gagal") {
      const updated = updateOrder(order.ref_id, { status: "gagal", message: result.message });
      return res.json(updated);
    } else {
      const updated = updateOrder(order.ref_id, { status: "diproses_digiflazz" });
      return res.json(updated);
    }
  } catch (err) {
    console.error("Gagal proses order:", err.response?.data || err.message);
    res.status(500).json({ error: "Gagal memproses order ke Digiflazz" });
  }
});

app.get("/", (req, res) => {
  res.send("Backend top up game aktif.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
