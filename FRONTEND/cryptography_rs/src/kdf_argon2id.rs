use wasm_bindgen::prelude::*;
use getrandom::getrandom;
use argon2::{Argon2, Params, Algorithm, Version};

// KDF function using Argon2id
#[wasm_bindgen]
pub fn derive_key_from_master_password(password: &str, decode_input: u8) -> Result<String, JsValue> {
    let mut salt = [0u8; 16];
    let mut output_key = [0u8; 32];

    getrandom(&mut salt).map_err(|_| JsValue::from_str("E"))?; //random 128-bit salt generation

    let params = Params::new(65536, 4, 4, None).map_err(|_| JsValue::from_str("E"))?; // allocates 64MB iterating 4 times over it with 4 thread (OWASP recommended), WASM might not support threading, just for escallability 
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let password_bytes = if decode_input == 1 {
        hex::decode(password).map_err(|_| JsValue::from_str("E"))?
    } else {
        password.as_bytes().to_vec()
    };

    argon2.hash_password_into(&password_bytes, &salt, &mut output_key).map_err(|_| JsValue::from_str("E"))?;

    // salt and hash are saved in hex format
    let hex_salt = hex::encode(salt);
    let hex_output = hex::encode(output_key);

    Ok(format!("{}:{}", hex_salt, hex_output)) // final result is in the format 'salt:hash' for simplicity
}

// KDF function with defined salt
#[wasm_bindgen]
pub fn derive_key_from_master_password_with_defined_salt(password: &str, salt: &str) -> Result<String, JsValue> {
    let salt_bytes = hex::decode(salt).map_err(|_| JsValue::from_str("E"))?;
    let mut output_key = [0u8; 32];

    let params = Params::new(65536, 4, 4, None).map_err(|_| JsValue::from_str("E"))?; // allocates 64MB iterating 4 times over it with 4 thread (OWASP recommended), WASM might not support threading, just for escallability 
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let password_bytes = password.as_bytes().to_vec();
    argon2.hash_password_into(&password_bytes, &salt_bytes, &mut output_key).map_err(|_| JsValue::from_str("E"))?;

    let hex_output = hex::encode(output_key);

    Ok(hex_output) // final result is in the format 'salt:hash' for simplicity
}