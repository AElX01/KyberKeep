import init, { 
    chacha20poly1305_encrypt,
    chacha20poly1305_decrypt
 } from "/cryptography/cryptography_rs.js";


function isValidURL(str) {
    try {
        new URL(str);
        return true;
    } catch (_) {
        return false;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const modalContainer = document.createElement('div');
    modalContainer.id = 'info_modal';
    modalContainer.className = 'modal-overlay';
    modalContainer.style.display = 'none';
    document.body.appendChild(modalContainer);
  
    const vaultContainer = document.getElementById('vault-container');
    vaultContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.vault-card');
      if (!card) return;
  
      if (e.target.closest('.vault-actions')) return;
  
      showInfoModal(card);
    });
  });

  async function updateLoginInfo(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const formObject = Object.fromEntries(formData.entries());
    const entry = JSON.stringify({
      "username": formObject.username,
      "password": formObject.password
    });
    
    await init();
    const encryped = chacha20poly1305_encrypt(sessionStorage.vault_key, entry);
    formObject.website = 'https://' + formObject.website;

    fetch(`/vaults/update/${event.target.className}`, {
      method: "PATCH",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "item_name": formObject.item_name,
        "encrypted_data": encryped,
        "url": formObject.website
      })
    })
    .then(async response => {
      if (!response.ok) {
          const errorText = await response.text();
          alert('Something went wrong');
          return;
      }
      
      populate_vaults_container();
    })
  }

  window.deleteLogin = function(index) {
    fetch(`/vaults/delete/${index}`, {
      method: "DELETE"
    })
    .then(async response => {
      if (!response.ok) {
          const errorText = await response.text();
          alert('Something went wrong');
          return;
      }
      
      populate_vaults_container();
    })
  }

  function showInfoModal(card) {
    const modal = document.getElementById('info_modal');
    const titleText = card.querySelector('.vault-title').textContent;
    const domainText = card.querySelector('.vault-meta').textContent;

    fetch(`/vaults/getvault/${card.id}`, {
        method: "GET"
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            alert('Something went wrong');
            return;
        }
        
        return response.json();
    })
    .then(async entry => {
        await init();
        const decrypted = JSON.parse(chacha20poly1305_decrypt(sessionStorage.vault_key, entry.encrypted_data));

        let index = card.id;
        modal.innerHTML = `
          <div class="modal-content">
            <button class="modal-close">&times;</button>
            <div class="modal-header">
              <img class="vault-icon"
                   src="https://www.google.com/s2/favicons?domain=${domainText}"
                   alt="${titleText}" />
              <h2 class="modal-title">${titleText}</h2>
            </div>
            <form id=password_edition class=${card.id}>
              <h3 class="modal-section-title">Item details</h3>
              <div class="modal-field">
                <label>Item name</label>
                <input name="item_name" class="modal-data" value="${titleText}">
              </div>
              <h3 class="modal-section-title">Login information</h3>
              <div class="modal-field-group">
                <div class="modal-field">
                  <label>Username</label>
                  <input name="username" class="modal-data" value="${decrypted.username}">
                </div>
                <button type="button" class="modal_cpy_btn"><i class="fas fa-clone"></i></button>
              </div>
              <div class="modal-field-group">
                <div class="modal-field">
                  <label>Password</label>
                  <input name="password" class="modal-data" type="password" value="${decrypted.password}">
                </div>
                <button type="button" class="modal_cpy_btn"><i class="fas fa-eye-slash"></i></button>
                <button type="button" class="modal_cpy_btn"><i class="fas fa-clone"></i></button>
              </div>
              <h3 class="modal-section-title">Autofill options</h3>
              <div class="modal-field-group">
                <div class="modal-field">
                  <label>Website</label>
                  <input name="website" class="modal-data" value="${domainText}">
                </div>
                <button type="button" class="modal_cpy_btn"><i class="fas fa-up-right-from-square"></i></button>
                <button type="button" class="modal_cpy_btn"><i class="fas fa-clone"></i></button>
              </div>
              <div class="modal-actions">
                <button type="submit" class="edit_btn"><i class="fas fa-pen"></i></button>
                <button onclick="deleteLogin(${index})" type="button" class="delete_btn remove"><i class="fas fa-trash"></i></button>
              </div>
            </form>
          </div>
        `;

        modal.querySelector('.remove').addEventListener('click', () => {
          window.deleteLogin(card.id);
          modal.style.display = 'none';
        });
        

        const form = modal.querySelector(`#password_edition`);
        form.addEventListener('submit', updateLoginInfo);

        
        modal.style.display = 'flex';
        
        modal.querySelector('.modal-close').onclick = () => modal.style.display = 'none';
        modal.onclick = e => {
          if (e.target === modal) modal.style.display = 'none';
        };

        modal.querySelector('.edit_btn').onclick = () => {

          modal.style.display = 'none';
        };
        modal.querySelector('.delete_btn').onclick = () => {

          modal.style.display = 'none';
        };password_edition
    });
  }
  
  async function populate_vaults_container() {
    const vaultContainer = document.getElementById('vault-container');
    vaultContainer.innerHTML = '';
  
    const res = await fetch('/vaults/getvault/all');
    if (!res.ok) {
      alert('Something went wrong');
      return;
    }
    const { entries } = await res.json();
  
    for (let [index, info] of entries.entries()) {
      let domain = isValidURL(info.url)
        ? new URL(info.url).hostname
        : '';
      let url = isValidURL(info.url) ? info.url : '#';
  
      const card = document.createElement('div');
      card.className = 'vault-card';
      card.id = index;
      card.innerHTML = `
        <img class="vault-icon"
             src="https://www.google.com/s2/favicons?domain=${domain}"
             alt="${info.item_name}" />
        <div class="vault-info">
          <div class="vault-title">${info.item_name}</div>
          <div class="vault-meta">${domain}</div>
        </div>
        <div class="vault-actions">
          <button onclick="window.open('${url}', '_blank')">
            <i class="fas fa-up-right-from-square"></i>
          </button>
          <button onclick="cloneLogin(${index})">
            <i class="fas fa-clone"></i>
          </button>
        </div>
      `;
      vaultContainer.appendChild(card);
    }
  }

