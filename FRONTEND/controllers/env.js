const local_url = "http://127.0.0.1:3000/";
const loaderContainer = document.getElementById("loader");

function show_banner(message) {
    const warning = document.querySelector('.warning');
    const text = document.getElementById('warning_text');

    warning.style.removeProperty('display');
    warning.style.background = '#FF6B6B';
    text.innerText = message;
  
    setTimeout(() => {
      warning.style.display = 'none';
    }, 3000);
}

if (window.location.href != local_url + 'login' && window.location.href != local_url + 'register') {
    const notification_icon = document.getElementById('notification_icon');
    notification_icon.style.display = 'none';
}


