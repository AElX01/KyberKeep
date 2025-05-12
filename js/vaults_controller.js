// js/vaults_controller.js

const local_url = window.local_url; // Assumes this is correctly defined elsewhere
let sandboxWin, wasmReady = false;
let vaultList, loader, iframe, vault_key;

/**
 * Obtiene del background.js los datos de sesión (jwt, vault_key, salt, etc.).
 * @returns {Promise<{jwt: string, vault_key: string, username: string, email: string, salt: string}>}
 */
function getSessionData() {
  console.log('[VaultsController] Attempting to get session data...');
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'AUTH_GET' }, response => {
      if (chrome.runtime.lastError) {
        console.error('[VaultsController] Error getting session data:', chrome.runtime.lastError);
        return reject(chrome.runtime.lastError);
      }
      console.log('[VaultsController] Session data received:', response);
      // Aquí esperamos que el background envíe vault_key
      if (!response || !response.vault_key) {
        console.warn('[VaultsController] No vault_key found in session data.');
        return reject(new Error('No hay vault_key en sesión. Redirigiendo a login.'));
      }
      // Optional: Validate basic vault_key format if needed (e.g., is it a hex string of expected length?)
      if (!/^[0-9a-f]{64}$/i.test(response.vault_key)) { // Assuming 32-byte key = 64 hex chars
          console.error('[VaultsController] vault_key from storage has unexpected format:', response.vault_key);
          // Decide if this should block login or just log a warning
          // For now, we'll proceed, but it might indicate a save issue
      }

      resolve(response);
    });
  });
}

// Loader
const showLoader = () => loader.classList.remove('hidden');
const hideLoader = () => loader.classList.add('hidden');

// RPC sandbox
function callSandbox(type, payload) {
  return new Promise((res, rej) => {
    if (!sandboxWin) return rej(new Error('Sandbox no listo'));
    // Aumenté un poco el timeout por si acaso, aunque 15s debería ser suficiente.
    const to = setTimeout(() => {
        console.error(`[VaultsController] Timeout waiting for sandbox message for type: ${type}`);
        window.removeEventListener('message', lis); // Clean up listener on timeout
        rej(new Error(`Timeout sandbox waiting for ${type} response`));
    }, 15000);


    console.log(`[VaultsController] Calling sandbox with type: ${type}`, payload);

    function lis(e) {
      const iframeOrigin = iframe.contentDocument?.location.origin || '*';

      if (e.source !== sandboxWin || (iframeOrigin !== '*' && e.origin !== iframeOrigin)) {
           return;
      }

      const m = e.data;
      console.log(`[VaultsController] Received message from sandbox: ${m.type}`, m);

      // Clear timeout and remove listener on *any* handled response or error
      const handleResponse = (result) => {
           clearTimeout(to);
           window.removeEventListener('message', lis);
           res(result);
      };

      const handleError = (error) => {
           clearTimeout(to);
           window.removeEventListener('message', lis);
           rej(error);
      };


      if (m.type === 'WASM_ERROR') {
        console.error('[VaultsController] WASM Error received:', m.error);
        // Propagate the specific error message from the sandbox
        handleError(new Error(`Error en operación WASM: ${m.error}`));
        return;
      }

      if (type === 'INIT_WASM' && m.type === 'WASM_INITIALIZED') {
          console.log('[VaultsController] WASM_INITIALIZED success.');
          handleResponse(m.type); // Resolve the promise for INIT_WASM
          return;
      }

      if (type === 'DECRYPT_VAULT' && m.type === 'VAULT_DECRYPTED') {
        console.log('[VaultsController] VAULT_DECRYPTED success.');
        handleResponse(m.payload); // Resolve the promise for DECRYPT_VAULT with the payload
        return;
      }

      console.warn(`[VaultsController] Received unexpected message type from sandbox for call type ${type}: ${m.type}`);
    }

    window.addEventListener('message', lis);
    const targetOrigin = iframe.contentDocument?.location.origin || '*';
    sandboxWin.postMessage({ type, payload }, targetOrigin);
  });
}

function isValidURL(u) {
  try { new URL(u); return true; } catch { return false; }
}

async function populateVaults() {
  showLoader();
  vaultList.innerHTML = '';
  console.log('[VaultsController] Fetching vaults...');
  try {
    const session = await getSessionData();
    const r = await fetch(`${local_url}vaults/getvault/all`);

    if (!r.ok) {
        console.error('[VaultsController] Fetch vaults failed, status:', r.status);
        throw new Error(`Error fetching vaults: ${r.statusText}`);
    }
    const { entries } = await r.json();
    console.log('[VaultsController] Vault entries received:', entries);

    if (!entries || entries.length === 0) {
        vaultList.innerHTML = '<p class="text-center text-gray-500">No hay baúles guardados aún.</p>';
        hideLoader();
        return;
    }


    for (const info of entries) {
      const domain = isValidURL(info.url) ? new URL(info.url).hostname : '';
      const card = document.createElement('div');
      card.className = 'login-card';
      card.innerHTML = `
        <img class="favicon w-6 h-6 mr-2" src="https://www.google.com/s2/favicons?domain=${domain}" alt="">
        <div class="flex-grow">
          <div class="login-title text-lg font-semibold">${info.item_name || 'Sin Nombre'}</div>
          <div class="login-username text-sm text-gray-500">${domain || info.url || 'Sin URL'}</div>
        </div>
      `;

      card.addEventListener('click', () => showInfoModal(info));
      vaultList.appendChild(card);
    }
  } catch (e) {
    console.error('[VaultsController] populateVaults error:', e);
    vaultList.innerHTML = `<p class="text-center text-red-600">Error cargando baúles: ${e.message}</p>`;
  } finally {
    hideLoader();
  }
}