window.cloneLogin = function(index) {
    fetch(`/vaults/clone/${index}`, {
        method: "POST"
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            alert('Something went wrong');
            return;
        }
        
        populate_vaults_container();
    })
}

async function populate_user_info() {
    let username = document.getElementById('nav-footer-title');
    let user_email = document.getElementById('nav-footer-subtitle');
    let reused_passwords = document.getElementById('reused_passwords');
    let insecure_sites = document.getElementById('insecure_sites');
    let account_health = document.getElementById('account_health');

    username.innerText = sessionStorage.username;
    user_email.innerText = sessionStorage.email;

    fetch('/vaults/getvault/all', {
        method: "GET",
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            alert('Something went wrong');
            return;
        }
        return response.json();
    })
    .then(async vaults => {
        await init();

        let passwords = [];
        let reused = 0;
        let insecure = 0;

        if (vaults.entries.length === 0) {
            reused_passwords.innerHTML = `<strong>Logins reusing passwords:</strong> 0`;
            insecure_sites.innerHTML = `<strong>Logins in insecure sites:</strong> 0`;
            account_health.innerHTML = `You do not have any passwords yet`;
            return;
        }

        let reusedIndices = new Set();
        let insecureIndices = new Set();

        for (let i = 0; i < vaults.entries.length; i++) {
            const info = vaults.entries[i];

            if (info.url.startsWith("http://")) {
                insecure += 1;
                insecureIndices.add(i);
            }

            const decrypted = chacha20poly1305_decrypt(sessionStorage.vault_key, info.encrypted_data);
            passwords.push(decrypted);
        }

        let seen = new Map();
        for (let i = 0; i < passwords.length; i++) {
            const pw = passwords[i];
            if (seen.has(pw)) {
                reusedIndices.add(i);
                reusedIndices.add(seen.get(pw));
            } else {
                seen.set(pw, i);
            }
        }
        reused = reusedIndices.size;

        let totalAtRisk = new Set([...reusedIndices, ...insecureIndices]);
        let atRiskPercentage = ((totalAtRisk.size / passwords.length) * 100).toFixed(2);

        reused_passwords.innerHTML = `<strong>Logins reusing passwords:</strong> ${reused}`;
        insecure_sites.innerHTML = `<strong>Logins in insecure sites:</strong> ${insecure}`;
        account_health.innerHTML = `<strong>${atRiskPercentage}%</strong> of your passwords are at risk`;
    });
}


async function addNewEntry(event) {
    document.getElementById('create_password_modal').style.display = 'none';
    event.preventDefault();

    const formData = new FormData(event.target);
    const formObject = Object.fromEntries(formData.entries());
    
    if (!formObject.name.length) {
        alert('your item must at least have a name');
        return;
    }

    const entry = JSON.stringify({
        "username": formObject.username,
        "password": formObject.password
    });

    await init();
    const encryped = chacha20poly1305_encrypt(sessionStorage.vault_key, entry);

    fetch('/vaults/add', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "item_name": formObject.name,
            "encrypted_data": encryped,
            "url": formObject.website
        })
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            alert('something went wrong')
        } 

        populate_user_info();
        populate_vaults_container();
    })
}


if (window.location.href === local_url) {
    if (sessionStorage.getItem('email') == null) {
        window.location.href = local_url + 'users/logout';
    }
      
    document.getElementById('create_password_form').addEventListener('submit', addNewEntry);

    populate_vaults_container();
    populate_user_info();
}