import axios from "axios";
import crypto from "crypto";

const DIGIFLAZZ_USERNAME = process.env.DIGIFLAZZ_USERNAME;
const DIGIFLAZZ_API_KEY = process.env.DIGIFLAZZ_API_KEY;

function buildSign(ref_id) {
  const raw = `${DIGIFLAZZ_USERNAME}${DIGIFLAZZ_API_KEY}${ref_id}`;
  return crypto.createHash("md5").update(raw).digest("hex");
}

export async function requestTopup({ buyer_sku_code, customer_no, ref_id }) {
  const sign = buildSign(ref_id);

  const { data } = await axios.post("https://api.digiflazz.com/v1/transaction", {
    username: DIGIFLAZZ_USERNAME,
    buyer_sku_code,
    customer_no,
    ref_id,
    sign,
  });

  return data.data;
}

export async function checkTopupStatus({ buyer_sku_code, customer_no, ref_id }) {
  return requestTopup({ buyer_sku_code, customer_no, ref_id });
}
