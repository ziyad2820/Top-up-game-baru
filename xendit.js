import axios from "axios";

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;

const authHeader = {
  headers: {
    Authorization: "Basic " + Buffer.from(`${XENDIT_SECRET_KEY}:`).toString("base64"),
    "Content-Type": "application/json",
  },
};

export async function createQRIS({ external_id, amount }) {
  const { data } = await axios.post(
    "https://api.xendit.co/qr_codes",
    {
      external_id,
      type: "DYNAMIC",
      currency: "IDR",
      amount,
    },
    authHeader
  );

  return data;
}
