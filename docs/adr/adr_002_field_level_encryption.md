# Architecture Decision Record 002: Field-Level AES-256-GCM Encryption & Blind Indexing

## Status
Approved

## Context
Compliance regulations (e.g., GDPR, HIPAA) require that Personally Identifiable Information (PII) like name and email address be encrypted at rest. Simply encrypting the database storage drive is insufficient if an attacker gains read access to the database queries (SQL/NoSQL injection or database dump theft). 

However, standard encryption (like AES-256-GCM) produces different ciphertexts for the same plaintext due to random Initialization Vectors (IVs). This prevents us from running query operations like `UserModel.findOne({ email: "user@example.com" })` because the ciphertext value in the database changes on every update.

## Decision
We implemented a two-part field-level protection strategy in The CirCle:
1. **AES-256-GCM Encryption:** Name and email fields are encrypted before saving using `crypto.createCipheriv` with a key derived via PBKDF2. A random 12-byte IV is prepended to the ciphertext. Decryption happens automatically in Mongoose post-find hooks.
2. **Deterministic Blind Indexing:** We compute a SHA-256 hash of the normalized email combined with a separate database salt. This hash is stored in a dedicated field (`emailHash`) and indexed. When looking up a user during login or search, we hash the user's input email using the same salt and run a query matching the `emailHash` index. This permits exact-match lookups without exposing raw email texts in the database.

## Consequences
* **Pros:**
  * **Strong Cryptographic Security:** AES-256-GCM ensures that even if database records are stolen, PII fields cannot be decrypted without the environment's master keys.
  * **High Performance Querying:** Blind indexing permits $O(1)$ lookups on the encrypted email field.
  * **Tamper Verification:** GCM tag authentication ensures ciphertext modification by an attacker is detected during decryption.
* **Cons:**
  * **Exact Match Only:** We cannot perform wildcard queries (e.g., finding all emails starting with `user%`) on the database level. Search queries require exact email lookup.
