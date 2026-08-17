import "dotenv/config";
import express from "express";
import { nanoid } from "nanoid";
import { createOrder, getOrder, updateOrder, listOrders } from "./db.js";
import { requestTopup } from "./digiflazz.js";
import { createQRIS } from "./xendit.js";

const app = express();
app.use(express.json());

const PRODUCTS = {
  "ml-86": { label: "86 Diamond Mobile Legends", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 20000 },
  "ml-172": { label: "172 Diamond Mobile Legends", buyer_sku_code: "GANTI_DENGAN_SKU_ASLI", price: 40000 },
};

app.post("/api/order", async (req, res) => {
  try {
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
      status: "menunggu_pembayaran",
      created_at: new Date().toISOString(),
    });

    const qris = await createQRIS({
      external_id: ref_id,
      amount: product.price,
    });

    updateOrder(ref_id, { xendit_qr_id: qris.id });

    res.json({
      ref_id,
      qr_string: qris.qr_string,
      amount: product.price,
      status: order.status,
    });
  } catch (err) {
    console.error("Gagal membuat order:", err.response?.data || err.message);
    res.status(500).json({ error: "Gagal membuat order, coba lagi" });
  }
});

app.get("/api/order/:ref_id", (req, res) => {
  const order = getOrder(req.params.ref_id);
  if (!order) return res.status(404).json({ error: "Order tidak ditemukan" });
  res.json(order);
});

app.post("/api/webhook/xendit", async (req, res) => {
  try {
    const token = req.headers["x-callback-token"];
    if (token !== process.env.XENDIT_WEBHOOK_TOKEN) {
      return res.status(401).json({ error: "Token tidak valid" });
    }

    const event = req.body;
    res.status(200).json({ received: true });

    if (event.status !== "SUCCEEDED") return;

    const ref_id = event.external_id;
    const order = getOrder(ref_id);
    if (!order) {
      console.error("Order tidak ditemukan untuk external_id:", ref_id);
      return;
    }

    updateOrder(ref_id, { status: "sudah_dibayar" });

    const result = await requestTopup({
      buyer_sku_code: order.buyer_sku_code,
      customer_no: order.customer_no,
      ref_id: order.ref_id,
    });

    if (result.status === "Sukses") {
      updateOrder(ref_id, { status: "selesai", sn: result.sn });
      console.log(`Order ${ref_id} SELESAI. SN: ${result.sn}`);
    } else if (result.status === "Gagal") {
      updateOrder(ref_id, { status: "gagal", message: result.message });
      console.error(`Order ${ref_id} GAGAL: ${result.message}`);
    } else {
      updateOrder(ref_id, { status: "diproses_digiflazz" });
      console.log(`Order ${ref_id} masih diproses Digiflazz, menunggu webhook...`);
    }
  } catch (err) {
    console.error("Error webhook Xendit:", err.response?.data || err.message);
  }
});

app.post("/api/webhook/digiflazz", (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: "Payload tidak valid" });

    const { ref_id, status, sn, message } = data;
    const order = getOrder(ref_id);

    if (!order) {
      console.error("Order tidak ditemukan untuk ref_id:", ref_id);
      return res.status(200).json({ received: true });
    }

    if (status === "Sukses") {
      updateOrder(ref_id, { status: "selesai", sn });
      console.log(`(Webhook) Order ${ref_id} SELESAI. SN: ${sn}`);
    } else if (status === "Gagal") {
      updateOrder(ref_id, { status: "gagal", message });
      console.error(`(Webhook) Order ${ref_id} GAGAL: ${message}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Error webhook Digiflazz:", err.message);
    res.status(200).json({ received: true });
  }
});

app.get("/api/orders", (req, res) => {
  res.json(listOrders());
});

app.get("/", (req, res) => {
  res.send("Backend top up game aktif.");
});

app.get("/api/jam", (req, res) => {
  const sekarang = new Date().toLocaleString("id-ID",{ timeZone: "Asia/Jakarta" });
  res.json({ jam_sekarang: sekarang });
});

app.get("/api/test-digiflazz", async (req, res) => {
  try {
    const { requestTopup } = await import("./digiflazz.js");
    const result = await requestTopup({
      buyer_sku_code: "xld10",
      customer_no: "087800001230",
      ref_id: "test1",
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
