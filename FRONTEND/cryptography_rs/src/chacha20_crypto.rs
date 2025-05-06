use wasm_bindgen::prelude::*;
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    ChaCha20Poly1305, Nonce, Key
};
use getrandom::getrandom;
use hex::{decode, encode};


#[wasm_bindgen]
pub fn chacha20poly1305_encrypt(master_key_hex: &str, data: &str) -> Result<String, JsValue> {
    let key_bytes = decode(master_key_hex).map_err(|_| JsValue::from_str("E1"))?;
    let key = Key::from_slice(&key_bytes);
    let cipher = ChaCha20Poly1305::new(key);

    let mut nonce_bytes = [0u8; 12];
    getrandom(&mut nonce_bytes).map_err(|_| JsValue::from_str("E2"))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher.encrypt(nonce, data.as_bytes()).map_err(|_| JsValue::from_str("E3"))?;

    let mut output = nonce_bytes.to_vec();
    output.extend_from_slice(&ciphertext);
    Ok(encode(output))
}

#[wasm_bindgen]
pub fn chacha20poly1305_decrypt(master_key_hex: &str, encrypted_hex: &str) -> Result<String, JsValue> {
    let encrypted_bytes = decode(encrypted_hex).map_err(|_| JsValue::from_str("E1"))?;

    let (nonce_bytes, ciphertext_bytes) = encrypted_bytes.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let key_bytes = decode(master_key_hex).map_err(|_| JsValue::from_str("E2"))?;
    
    let key = Key::from_slice(&key_bytes);
    let cipher = ChaCha20Poly1305::new(key);

    let plaintext = cipher.decrypt(nonce, ciphertext_bytes).map_err(|_| JsValue::from_str("E3"))?;

    let result = String::from_utf8(plaintext).map_err(|_| JsValue::from_str("E"))?;
    Ok(result)
}

