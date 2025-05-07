exports.generatePassword = (req, res) => {
    let length = parseInt(req.body.length) || 12,
        minNumbers = parseInt(req.body.min) || 2,
        minSpecial = parseInt(req.body.max) || 2,
        useUppercase = req.body.uppercase || true,
        useLowercase = req.body.lowercase || true,
        useNumbers = req.body.numbers || true,
        useSpecial = true;

        if (useUppercase == 'on') {
            useUppercase = true;
        } else if (useUppercase == 'off') {
            useUppercase = false;
        } else {
            useUppercase = true;
        }

        if (useLowercase == 'on') {
            useLowercase = true;
        } else if (useLowercase == 'off') {
            useLowercase = false;
        } else {
            useLowercase = true;
        }

        if (useNumbers == 'on') {
            useNumbers = true;
        } else if (useNumbers == 'off') {
            useNumbers = false;
        } else {
            useNumbers = true;
        }

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()-_=+[]{}|;:,.<>?';

    let allowed = '';
    let password = [];

    if (useNumbers) {
        allowed += numbers;
        for (let i = 0; i < minNumbers; i++) {
            password.push(numbers[Math.floor(Math.random() * numbers.length)]);
        }
    }

    if (useSpecial) {
        allowed += special;
        for (let i = 0; i < minSpecial; i++) {
            password.push(special[Math.floor(Math.random() * special.length)]);
        }
    }

    if (useLowercase) {
        allowed += lowercase;
    }

    if (useUppercase) {
        allowed += uppercase;
    }

    while (password.length < length) {
        const char = allowed[Math.floor(Math.random() * allowed.length)];
        password.push(char);
    }

    for (let i = password.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [password[i], password[j]] = [password[j], password[i]];
    }

    res.status(200).send(password.join(''));
}

exports.generateUsername = (req, res) => {
    let length = 8,
        includeNumbers = req.body.numbers || true,
        allUppercase = req.body.uppercase || false;

    if (includeNumbers == 'on') {
        includeNumbers = true;
    } else if (includeNumbers == 'off') {
        includeNumbers = false;
    } else {
        includeNumbers = true
    }

    if (allUppercase == 'on') {
        allUppercase = true;
    } else if (allUppercase == 'off') {
        allUppercase = false;
    } else {
        allUppercase = true
    }

    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    
    let charset = letters;
    if (includeNumbers) {
        charset += numbers;
    }

    let username = '';
    for (let i = 0; i < length; i++) {
        let char = charset[Math.floor(Math.random() * charset.length)];
        username += char;
    }

    if (allUppercase) {
        username = username.toUpperCase();
    }

    res.status(200).send(username);
}