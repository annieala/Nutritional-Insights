// Encryption Utilities
// Client-side encryption using Web Crypto API

class EncryptionUtils {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
  }

  // Generate a random encryption key
  async generateKey() {
    try {
      const key = await window.crypto.subtle.generateKey(
        {
          name: this.algorithm,
          length: this.keyLength
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      return key;
    } catch (error) {
      console.error('Error generating key:', error);
      throw error;
    }
  }

  // Export key to store (as base64)
  async exportKey(key) {
    try {
      const exported = await window.crypto.subtle.exportKey('raw', key);
      return this.arrayBufferToBase64(exported);
    } catch (error) {
      console.error('Error exporting key:', error);
      throw error;
    }
  }

  // Import key from storage
  async importKey(base64Key) {
    try {
      const keyBuffer = this.base64ToArrayBuffer(base64Key);
      
      const key = await window.crypto.subtle.importKey(
        'raw',
        keyBuffer,
        {
          name: this.algorithm,
          length: this.keyLength
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      return key;
    } catch (error) {
      console.error('Error importing key:', error);
      throw error;
    }
  }

  // Encrypt data
  async encrypt(data, key) {
    try {
      // Generate random IV (Initialization Vector)
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Convert data to ArrayBuffer
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(JSON.stringify(data));
      
      // Encrypt
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        dataBuffer
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);
      
      // Return as base64
      return this.arrayBufferToBase64(combined.buffer);
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw error;
    }
  }

  // Decrypt data
  async decrypt(encryptedData, key) {
    try {
      // Convert from base64
      const combined = this.base64ToArrayBuffer(encryptedData);
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      
      // Decrypt
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        data
      );
      
      // Convert back to string and parse JSON
      const decoder = new TextDecoder();
      const decryptedString = decoder.decode(decryptedBuffer);
      
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw error;
    }
  }

  // Derive key from password (PBKDF2)
  async deriveKeyFromPassword(password, salt = null) {
    try {
      // Generate salt if not provided
      if (!salt) {
        salt = window.crypto.getRandomValues(new Uint8Array(16));
      } else if (typeof salt === 'string') {
        salt = this.base64ToArrayBuffer(salt);
      }
      
      // Import password
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      
      const importedKey = await window.crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      // Derive key
      const derivedKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        importedKey,
        {
          name: this.algorithm,
          length: this.keyLength
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      return {
        key: derivedKey,
        salt: this.arrayBufferToBase64(salt)
      };
    } catch (error) {
      console.error('Error deriving key from password:', error);
      throw error;
    }
  }

  // Hash data (for integrity checks)
  async hash(data) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(JSON.stringify(data));
      
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
      
      return this.arrayBufferToBase64(hashBuffer);
    } catch (error) {
      console.error('Error hashing data:', error);
      throw error;
    }
  }

  // Generate secure random token
  generateToken(length = 32) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return this.arrayBufferToBase64(array.buffer);
  }

  // Helper: ArrayBuffer to Base64
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Helper: Base64 to ArrayBuffer
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Encrypt and store in Firestore
  async encryptAndStore(collectionName, docId, data, userKey) {
    try {
      const encrypted = await this.encrypt(data, userKey);
      const hash = await this.hash(data);
      
      await firebase.firestore().collection(collectionName).doc(docId).set({
        encrypted_data: encrypted,
        data_hash: hash,
        encrypted_at: firebase.firestore.FieldValue.serverTimestamp(),
        algorithm: this.algorithm
      });
      
      // Log encryption
      await AuditLogger.logEvent('data_encrypted', {
        collection: collectionName,
        docId: docId,
        algorithm: this.algorithm
      });
      
      console.log('Data encrypted and stored successfully');
      return true;
    } catch (error) {
      console.error('Error encrypting and storing data:', error);
      throw error;
    }
  }

  // Retrieve and decrypt from Firestore
  async retrieveAndDecrypt(collectionName, docId, userKey) {
    try {
      const doc = await firebase.firestore().collection(collectionName).doc(docId).get();
      
      if (!doc.exists) {
        throw new Error('Document not found');
      }
      
      const docData = doc.data();
      const decrypted = await this.decrypt(docData.encrypted_data, userKey);
      
      // Verify integrity
      const currentHash = await this.hash(decrypted);
      if (currentHash !== docData.data_hash) {
        throw new Error('Data integrity check failed');
      }
      
      // Log decryption
      await AuditLogger.logDataAccess(collectionName, docId, 'decrypt');
      
      return decrypted;
    } catch (error) {
      console.error('Error retrieving and decrypting data:', error);
      throw error;
    }
  }

  // Secure session storage management
  async setSecureSessionData(key, data, password) {
    try {
      const { key: encryptionKey, salt } = await this.deriveKeyFromPassword(password);
      const encrypted = await this.encrypt(data, encryptionKey);
      
      sessionStorage.setItem(key, encrypted);
      sessionStorage.setItem(`${key}_salt`, salt);
      
      console.log('Secure session data set');
    } catch (error) {
      console.error('Error setting secure session data:', error);
      throw error;
    }
  }

  // Retrieve secure session data
  async getSecureSessionData(key, password) {
    try {
      const encrypted = sessionStorage.getItem(key);
      const salt = sessionStorage.getItem(`${key}_salt`);
      
      if (!encrypted || !salt) {
        return null;
      }
      
      const { key: encryptionKey } = await this.deriveKeyFromPassword(password, salt);
      const decrypted = await this.decrypt(encrypted, encryptionKey);
      
      return decrypted;
    } catch (error) {
      console.error('Error getting secure session data:', error);
      return null;
    }
  }

  // Clear secure session data
  clearSecureSessionData(key) {
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(`${key}_salt`);
  }
}

// Initialize encryption utils
const encryptionUtils = new EncryptionUtils();

// Export for use in other files
window.encryptionUtils = encryptionUtils;

console.log('Encryption Utilities initialized');

// Example usage:
/*
// Generate a key
const key = await encryptionUtils.generateKey();

// Encrypt data
const encryptedData = await encryptionUtils.encrypt({ message: "Secret data" }, key);

// Decrypt data
const decryptedData = await encryptionUtils.decrypt(encryptedData, key);

// Or use password-based encryption
const { key: pwdKey, salt } = await encryptionUtils.deriveKeyFromPassword("my-password");
const encrypted = await encryptionUtils.encrypt(data, pwdKey);
*/