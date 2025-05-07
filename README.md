![]('./assets/icon/Logo.svg)

An experimental web-based and quantum-safe cryptography password manager with a zero-knowledge architecture.

> [!TIP]
> **We recommend deploying KyberKeep in a secure remote server using a VPN. An HTTPS connection will not guarantee security.**

## features

- Website icons
- Personal vault
- Zero-knowledge cryptography
- Post-quantum cryptography algorithms to verify user's identity
- Password generation
- Username generation

## security

- Zero-knowledge cryptography
- Backend will only collect information such as your email, the name of your login information (e.g. *Github portal*, *Gitlab auth*) and the url of the login information (e.g. *https://github.com*)
- Credentials are encrypted and decrypted in frontend using ChaCha20-Poly1305
- User's identity is verified using an authentication hash (not directly related to the master password) signed with Dilithium

> [!IMPORTANT]
> **This is still an experimental project and we DO NOT recommend to use it as your daily password manager. hmac challenges are static, so far, the authenticity of users is checked by signing the authentication hash with Dilithium. The session storage will contain the vault's encryption key in raw plaintext, which is an important KyberKeep's security flaw.**