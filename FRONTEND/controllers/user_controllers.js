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

async function update_user_info(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const formObject = Object.fromEntries(formData.entries());

    if (!(formObject.username.length && formObject.email.length)) {
       alert('no changes')
        return;
    } else if (formObject.username.length && formObject.email.length) {
        if (!formObject.password.length) {
            alert('no master password provided')
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
                }) // LAST CHANGE
            })
        }
    } else if (formObject.username.length) {

    } else if (formObject.email.length) {

    }

    fetch('/users/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "username": formObject.username,
            "email": formObject.email
        })
    })
}


if (window.location.href === local_url + 'settings') {
    let username = document.getElementById('modal-edit-username');
    username.placeholder = sessionStorage.username;

    document.getElementById('edit-user-info-form').addEventListener('submit', update_user_info);
}

populate_user_info();