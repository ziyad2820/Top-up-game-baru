// ============================================================
// PENYIMPANAN ORDER — VERSI SEDERHANA (IN-MEMORY)
// ============================================================
// PENTING: Ini BUKAN database sungguhan. Data akan HILANG setiap
// server di-restart. Ini cuma buat belajar & testing alur dulu.
// ============================================================

const orders = new Map();

export function createOrder(order) {
  orders.set(order.ref_id, order);
  return order;
}

export function getOrder(ref_id) {
  return orders.get(ref_id) || null;
}

export function updateOrder(ref_id, changes) {
  const existing = orders.get(ref_id);
  if (!existing) return null;
  const updated = { ...existing, ...changes };
  orders.set(ref_id, updated);
  return updated;
}

export function listOrders() {
  return Array.from(orders.values());
}
