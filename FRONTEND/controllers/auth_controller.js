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

async function register_user(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const formObject = Object.fromEntries(formData.entries());
    console.log('Form data:', JSON.stringify(formObject));

    if (formObject.password.length < 8) {
        showErrorBanner('Incorrect Password Length', 'insufficient password length');
        return;
    } else if (formObject.password != formObject.confirm_password) {
        showErrorBanner('Password mismatch', 'passwords do not match');
        return;
    }

    // Get the master password from the form
    const masterPassword = formObject.password;

    // Init WASM and derive key
    await init();
    const masterMetadata = derive_key_from_master_password(masterPassword, 0); // result received from Rust's KDF function 'hex_salt:hex_key'
    const masterKey = masterMetadata.slice(33, masterMetadata.length);
    const masterSalt = masterMetadata.slice(0, 32);
    const challenge = masterKey + 'authentication';
    const hmac = generate_auth_hmac(masterKey, challenge);
    const symmetricKey = derive_key_from_master_password_with_defined_salt(masterKey, masterSalt);
    
    fetch('/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "username": formObject.username,
            "email": formObject.email,
            "auth_hash": hmac,
            "salt": masterSalt,
            "iterations": "4"
        })        
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            showErrorBanner('something went wrong', errorText);
            return;
        } else {
            fetch('/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "email": formObject.email,
                    "auth_hash": hmac
                }) 
            })
            .then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    showErrorBanner('something went wrong', errorText);
                    return;
                }

                return response.json();
            })
            .then(user => {
                sessionStorage.setItem('username', user.username);
                sessionStorage.setItem('email', user.email);
                sessionStorage.setItem('salt', user.salt);
                sessionStorage.setItem('vault_key', symmetricKey);
                window.location.href = '/';
            })
        }
    })
}

async function login(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const formObject = Object.fromEntries(formData.entries());

    if (formObject.password.length < 8) {
        showErrorBanner('Incorrect Password Length', 'insufficient password length');
        return;
    }

    const masterPassword = formObject.password;

    fetch('/users/salt?email=' + formObject.email, {
        method: 'GET'
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            showErrorBanner('something went wrong', errorText);
            return;
        }

        const salt = await response.text();
        await init();
        
        const masterKey = derive_key_from_master_password_with_defined_salt(masterPassword, salt);
        const challenge = masterKey + 'authentication';
        const hmac = generate_auth_hmac(masterKey, challenge);

        fetch('/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "email": formObject.email,
                "auth_hash": hmac
            }) 
        })
        .then(async response => {
            if (!response.ok) {
                const errorText = await response.text();
                showErrorBanner('something went wrong', errorText);
                return;
            }

            return response.json();
        })
        .then(user => {
            if (!user) {
                return;
            }
            sessionStorage.setItem('username', user.username);
            sessionStorage.setItem('email', user.email);
            sessionStorage.setItem('salt', user.salt);

            const symmetricKey = derive_key_from_master_password_with_defined_salt(masterKey, salt);
            sessionStorage.setItem('vault_key', symmetricKey);
            window.location.href = '/';
        })
    })
}

if (window.location.href === local_url + 'register') {
    document.getElementById('register_form').addEventListener('submit', register_user);
}

if (window.location.href === local_url + 'login') {
    document.getElementById('login_form').addEventListener('submit', login);
}

if (window.location.href === local_url + 'register' || window.location.href === local_url + 'login') {
    sessionStorage.clear();
    fetch('/users/logout', {
        method: 'GET'
    })
}
