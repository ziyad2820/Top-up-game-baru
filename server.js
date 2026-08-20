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
  "ml-86": { label: "86 Diamond Mobile Legends", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 20000 },
  "ml-172": { label: "172 Diamond Mobile Legends", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 40000 },
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
