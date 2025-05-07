function populate_field(text, id) {
    document.getElementById(id).value = text;
}

function generatePassword(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const formObject = Object.fromEntries(formData.entries());
    loaderContainer.classList.remove("hidden");

    fetch('/generate/password', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "length": formObject.length,
            "min": formObject.min,
            "max": formObject.max,
            "lowercase": formObject.lowercase || "off",
            "uppercase": formObject.uppercase || "off",
            "numbers": formObject.numbers || "off",
        })
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            alert('Something went wrong');
            loaderContainer.classList.add("hidden");
            return;
        }

        let password = await response.text();
        loaderContainer.classList.add("hidden");
        populate_field(password, 'generated_password');
    })
}

function generateUser(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const formObject = Object.fromEntries(formData.entries());
    loaderContainer.classList.remove("hidden");

    fetch('/generate/username', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "uppercase": formObject.uppercase || "off",
            "numbers": formObject.numbers || "off",
        })
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            alert('Something went wrong');
            loaderContainer.classList.add("hidden");
            return;
        }

        let username = await response.text();
        loaderContainer.classList.add("hidden");
        populate_field(username, 'generated_username');
    })
}

if (window.location.href === local_url + 'generator') {
    const modal = document.getElementById('main-generate-password');

    modal.querySelectorAll('.modal_cpy_btn').forEach(btn => {
      btn.addEventListener('click', () => {

        const container = btn.closest('.modal-field-group') || btn.closest('.modal-field');
        const input = container.querySelector('.modal-data');
        if (!input) return;
      
   
        if (btn.querySelector('.fa-clone')) {
          navigator.clipboard.writeText(input.value)
            .then(() => {

              btn.innerHTML = '<i class="fas fa-check"></i>';
              setTimeout(() => btn.innerHTML = '<i class="fas fa-clone"></i>', 1000);
            })
            .catch(err => console.error('Clipboard write failed', err));
        }

        else if (btn.querySelector('.fa-eye-slash') || btn.querySelector('.fa-eye')) {

          const isHidden = input.type === 'password';
          input.type = isHidden ? 'text' : 'password';

          btn.innerHTML = `<i class="fas ${isHidden ? 'fa-eye' : 'fa-eye-slash'}"></i>`;
        }
      });
    });

    document.getElementById('generate_password_form').addEventListener('submit', generatePassword);
    document.getElementById('generated_username_form').addEventListener('submit', generateUser);
}