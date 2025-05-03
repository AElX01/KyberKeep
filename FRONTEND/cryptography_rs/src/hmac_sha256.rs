use wasm_bindgen::prelude::*;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use hex::{decode, encode};

type HmacSha256 = Hmac<Sha256>;


#[wasm_bindgen]
pub fn generate_auth_hmac(master_key_hex: &str, message: &str) -> Result<String, JsValue> {
    let master_key = decode(master_key_hex).map_err(|_| JsValue::from_str("E"))?;

    let mut mac = HmacSha256::new_from_slice(&master_key).map_err(|_| JsValue::from_str("E"))?;

    mac.update(message.as_bytes());

    let result = mac.finalize();
    let code_bytes = result.into_bytes();

    Ok(encode(code_bytes))
}