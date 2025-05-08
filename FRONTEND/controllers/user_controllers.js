import init, { 
    derive_key_from_master_password, 
    generate_auth_hmac,
    derive_key_from_master_password_with_defined_salt,
    chacha20poly1305_decrypt,
    chacha20poly1305_encrypt
 } from "/cryptography/cryptography_rs.js";


function showErrorBanner(context, description) {
    const banner = document.getElementById('something_went_wrong_banner');
    const progressBar = document.getElementById('progress_bar');
    const context_container = document.getElementById('something_went_wrong_context');
    const description_container = document.getElementById('something_went_wrong_description');

    context_container.innerText = context;
    description_container.innerText = description;

    banner.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.style.transition = 'none';
    setTimeout(() => {
        progressBar.style.transition = 'width 3s linear';
        progressBar.style.width = '100%';
    }, 10);

    setTimeout(() => {
        banner.style.display = 'none';
    }, 3000);
}

async function populate_user_info() {
    let username = document.getElementById('nav-footer-title');
    let user_email = document.getElementById('nav-footer-subtitle');
    let reused_passwords = document.getElementById('reused_passwords');
    let insecure_sites = document.getElementById('insecure_sites');
    let account_health = document.getElementById('account_health');
    loaderContainer.classList.remove("hidden");

    username.innerText = sessionStorage.username;
    user_email.innerText = sessionStorage.email;

    fetch('/vaults/getvault/all', {
        method: "GET",
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            loaderContainer.classList.add("hidden");
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
            loaderContainer.classList.add("hidden");
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
            const decrypted_json = JSON.parse(decrypted);

            if (decrypted_json.password.length) {
              passwords.push(decrypted);
            }
        }

        if (passwords.length === 0) {
          reused_passwords.innerHTML = `<strong>Logins reusing passwords:</strong> 0`;
          insecure_sites.innerHTML = `<strong>Logins in insecure sites:</strong> 0`;
          account_health.innerHTML = `You do not have any passwords yet`;
          loaderContainer.classList.add("hidden");
          return;
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
        const username = document.getElementById('nav-footer-title');

        if (atRiskPercentage > 50) {
            show_banner(`${atRiskPercentage}% of your logins are at risk, take action now`);
        }

        loaderContainer.classList.add("hidden");
        reused_passwords.innerHTML = `<strong>Logins reusing passwords:</strong> ${reused}`;
        insecure_sites.innerHTML = `<strong>Logins in insecure sites:</strong> ${insecure}`;
        account_health.innerHTML = `<strong>${atRiskPercentage}%</strong> of your logins are at risk`;
    });
}


async function update_password(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const formObject = Object.fromEntries(formData.entries());

    if (formObject.password.length < 8) {
        alert('Incorrect Password Length', 'insufficient password length');
        return;
    } else if (formObject.password != formObject.confirm_password) {
        alert('Password mismatch', 'passwords do not match');
        return;
    }
    loaderContainer.classList.remove("hidden");

    // Get the master password from the form
    const masterPassword = formObject.current_password;
    const new_masterPassword = formObject.password;

    // Init WASM and derive key
    await init();
    const masterKey = derive_key_from_master_password_with_defined_salt(masterPassword, sessionStorage.salt);
    const challenge = masterKey + 'authentication';
    const hmac = generate_auth_hmac(masterKey, challenge);
    const new_masterMetadata = derive_key_from_master_password(new_masterPassword, 0); // result received from Rust's KDF function 'hex_salt:hex_key'
    const new_masterKey = new_masterMetadata.slice(33, new_masterMetadata.length);
    const new_masterSalt = new_masterMetadata.slice(0, 32);
    const new_challenge = new_masterKey + 'authentication';
    const new_hmac = generate_auth_hmac(new_masterKey, new_challenge);
    const symmetricKey = derive_key_from_master_password_with_defined_salt(new_masterKey, new_masterSalt);
    

    fetch('/vaults/getvault/all', {
        method: 'GET'
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            alert('something went wrong');
            loaderContainer.classList.add("hidden");
            return;
        }
        return response.json();
    })
    .then(async vault => {
        let entries = vault.entries;

        if (!entries.length) {
            loaderContainer.classList.add("hidden");
            return;
        }

        let decrypted;
        let encrypted;

        for (let entry of entries) {
            decrypted = chacha20poly1305_decrypt(sessionStorage.vault_key, entry.encrypted_data);
            encrypted = chacha20poly1305_encrypt(symmetricKey, decrypted);
            entry.encrypted_data = encrypted;

            fetch(`/vaults/update/${entry._id}`, {
                method: "PATCH",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            })
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    alert('Something went wrong');
                    loaderContainer.classList.add("hidden");
                    return;
                }
            })
        }
    })

    fetch('/users/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'auth_hash': hmac },
        body: JSON.stringify({
            "auth_hash": new_hmac,
            "salt": new_masterSalt
        }) 
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            alert('something went wrong');
            loaderContainer.classList.add("hidden");
            return;
        }
        return response.json();
    })
    .then(user => {
        loaderContainer.classList.add("hidden");
        sessionStorage.setItem('vault_key', symmetricKey);
        sessionStorage.setItem('username', user.username);
        sessionStorage.setItem('email', user.email);
        sessionStorage.setItem('salt', user.salt);
    })
    return;
}

