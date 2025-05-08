<div align="center">
  <img src="FRONTEND/assets/icon/banner.svg" alt="Logo" width="500px" height="500px">
</div>

An experimental web-based password manager with a zero-knowledge architecture.

> [!TIP]
> **We recommend deploying KyberKeep in a secure remote server using a VPN. An HTTPS connection will not guarantee security.**

## features

- Website icons
- Personal vault
- Zero-knowledge cryptography
- Password generation
- Username generation

## security

- Zero-knowledge cryptography
- Backend will only collect information such as your email, the name of your login information (e.g. *Github portal*, *Gitlab auth*) and the url of the login information (e.g. *https://github.com*)
- Credentials are encrypted and decrypted in frontend using ChaCha20-Poly1305

> [!IMPORTANT]
> **This is still an experimental project and we DO NOT recommend to use it as your daily password manager. HMAC challenges are static, the session storage saves the vault's encryption key in raw plaintext, and user's request are never verified by signing them. All these are important security flaws with strongly advise you to take serious.**