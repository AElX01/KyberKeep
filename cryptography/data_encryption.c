#include <sodium.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>


#define ADDITIONAL_DATA (const unsigned char *) "123456"
#define ADDITIONAL_DATA_LEN 6

const char *encrypt_data(const char *plaintext) {
    if (sodium_init() < 0) {
        return "ERROR";
    }

    size_t plaintext_len = strlen(plaintext);
    unsigned char nonce[crypto_aead_chacha20poly1305_NPUBBYTES];
    unsigned char key[crypto_aead_chacha20poly1305_KEYBYTES];
    unsigned char *ciphertext = malloc(plaintext_len + crypto_aead_chacha20poly1305_ABYTES);
    unsigned long long ciphertext_len = 0;

    if (!ciphertext) {
        return "ERROR";
    }

    crypto_aead_chacha20poly1305_keygen(key);
    randombytes_buf(nonce, sizeof nonce);

    if (crypto_aead_chacha20poly1305_encrypt(
        ciphertext, &ciphertext_len,
        (const unsigned char *)plaintext, plaintext_len,
        ADDITIONAL_DATA, ADDITIONAL_DATA_LEN,
        NULL, nonce, key) != 0) {
        free(ciphertext);
        return "Error: Encryption failed";
    }

    // Allocate space for the output JSON-like string
    size_t output_len = 2 * (ciphertext_len + sizeof(nonce) + sizeof(key)) + 50;
    char *output = malloc(output_len);
    if (!output) {
        free(ciphertext);
        return "Error: Memory allocation failed";
    }

    // Format the encrypted output as JSON-like structure
    snprintf(output, output_len,
             "{ \"nonce\": \"");
    for (size_t i = 0; i < sizeof nonce; i++) {
        snprintf(output + strlen(output), 3, "%02x", nonce[i]);
    }
    strcat(output, "\", \"key\": \"");
    for (size_t i = 0; i < sizeof key; i++) {
        snprintf(output + strlen(output), 3, "%02x", key[i]);
    }
    strcat(output, "\", \"ciphertext\": \"");
    for (size_t i = 0; i < ciphertext_len; i++) {
        snprintf(output + strlen(output), 3, "%02x", ciphertext[i]);
    }
    strcat(output, "\" }");

    free(ciphertext);
    return output;
}