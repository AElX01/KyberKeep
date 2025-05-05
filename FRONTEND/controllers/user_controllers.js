import init, { 
    derive_key_from_master_password, 
    generate_auth_hmac,
    derive_key_from_master_password_with_defined_salt
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

function populate_user_info() {
    let username = document.getElementById('nav-footer-title');
    let user_email = document.getElementById('nav-footer-subtitle');

    username.innerText = sessionStorage.username;
    user_email.innerText = sessionStorage.email;
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
            alert('something went wrong')
            return;
        }
        return response.json();
    })
    .then(user => {
        sessionStorage.setItem('username', user.username);
        sessionStorage.setItem('email', user.email);
        sessionStorage.setItem('salt', user.salt);
    })
    return;
}

async function update_user_info(event) {
    if (!(formObject.username.length || formObject.email.length)) {
        alert('no changes');
        return;
    } else if (formObject.username.length && formObject.email.length) {
        if (!formObject.password.length) {
            alert('no master password provided');
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
                    alert('something went wrong')
                    return;
                }
    
                return response.json();
            })
            .then(user => {
                sessionStorage.setItem('username', user.username);
                sessionStorage.setItem('email', user.email);
                sessionStorage.setItem('salt', user.salt);
            })
        }
    } else if (formObject.username.length) {

    } else if (formObject.email.length) {
        if (!formObject.password.length) {
            alert('no master password provided');
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
                    alert('something went wrong')
                    return;
                }
    
                return response.json();
            })
            .then(user => {
                sessionStorage.setItem('username', user.username);
                sessionStorage.setItem('email', user.email);
                sessionStorage.setItem('salt', user.salt);
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
            alert('something went wrong')
            return;
        } else {
            window.location.href = local_url + 'users/logout';
        }
    })
}

if (window.location.href === local_url + 'settings') {
    let username = document.getElementById('modal-edit-username');
    username.placeholder = sessionStorage.username;

    document.getElementById('edit-user-info-form').addEventListener('submit', update_user_info);
    document.getElementById('change-master-password-form').addEventListener('submit', update_password);
    document.getElementById('delete_user_modal').addEventListener('submit', delete_user);
}

populate_user_info();