async function showInfoModal(info) {
  showLoader();
  console.log('[VaultsController] Showing info modal for:', info);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';
  overlay.innerHTML = `
    <div class="modal-content bg-white rounded-lg shadow-xl p-6 w-96 relative">
      <button class="modal-close absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
      <div class="modal-header flex items-center mb-4 border-b pb-4">
        <img class="w-8 h-8 mr-3" src="https://www.google.com/s2/favicons?domain=${
          isValidURL(info.url) ? new URL(info.url).hostname : ''
        }" alt="">
        <h2 class="modal-title text-xl font-bold">${info.item_name || 'Sin Nombre'}</h2>
      </div>
      <div class="modal-body text-gray-700"><p>🔄 Desencriptando…</p></div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close')
    .addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  try {
    if (!vault_key) {
        console.error('[VaultsController] Decryption attempted but vault_key is not set.');
        throw new Error('Clave de bóveda no encontrada. Por favor, reloguea.');
    }
     console.log('[VaultsController] Vault Key for decryption (first 8 chars):', vault_key.substring(0, 8) + '...');
     console.log('[VaultsController] Encrypted Data (first 8 chars):', info.encrypted_data.substring(0, 8) + '...');

    const minEncryptedLengthHex = (12 + 16) * 2;
    if (!/^[0-9a-f]+$/i.test(info.encrypted_data) || info.encrypted_data.length < minEncryptedLengthHex) {
        console.error('[VaultsController] Invalid encrypted data format:', info.encrypted_data);
        throw new Error(`Encrypted data inválido o incompleto (min ${minEncryptedLengthHex} hex chars).`);
    }


    const decrypted = await callSandbox('DECRYPT_VAULT', {
      encryptedData: info.encrypted_data,
      vaultKey: vault_key // Pass the stored vault_key to the sandbox
    });

    console.log('[VaultsController] Decryption successful. Raw payload:', decrypted);

    let d;
    try {
        d = JSON.parse(decrypted);
    } catch (parseErr) {
        console.error('[VaultsController] Failed to parse decrypted JSON:', parseErr, 'Raw decrypted:', decrypted);
         overlay.querySelector('.modal-body').innerHTML = `
            <p style="color:#c00">
              <strong>Error:</strong> Datos desencriptados no son JSON válido.<br>Posible clave incorrecta.
            </p>`;
        return;
    }


    overlay.querySelector('.modal-body').innerHTML = `
      <p><strong>Username:</strong> ${d.username || 'N/A'}</p>
      <p><strong>Password:</strong> ${d.password || 'N/A'}</p>
      <p><strong>Website:</strong>
        ${info.url ? `<a href="${info.url}" target="_blank" rel="noopener" class="text-blue-600 hover:underline">${info.url}</a>` : 'N/A'}
      </p>`;
  } catch (err) {
    console.error('[VaultsController] showInfoModal decryption error:', err);
    overlay.querySelector('.modal-body').innerHTML = `
      <p style="color:#c00">
        <strong>Error desencriptando:</strong><br>${err.message || 'Error desconocido'}
      </p>`;
  } finally {
    hideLoader();
  }
}

// Init
window.addEventListener('DOMContentLoaded', async () => {
  console.log('[VaultsController] DOMContentLoaded. Initializing...');
  vaultList = document.getElementById('vault-list');
  loader    = document.getElementById('loader');
  iframe    = document.getElementById('wasm_sandbox');

  if (!vaultList || !loader || !iframe) {
      console.error('[VaultsController] Critical elements not found!');
      return;
  }


  try {
    const sessionData = await getSessionData();
    vault_key = sessionData.vault_key; // Set the global vault_key

    console.log('[VaultsController] Session data and vault_key loaded successfully.');

    // Initialize sandbox WASM
    iframe.addEventListener('load', async () => {
      console.log('[VaultsController] Sandbox iframe loaded. Initializing WASM...');
      sandboxWin = iframe.contentWindow;
      try {
           await callSandbox('INIT_WASM'); // Wait explicitly for WASM to be initialized
           wasmReady = true;
           console.log('[VaultsController] WASM initialized in sandbox. Populating vaults...');
           populateVaults(); // Populate vaults only AFTER WASM is ready
      } catch (wasmErr) {
           console.error('[VaultsController] Failed to initialize WASM:', wasmErr);
           // Handle WASM init failure - maybe show an error message or redirect
           vaultList.innerHTML = `<p class="text-center text-red-600">Error inicializando módulo de cifrado: ${wasmErr.message}</p>`;
           hideLoader(); // Hide loader if it was showing
      }
    });

  } catch (err) {
    console.error('[VaultsController] Initialization error (getting session data or setting up sandbox):', err);
    // If getting session data fails (e.g., no vault_key), redirect to login
    if (err.message.includes('No hay vault_key en sesión')) {
         window.location.href = chrome.runtime.getURL('views/login.html');
    } else {
         // Handle other init errors
         vaultList.innerHTML = `<p class="text-center text-red-600">Error de inicialización: ${err.message}</p>`;
         hideLoader();
    }
  }
});