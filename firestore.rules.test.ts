import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesContent = fs.readFileSync('firestore.rules', 'utf8');

test('firestore.rules enforces default-deny catch-all and rules_version 2', () => {
  assert.match(rulesContent, /rules_version = '2';/);
  assert.match(rulesContent, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules blocks casino and poker challenge creation while permitting other', () => {
  assert.match(rulesContent, /data\.category in \['sports', 'location', 'truth_or_dare', 'movie_predictions', 'other'\]/);
  assert.doesNotMatch(rulesContent, /'casino'/);
  assert.doesNotMatch(rulesContent, /'poker'/);
});

test('firestore.rules validates nickname and followingIds on /users/{userId}', () => {
  assert.match(rulesContent, /'nickname'/);
  assert.match(rulesContent, /'followingIds'/);
});

test('firestore.rules enforces email_verified on admin and write operations', () => {
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesContent, /isVerifiedUser\(\)/);
});

test('firestore.rules isolates PII inside /users/{userId}/private and restricts wallet_accounts updates', () => {
  assert.match(rulesContent, /match \/private\/\{docId\}/);
  assert.match(rulesContent, /allow list: if false;/);
  assert.match(rulesContent, /match \/wallet_accounts\/\{userId\}/);
});
