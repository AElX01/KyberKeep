import init, { derive_key_from_master_password } from "/cryptography/cryptography_rs.js";

async function register_user(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const formObject = Object.fromEntries(formData.entries());
    console.log("Form data:", JSON.stringify(formObject));

    // Get the master password from the form
    const masterPassword = formObject.password;

    // Init WASM and derive key
    await init();
    const key = derive_key_from_master_password(masterPassword);
    console.log("Derived key:", key);

    // Optional: Send the key to the backend
    /*
    fetch('/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formObject, key })
    });
    */
}

if (window.location.href === local_url + 'register') {
    document.getElementById('register_form').addEventListener('submit', register_user);
}