async function update_user_info(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const formObject = Object.fromEntries(formData.entries());
    loaderContainer.classList.remove("hidden");

    if (!(formObject.username.length || formObject.email.length)) {
        loaderContainer.classList.add('hidden');
        alert('no changes');
        return;
    } else if (formObject.username.length && formObject.email.length) {
        if (!formObject.password.length) {
            loaderContainer.classList.add("hidden");
            alert('something went wrong');
            return;
        } else {
            const masterPassword = formObject.password;
            await init();
            const masterKey = derive_key_from_master_password_with_defined_salt(masterPassword, sessionStorage.salt);
            const challenge = masterKey + 'authentication';
            const hmac = generate_auth_hmac(masterKey, challenge);

            fetch('/users/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'auth_hash': hmac },
                body: JSON.stringify({
                    "username": formObject.username,
                    "email": formObject.email
                }) 
            })
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    loaderContainer.classList.add("hidden");
                    alert('something went wrong');
                    return;
                }
    
                return response.json();
            })
            .then(user => {
                loaderContainer.classList.add("hidden");
                sessionStorage.setItem('username', user.username);
                sessionStorage.setItem('email', user.email);
                sessionStorage.setItem('salt', user.salt);
                populate_user_info();
            })
        }
    } else if (formObject.username.length) {
            fetch('/users/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "username": formObject.username
                }) 
            })
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    loaderContainer.classList.add("hidden");
                    alert('something went wrong');
                    return;
                }
    
                return response.json();
            })
            .then(user => {
                loaderContainer.classList.add("hidden");
                sessionStorage.setItem('username', user.username);
                sessionStorage.setItem('email', user.email);
                sessionStorage.setItem('salt', user.salt);
                populate_user_info();
            })
    } else if (formObject.email.length) {
        if (!formObject.password.length) {
            loaderContainer.classList.add("hidden");
            alert('something went wrong');
            return;
        } else {
            const masterPassword = formObject.password;

            await init();
            const masterKey = derive_key_from_master_password_with_defined_salt(masterPassword, sessionStorage.salt);
            const challenge = masterKey + 'authentication';
            const hmac = generate_auth_hmac(masterKey, challenge);

            fetch('/users/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'auth_hash': hmac },
                body: JSON.stringify({
                    "username": formObject.username,
                    "email": formObject.email
                }) 
            })
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    loaderContainer.classList.add("hidden");
                    alert('something went wrong');
                    return;
                }
    
                return response.json();
            })
            .then(user => {
                loaderContainer.classList.add("hidden");
                sessionStorage.setItem('username', user.username);
                sessionStorage.setItem('email', user.email);
                sessionStorage.setItem('salt', user.salt);
                populate_user_info();
            })
        }
    }
}

async function delete_user(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const formObject = Object.fromEntries(formData.entries());

    if (formObject.password.length < 8) {
        alert('Incorrect Password Length', 'insufficient password length');
        return;
    }

    loaderContainer.classList.remove("hidden");
    const masterPassword = formObject.password;

    await init();
    const masterKey = derive_key_from_master_password_with_defined_salt(masterPassword, sessionStorage.salt);
    const challenge = masterKey + 'authentication';
    const hmac = generate_auth_hmac(masterKey, challenge);

    fetch('/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'auth_hash': hmac },
        body: JSON.stringify({
            "email": formObject.email
        })
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            loaderContainer.classList.add("hidden");
            alert('something went wrong');
            return;
        } else {
            loaderContainer.classList.add("hidden");
            window.location.href = local_url + 'users/logout';
        }
    })
}

if (window.location.href === local_url + 'settings') {
    if (sessionStorage.getItem('email') == null) {
        window.location.href = local_url + 'users/logout';
    }
    
    let username = document.getElementById('modal-edit-username');
    username.placeholder = sessionStorage.username;

    document.getElementById('edit-user-info-form').addEventListener('submit', update_user_info);
    document.getElementById('change-master-password-form').addEventListener('submit', update_password);
    document.getElementById('delete_user_modal').addEventListener('submit', delete_user);
}

populate_user_info(); 