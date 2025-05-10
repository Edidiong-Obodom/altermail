import { randomNumber } from ".";

/**
 * Encrypts data using the Web Crypto API with AES-256-CBC algorithm.
 *
 * This asynchronous function takes any data and a secret key, derives a 256-bit key using PBKDF2
 * with the provided secret key and a fixed salt, and encrypts the data using AES-256-CBC with a random
 * initialization vector (IV). The resulting ciphertext is formatted as 'iv:encryptedData'.
 *
 * @param {any} data - The data to be encrypted. This can be of any type, as it will be stringified to JSON.
 * @param {string} secretKey - The secret key used for key derivation and encryption.
 * @returns {Promise<string>} A promise that resolves to the encrypted data in the format 'iv:encryptedData'.
 *
 * @example
 * const secretKey = 'your-secret-key';
 * const data = { example: 'data' };
 * const encrypted = await encryptDataWeb(data, secretKey);
 * console.log('Encrypted (Web):', encrypted);
 */
export const encryptDataWeb = async (data: any, secretKey: string) => {
  const algorithm = "AES-GCM";
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Generate a random initialization vector
  const salt = `${randomNumber()}`;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: algorithm, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    {
      name: algorithm,
      iv: iv,
    },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  );

  // Split the encrypted data into ciphertext and authentication tag
  const encryptedArray = new Uint8Array(encrypted);
  const authTag = encryptedArray.slice(encryptedArray.length - 16);
  const ciphertext = encryptedArray.slice(0, encryptedArray.length - 16);

  // Concatenate IV, ciphertext, and authentication tag
  const result = `${Buffer.from(salt).toString("hex")}:${Buffer.from(
    iv
  ).toString("hex")}:${Buffer.from(ciphertext).toString("hex")}:${Buffer.from(
    authTag
  ).toString("hex")}`;
  return result;
};

/**
 * Decrypts data encrypted with the Web Crypto API using AES-256-CBC algorithm.
 *
 * This asynchronous function takes an encrypted ciphertext in the format 'iv:encryptedData' and a secret key,
 * derives a 256-bit key using PBKDF2 with the provided secret key and a fixed salt, and decrypts the data using
 * AES-256-CBC with the provided initialization vector (IV). The resulting plaintext is parsed back to its original form.
 *
 * @param {string} ciphertext - The encrypted data in the format 'iv:encryptedData'.
 * @param {string} secretKey - The secret key used for key derivation and decryption.
 * @returns {Promise<any>} A promise that resolves to the decrypted data, parsed back to its original form.
 *
 * @example
 * const secretKey = 'your-secret-key';
 * const encrypted = 'iv:encryptedData'; // Example encrypted data
 * const decrypted = await decryptDataWeb(encrypted, secretKey);
 * console.log('Decrypted (Web):', decrypted);
 */
export const decryptDataWeb = async (ciphertext: string, secretKey: string) => {
  const algorithm = "AES-GCM";
  const [saltHex, ivHex, ciphertextHex, authTagHex] = ciphertext.split(":");
  const salt = Buffer.from(saltHex, "hex");
  const iv = Uint8Array.from(Buffer.from(ivHex, "hex"));
  const encryptedData = Uint8Array.from(Buffer.from(ciphertextHex, "hex"));
  const authTag = Uint8Array.from(Buffer.from(authTagHex, "hex"));

  // Combine the encrypted data and authentication tag
  const encryptedArray = new Uint8Array(encryptedData.length + authTag.length);
  encryptedArray.set(encryptedData);
  encryptedArray.set(authTag, encryptedData.length);

  // Derive the key using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: algorithm, length: 256 },
    false,
    ["decrypt"]
  );

  // Decrypt the data
  const decrypted = await crypto.subtle.decrypt(
    {
      name: algorithm,
      iv: iv,
    },
    key,
    encryptedArray
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
};
