# Veri-Fi Firestore Security Specification

## 1. Data Invariants
1. **Identity Isolation**: Public profiles (`/users/{userId}`) contain zero PII (`email`, `jurisdictionCode`, `connectedSolanaPubkey`). Private PII lives strictly in `/users/{userId}/private/info` readable only by `userId` or a verified admin.
2. **No Self-Assigned Roles**: Users cannot write `role`, `isAdmin`, or modify `/admins/{uid}` or `/categories/{id}`.
3. **Category Enforcement**: Challenges cannot be created with `category == 'casino'` or `category == 'poker'` when those categories are disabled.
4. **Immutable Financial Ledger**: `/wallet_ledger/{entryId}` cannot be arbitrarily updated or deleted by clients, and users cannot inflate their own `/wallet_accounts/{userId}` balances arbitrarily.
5. **Challenge Integrity**: `creatorId`, `stakeLamports`, and `createdAt` are immutable once created. Rules cannot be altered after `opponentId` joins. Terminal statuses (`Completed`, `Won`, `Lost`, `Cancelled`, `Refunded`) are locked against non-admin mutations.
6. **Private Chat Isolation**: Only `participantA` or `participantB` of `/conversations/{conversationId}` can read or write inside `/conversations/{conversationId}/messages/{messageId}`.
7. **Temporal & Path Integrity**: All IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), strings have strict `.size()` bounds, and timestamps match `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Admin Escalation**: `users/attacker` write with `{ ..., isAdmin: true }` -> `PERMISSION_DENIED` (blocked by `hasOnly`).
2. **Email Spoofing**: Request with `email: 'blessedogle52@gmail.com'` and `email_verified: false` -> `PERMISSION_DENIED`.
3. **PII Snooping**: Non-owner authenticated user reads `/users/victim/private/info` -> `PERMISSION_DENIED`.
4. **Disabled Category Bypass**: Create challenge with `category: 'casino'` or `'poker'` -> `PERMISSION_DENIED`.
5. **Rule Tampering After Acceptance**: Creator updates `rules` or `stakeLamports` on an `Active` challenge -> `PERMISSION_DENIED`.
6. **Terminal State Replay**: User updates a `Completed` challenge back to `Open` -> `PERMISSION_DENIED`.
7. **Chat Eavesdropping**: User C reads `/conversations/conv_A_B/messages/msg1` -> `PERMISSION_DENIED`.
8. **Sender Impersonation**: User A writes chat message with `senderId: 'userB'` -> `PERMISSION_DENIED`.
9. **ID Poisoning**: Write document with 500-char ID or invalid slash characters -> `PERMISSION_DENIED`.
10. **Payload Exhaustion**: Write challenge title > 140 chars or bio > 280 chars -> `PERMISSION_DENIED`.
11. **Ledger Tampering**: User updates existing `/wallet_ledger/{id}` entry to change `netLamports` -> `PERMISSION_DENIED`.
12. **Self-Referral Fraud**: User creates referral with `referrerUid == request.auth.uid && referredUid == request.auth.uid` -> `PERMISSION_DENIED`.
