(async function () {
  const debug = (...args) => console.log('[KyberKeep CS]', ...args);

  // 1) Dominio actual
  const currentUrl = new URL(window.location.href);
  debug('URL actual:', currentUrl.href);

  // 2) Obtener todas las entradas del vault
  const vaults = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_ALL_VAULTS' }, resp => {
      resolve(resp.entries || []);
    });
  });

  // 3) Filtrar sólo las entradas que coincidan razonablemente con la URL actual
  const entries = vaults.filter(v => {
    try {
      const entryUrl = new URL(v.url);

      const sameHost = entryUrl.hostname === currentUrl.hostname;
      const isSubPath = currentUrl.pathname.startsWith(entryUrl.pathname);

      const bothHaveDeepPaths = entryUrl.pathname !== '/' && currentUrl.pathname !== '/';
      const originMatches = entryUrl.origin === currentUrl.origin;

      return sameHost && (originMatches || (isSubPath && bothHaveDeepPaths));
    } catch {
      return false;
    }
  });

  if (entries.length === 0) return;

  // 4) Leer vault_key
  const { vault_key } = await new Promise(res =>
    chrome.storage.local.get('vault_key', items => res(items))
  );
  if (!vault_key) return;

  // 5) Inyectar sandbox iframe si falta
  let iframe = document.getElementById('kyberkeep-sandbox-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'kyberkeep-sandbox-iframe';
    iframe.src = chrome.runtime.getURL('views/sandbox.html');
    iframe.style.display = 'none';
    iframe.sandbox = 'allow-scripts';
    document.documentElement.appendChild(iframe);

    iframe.addEventListener('load', () => {
      debug('Iframe cargado correctamente, enviando mensaje de inicialización...');
      iframe.contentWindow.postMessage({ type: 'INIT_WASM' }, '*');
    });

    debug('Iframe no encontrado, creando uno nuevo...');
  } else {
    // Asegurarse de que el iframe ya está cargado antes de proceder
    if (iframe.contentWindow) {
      debug('Iframe ya presente, enviando mensaje de inicialización...');
      iframe.contentWindow.postMessage({ type: 'INIT_WASM' }, '*');
    } else {
      debug('Iframe presente pero aún no cargado. Esperando...');
      iframe.addEventListener('load', () => {
        debug('Iframe cargado correctamente, enviando mensaje de inicialización...');
        iframe.contentWindow.postMessage({ type: 'INIT_WASM' }, '*');
      });
    }
  }

  // Helper para desencriptar
  function decryptEntry(e) {
    return new Promise((resolve, reject) => {
      function handler(evt) {
        if (evt.source !== iframe.contentWindow) return;
        if (evt.data?.type === 'VAULT_DECRYPTED') {
          window.removeEventListener('message', handler);
          try {
            resolve(JSON.parse(evt.data.payload));
          } catch (err) {
            reject(err);
          }
        }
        if (evt.data?.type === 'WASM_ERROR') {
          window.removeEventListener('message', handler);
          reject(new Error(evt.data.error));
        }
      }
      window.addEventListener('message', handler);
      iframe.contentWindow.postMessage({
        type: 'DECRYPT_VAULT',
        payload: { encryptedData: e.encrypted_data, vaultKey: vault_key }
      }, '*');
    });
  }

  // Si sólo hay una, autocompletar directo
  if (entries.length === 1) {
    const creds = await decryptEntry(entries[0]);
    autofill(creds);
    return;
  }

  // Si hay varias, mostrar selector
  showSelectorModal(entries, decryptEntry);

  // ---------------- helpers ----------------

  function autofill(creds) {
    const userField = document.querySelector(
      'input#login_field, input[name=login], input[type=email], input[name*=user], input[name*=email], input[name*=identifier]'
    );
    const passField = document.querySelector(
      'input#password, input[name=password], input[type=password]'
    );
    if (userField) {
      userField.value = creds.username;
      userField.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (passField) {
      passField.value = creds.password;
      passField.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function showSelectorModal(entries, decryptFn) {
    let idx = 0;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(backdrop);

    const modal = document.createElement('div');
    modal.className = 'modal fade show d-block';
    modal.tabIndex = -1;
    modal.setAttribute('role', 'dialog');
    modal.innerHTML = `
      <div class="modal-dialog modal-md modal-dialog-centered" role="document" style="position: fixed; top: 10px; right: 10px; margin: 0;">
        <div class="modal-content bg-dark text-white">
          <div class="modal-header border-0">
            <h5 class="modal-title">Selecciona bóveda</h5>
          </div>
          <div class="modal-body text-center">
            <p id="kk-select-name" class="h5 mb-4"></p>

            <div class="d-flex justify-content-between mb-3">
              <button type="button" class="btn btn-outline-light w-45" id="kk-prev">&larr;</button>
              <button type="button" class="btn btn-outline-light w-45" id="kk-next">&rarr;</button>
            </div>

            <div class="d-flex justify-content-between">
              <button type="button" class="btn btn-secondary w-45" id="kk-cancel">Cancelar</button>
              <button type="button" class="btn btn-primary w-45" id="kk-accept">Aceptar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Referencias a elementos
    const nameDisplay = modal.querySelector('#kk-select-name');
    const prevBtn = modal.querySelector('#kk-prev');
    const nextBtn = modal.querySelector('#kk-next');
    const acceptBtn = modal.querySelector('#kk-accept');
    const cancelBtn = modal.querySelector('#kk-cancel');

    // Función de render
    function render() {
      nameDisplay.textContent = entries[idx].item_name || 'Sin nombre';
    }
    render();

    // Handlers de botones
    prevBtn.addEventListener('click', () => {
      idx = (idx - 1 + entries.length) % entries.length;
      render();
    });
    nextBtn.addEventListener('click', () => {
      idx = (idx + 1) % entries.length;
      render();
    });
    acceptBtn.addEventListener('click', async () => {
      const creds = await decryptFn(entries[idx]);
      cleanup();
      autofill(creds);
    });
    cancelBtn.addEventListener('click', cleanup);

    // Cleanup
    function cleanup() {
      document.body.removeChild(modal);
      document.body.removeChild(backdrop);
    }
  }
})();
