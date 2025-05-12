// js/auth_controller.js

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = local_url;
  const iframe = document.getElementById('wasm_sandbox');
  const loader = document.getElementById('loader');
  let sandboxWin;

  // 0) Auto-login si ya hay sesión guardada
  chrome.storage.local.get(null, items => {
    console.log('Contenido de storage.local:', items);
    if (items.vault_key && items.email) {
      // Ya tenemos vault_key y email → saltamos login/registro
      window.location.href = chrome.runtime.getURL('views/vaults.html');
    }
  });

  function showErrorBanner(title, desc) {
    const banner = document.getElementById('something_went_wrong_banner');
    document.getElementById('something_went_wrong_context').innerText = title;
    document.getElementById('something_went_wrong_description').innerText = desc;
    banner.style.display = 'block';
    setTimeout(() => banner.style.display = 'none', 5000);
  }

  // Inicializamos sandbox WASM
  iframe.src = chrome.runtime.getURL('views/sandbox.html');
  iframe.addEventListener('load', () => {
    sandboxWin = iframe.contentWindow;
    sandboxWin.postMessage({ type: 'INIT_WASM' }, '*');
  });

  window.addEventListener('message', function onInit(e) {
    if (e.source === sandboxWin && e.data.type === 'WASM_INITIALIZED') {
      window.removeEventListener('message', onInit);
      console.log('[auth_controller] WASM Initialized');
    }
  });

  function callSandbox(type, payload) {
    return new Promise((resolve, reject) => {
      if (!sandboxWin) return reject(new Error('Sandbox no inicializado'));
      const timeout = setTimeout(() => reject(new Error(`Timeout en ${type}`)), 8000);

      function handler(e) {
        if (e.source !== sandboxWin) return;
        if (e.data.type === 'WASM_ERROR') {
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          return reject(new Error(`Sandbox error: ${e.data.error}`));
        }
        if ((type === 'DERIVE_KEYS_REGISTER' && e.data.type === 'KEYS_DERIVED_REGISTER') ||
            (type === 'DERIVE_KEYS_LOGIN'    && e.data.type === 'KEYS_DERIVED_LOGIN')) {
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          console.log('[auth_controller] Recibido del sandbox:', e.data);
          return resolve(e.data.payload);
        }
      }

      window.addEventListener('message', handler);
      sandboxWin.postMessage({ type, payload }, '*');
    });
  }

  async function register_user(evt) {
    evt.preventDefault();
    const f = Object.fromEntries(new FormData(evt.target).entries());
    if (f.password.length < 8) {
      return showErrorBanner('Contraseña inválida', 'Debe tener al menos 8 caracteres');
    }
    if (f.password !== f.confirm_password) {
      return showErrorBanner('Confirmación inválida', 'Las contraseñas no coinciden');
    }

    loader.classList.remove('hidden');
    try {
      const derived = await callSandbox('DERIVE_KEYS_REGISTER', { masterPassword: f.password });
      const salt      = derived.salt;
      const vault_key = derived.symmetricKey || derived.key;
      const auth_hash = derived.auth_hash    || derived.hmac;

      if (!salt || !vault_key || !auth_hash) {
        throw new Error('Datos criptográficos inválidos');
      }

      const body = {
        username:   f.username,
        email:      f.email,
        auth_hash,
        salt,
        iterations: 4
      };

      const res = await fetch(`${API_BASE}users/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body)
      });
      if (!res.ok) throw new Error(await res.text());

      // Si registro OK, login automático
      const loginRes = await fetch(`${API_BASE}users/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: f.email, auth_hash })
      });
      if (!loginRes.ok) throw new Error(await loginRes.text());
      const user = await loginRes.json();

      // Guardamos vault_key en snake_case
      chrome.runtime.sendMessage({
        type:    'AUTH_SAVE',
        payload: {
          token:     user.token,
          vault_key,         // <-- aquí
          username:  user.username,
          email:     user.email,
          salt
        }
      }, resp => {
        if (resp.success) {
          window.location.href = chrome.runtime.getURL('views/vaults.html');
        } else {
          showErrorBanner('Error guardando sesión', resp.error);
        }
      });
    } catch (err) {
      console.error('[auth_controller] Registro error:', err);
      showErrorBanner('Error de registro', err.message);
    } finally {
      loader.classList.add('hidden');
    }
  }

  async function login_user(evt) {
    evt.preventDefault();
    const f = Object.fromEntries(new FormData(evt.target).entries());
    loader.classList.remove('hidden');

    try {
      // 1) Obtener salt
      const saltRes = await fetch(`${API_BASE}users/salt?email=${encodeURIComponent(f.email)}`);
      if (!saltRes.ok) {
        throw new Error(`Salt fetch falló: ${saltRes.status} ${await saltRes.text()}`);
      }
      const salt = await saltRes.text();

      // 2) Derivar claves
      const derived = await callSandbox('DERIVE_KEYS_LOGIN', {
        masterPassword: f.password,
        salt
      });
      const auth_hash = derived.auth_hash;
      const vault_key = derived.symmetricKey;

      if (!auth_hash || !vault_key) {
        throw new Error('Derivación de claves fallida');
      }

      // 3) Login backend
      const loginRes = await fetch(`${API_BASE}users/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: f.email, auth_hash })
      });
      if (!loginRes.ok) {
        throw new Error(`Login falló: ${loginRes.status} ${await loginRes.text()}`);
      }
      const user = await loginRes.json();

      // 4) Guardar sesión con vault_key en snake_case
      chrome.runtime.sendMessage({
        type:    'AUTH_SAVE',
        payload: {
          token:     user.token,
          vault_key,         // <-- aquí también
          username:  user.username,
          email:     user.email,
          salt
        }
      }, resp => {
        if (resp.success) {
          window.location.href = chrome.runtime.getURL('views/vaults.html');
        } else {
          showErrorBanner('Error guardando sesión', resp.error);
        }
      });
    } catch (err) {
      console.error('[auth_controller] Login error:', err);
      showErrorBanner('Login fallido', err.message);
    } finally {
      loader.classList.add('hidden');
    }
  }

  // Event listeners para formularios
  document.getElementById('register_form')?.addEventListener('submit', register_user);
  document.getElementById('login_form')?.addEventListener('submit',    login_user);
});
