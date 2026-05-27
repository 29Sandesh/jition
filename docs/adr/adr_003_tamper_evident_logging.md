# Architecture Decision Record 003: Tamper-Evident Cryptographic Logging Chain

## Status
Approved

## Context
Privileged user operations (e.g., membership updates, workspace deletions, security config edits) must be logged for security audits. However, if a malicious user gains database access, they can delete or alter audit log records to cover their tracks. We needed a way to guarantee that audit logs are tamper-evident and that any deletion or mutation of historical logs is immediately detectable.

## Decision
We implemented a cryptographically linked, append-only logging chain for all entries in the `AuditLog` model in The CirCle. 
Every time a new log is created:
1. We retrieve the `hash` of the immediately preceding audit log document.
2. We compute the current log's hash by hashing its contents (`actorId`, `action`, `resourceId`, `timestamp`, `ipAddress`, etc.) concatenated with the `previousHash`.
3. We persist the calculated hash as `hash` and the previous log's hash as `previousHash`.
4. If it is the first record in the database, we use a constant genesis hash as the `previousHash`.

A validation cron check can run periodically to recompute the hashes sequentially from the genesis block to verify that no records have been removed, appended out of order, or updated.

## Consequences
* **Pros:**
  * **Strong Tamper Evidence:** Deleting a row or changing a field inside an audit log breaks the cryptographic chain for all subsequent entries, exposing the intrusion.
  * **Simple Verification:** Integrity verification is lightweight, requiring a single sequence query and hash recalculations in memory.
* **Cons:**
  * **Strict Ordering:** Concurrent writes to the audit log must be sequentially ordered (using a lock or database serialization) to prevent race conditions when reading the previous hash.
