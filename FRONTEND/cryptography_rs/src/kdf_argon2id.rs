use wasm_bindgen::prelude::*;
use argon2::Argon2;


#[wasm_bindgen]
pub fn derive_key_from_master_password(password: &str) -> Result<String, JsValue> {
    let salt = b"sample salting";
    let mut output_key = [0u8; 32];

    Argon2::default().hash_password_into(password.as_bytes(), salt, &mut output_key)
    .map_err(|e| JsValue::from_str(&format!("Argon2 error: {:?}", e)))?;

    Ok(hex::encode(output_key))
}