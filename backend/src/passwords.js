// Turns a password into something safe to store, and checks a typed-in
// password against that stored value later. The real password is never
// written to the database, only this derived value.
//
// PBKDF2 is used because it is one of the few password-hashing algorithms
// built into every JavaScript runtime's Web Crypto API (no extra library to
// install). It works by re-hashing the password thousands of times in a
// row, which is cheap for one login attempt but expensive for someone
// trying millions of guesses if the database ever leaked.
//
// A quirk of Cloudflare Workers: on the free plan, a request only gets 10ms
// of actual CPU time before Cloudflare kills it (this does not include time
// spent waiting on the database, only time the CPU spends computing). A very
// high iteration count is safer against guessing but risks tripping that
// limit. 100,000 iterations is the widely recommended floor for PBKDF2-SHA256
// and is what this uses; see decisions.md for what happened when this got
// tested against the real limit.
const PBKDF2_ITERATIONS = 100000;

import { bytesToHex, hexToBytes, timingSafeEqual } from './utils.js';

async function deriveHash(password, saltBytes) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

// Called once, when someone signs up. The salt is random per user so two
// people who happen to pick the same password still get completely
// different stored hashes.
export async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveHash(password, saltBytes);
  return { hash, salt: bytesToHex(saltBytes) };
}

// Called on every login. Re-derives the hash using the same salt that was
// stored for that user, then compares it to what is on file.
export async function verifyPassword(password, saltHex, expectedHashHex) {
  const hash = await deriveHash(password, hexToBytes(saltHex));
  return timingSafeEqual(hash, expectedHashHex);
}
