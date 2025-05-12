// js/background.js

const STORAGE_KEYS = {
    JWT: 'jwt',
    VAULT_KEY: 'vault_key',
    USERNAME: 'username',
    EMAIL: 'email',
    SALT: 'salt'
};

// --- Keep-alive logic ---
let keepAliveIntervalId = null;

function keepAlive() {
    // Clear any existing interval to prevent duplicates if called multiple times
    if (keepAliveIntervalId !== null) {
        clearInterval(keepAliveIntervalId);
    }

    keepAliveIntervalId = setInterval(() => {
        chrome.runtime.getPlatformInfo(function(info) {
        });
    }, 25000);
}

function stopKeepAlive() {
    if (keepAliveIntervalId !== null) {
        clearInterval(keepAliveIntervalId);
        keepAliveIntervalId = null;
        console.log('KyberKeep Service Worker: Keep-alive stopped.');
    }
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('KyberKeep Service Worker: onInstalled event.');
    keepAlive();
});

chrome.runtime.onStartup.addListener(() => {
    console.log('KyberKeep Service Worker: onStartup event.');
    keepAlive();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Background] Message received:', message.type);
    switch (message.type) {
        case 'AUTH_SAVE':
            console.log('[Background] Saving auth data...');
            chrome.storage.local.set({
                [STORAGE_KEYS.JWT]: message.payload.token,
                [STORAGE_KEYS.VAULT_KEY]: message.payload.vault_key,
                [STORAGE_KEYS.USERNAME]: message.payload.username,
                [STORAGE_KEYS.EMAIL]: message.payload.email,
                [STORAGE_KEYS.SALT]: message.payload.salt
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('[Background] Error saving auth data:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    console.log('[Background] Auth data saved.');
                    sendResponse({ success: true });
                }
            });
            return true;
        case 'AUTH_GET':
            console.log('[Background] Getting auth data...');
            chrome.storage.local.get(Object.values(STORAGE_KEYS), items => {
                console.log('[Background] Auth data retrieved:', items);
                if (chrome.runtime.lastError) {
                    console.error('[Background] Error getting auth data:', chrome.runtime.lastError);
                    sendResponse({});
                } else {
                    sendResponse({
                        jwt: items[STORAGE_KEYS.JWT],
                        vault_key: items[STORAGE_KEYS.VAULT_KEY],
                        username: items[STORAGE_KEYS.USERNAME],
                        email: items[STORAGE_KEYS.EMAIL],
                        salt: items[STORAGE_KEYS.SALT]
                    });
                }
            });
            return true;

        case 'AUTH_CLEAR':
            console.log('[Background] Clearing auth data...');
            chrome.storage.local.remove(Object.values(STORAGE_KEYS), () => {
                 if (chrome.runtime.lastError) {
                    console.error('[Background] Error clearing auth data:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    console.log('[Background] Auth data cleared.');
                    sendResponse({ success: true });
                }
            });
            return true;

        default:
            console.warn('[Background] Unknown message type received:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
    }
});