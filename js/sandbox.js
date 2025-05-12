import initWasm, {
  derive_key_from_master_password,
  derive_key_from_master_password_with_defined_salt,
  generate_auth_hmac,
  chacha20poly1305_decrypt
} from '../cryptography_rs/pkg/cryptography_rs.js';

const wasmBinaryUrl = new URL(
  '../cryptography_rs/pkg/cryptography_rs_bg.wasm',
  import.meta.url
).href;

let wasmReady = false;
async function ensureWasm() {
  if (!wasmReady) {
    console.log('[Sandbox] initializing WASM via initWasm(', wasmBinaryUrl, ')');
    await initWasm(wasmBinaryUrl);
    wasmReady = true;
    console.log('[Sandbox] WASM module ready');
  }
}

window.addEventListener('message', async event => {
  const msg = event.data;
  console.log('[Sandbox] message received:', msg);

  try {
    // 1) INIT_WASM
    if (msg.type === 'INIT_WASM') {
      await ensureWasm();
      console.log('[Sandbox] ➡️ posting WASM_INITIALIZED');
      event.source?.postMessage({ type: 'WASM_INITIALIZED' }, event.origin);
      return;
    }

    // 2) Must have WASM ready
    if (!wasmReady) {
      throw new Error('WASM aún no inicializado');
    }

    // 3) DERIVE_KEYS_REGISTER
    if (msg.type === 'DERIVE_KEYS_REGISTER') {
      const pw   = msg.payload.masterPassword;
      const meta = derive_key_from_master_password(pw, 0);
      const salt = meta.slice(0, 32);
      const key  = meta.slice(33);
      const challenge = key + 'authentication';
      const hmac = generate_auth_hmac(key, challenge);
      const sym  = derive_key_from_master_password_with_defined_salt(key, salt);

      console.log('[Sandbox] KEYS_DERIVED_REGISTER:', { salt, key, hmac });
      event.source?.postMessage({
        type:    'KEYS_DERIVED_REGISTER',
        payload: { auth_hash: hmac, salt, symmetricKey: sym }
      }, event.origin);
      return;
    }

    // 4) DERIVE_KEYS_LOGIN
    if (msg.type === 'DERIVE_KEYS_LOGIN') {
      const { masterPassword: pw, salt } = msg.payload;
      const key  = derive_key_from_master_password_with_defined_salt(pw, salt);
      const challenge = key + 'authentication';
      const hmac = generate_auth_hmac(key, challenge);
      const sym  = derive_key_from_master_password_with_defined_salt(key, salt);

      console.log('[Sandbox] KEYS_DERIVED_LOGIN:', { salt, key, hmac });
      event.source?.postMessage({
        type:    'KEYS_DERIVED_LOGIN',
        payload: { auth_hash: hmac, symmetricKey: sym }
      }, event.origin);
      return;
    }

    // 5) DECRYPT_VAULT → INVERSIÓN DE PARÁMETROS
if (msg.type === 'DECRYPT_VAULT') {
  console.log('[Sandbox] Decrypting vault data...');
  const { encryptedData, vaultKey } = msg.payload;

  // Add logging here to see the inputs
  console.log('[Sandbox] Decrypt inputs:');
  console.log('[Sandbox]   vaultKey (first 8 chars):', vaultKey ? vaultKey.substring(0, 8) + '...' : 'null');
  console.log('[Sandbox]   encryptedData (first 8 chars):', encryptedData ? encryptedData.substring(0, 8) + '...' : 'null');


  try {
    const plaintext = chacha20poly1305_decrypt(vaultKey, encryptedData);
    console.log('[Sandbox] VAULT_DECRYPTED payload (first 50 chars):', plaintext.substring(0, 50) + '...'); // Log truncated payload
    event.source?.postMessage({
      type:    'VAULT_DECRYPTED',
      payload: plaintext
    }, event.origin);
  } catch (innerErr) {
    console.error('[Sandbox] Decrypt failed with error:', innerErr);
    // Propagate the error message back to the controller
    event.source?.postMessage({
      type:  'WASM_ERROR',
      error: `Decrypt failed: ${innerErr.message || innerErr}`
    }, event.origin);
  }
  return;
}


  } catch (err) {
    console.error('[Sandbox] Error handling', msg.type, err);
    event.source?.postMessage({ type: 'WASM_ERROR', error: err.message }, event.origin);
  }
});

console.log('[Sandbox] sandbox.js loaded');
