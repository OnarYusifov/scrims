# Password Hashing Issue Investigation Report

## Problem Statement
The user suspects that passwords might be double-encrypted, causing login failures where passwords don't match the database.

## Current Flow Analysis

### Registration Flow
1. **Client Side** (`apps/frontend/app/login/page.tsx:150`):
   - User enters password: `"mypassword"`
   - Calls `hashPassword(data.password)` with NO salt parameter
   - Generates NEW salt: `bcrypt.genSaltSync(10)` → e.g., `"$2a$10$abcdefghijklmnopqrstuv"`
   - Hashes password: `bcrypt.hashSync("mypassword", "$2a$10$abcdefghijklmnopqrstuv")` 
   - Result: `"$2a$10$abcdefghijklmnopqrstuv...31chars"`
   - ✅ **Sends hashed password to backend**

2. **Backend** (`apps/backend/src/routes/auth.ts:68`):
   - Receives: `"$2a$10$abcdefghijklmnopqrstuv...31chars"`
   - **Stores directly** (no re-hashing): `password: hashedPassword`
   - ✅ **No double encryption here**

### Login Flow
1. **Client Side** (`apps/frontend/app/login/page.tsx:85-103`):
   - User enters password: `"mypassword"`
   - Requests salt: `GET /api/auth/get-password-salt` with email
   
2. **Salt Endpoint** (`apps/frontend/app/api/auth/get-password-salt/route.ts:40`):
   - Finds user in database
   - Extracts salt: `hash.substring(0, 29)` → `"$2a$10$abcdefghijklmnopqrstuv"`
   - Returns salt to client
   
3. **Client Side** (continues):
   - Receives salt: `"$2a$10$abcdefghijklmnopqrstuv"`
   - Hashes: `hashPassword("mypassword", "$2a$10$abcdefghijklmnopqrstuv")`
   - Uses: `bcrypt.hashSync("mypassword", "$2a$10$abcdefghijklmnopqrstuv")`
   - **PROBLEM**: This generates a NEW hash, which will be DIFFERENT from the stored hash!
   - Sends: `"$2a$10$abcdefghijklmnopqrstuv...DIFFERENT31chars"`

4. **Auth.js** (`apps/frontend/auth.ts:79-82`):
   - Receives: `"$2a$10$abcdefghijklmnopqrstuv...DIFFERENT31chars"`
   - Compares: `password === user.password`
   - Stored: `"$2a$10$abcdefghijklmnopqrstuv...ORIGINAL31chars"`
   - ❌ **Hashes don't match!**

## Root Cause

**The fundamental issue**: You **CANNOT** recreate the same bcrypt hash by extracting the salt and re-hashing. 

### Why This Doesn't Work:
1. Bcrypt hashes are deterministic ONLY when using `bcrypt.compare(plainPassword, storedHash)`
2. Even with the same salt, `bcrypt.hashSync()` may produce different hashes due to:
   - Internal bcrypt implementation details
   - Random elements in the hashing process
   - The salt extraction method (first 29 chars) may not be the correct format for `bcrypt.hashSync()`

### The Correct Approach:
Bcrypt is designed to be verified using `bcrypt.compare(plainPassword, storedHash)`, NOT by re-hashing and comparing strings.

## Current Code Issues

1. **Salt Extraction** (`apps/frontend/lib/password-hash.ts:32-37`):
   ```typescript
   export function extractSaltFromHash(hash: string): string | null {
     if (hash.match(/^\$2[ayb]\$/)) {
       return hash.substring(0, 29); // ❌ This may not work correctly
     }
     return null;
   }
   ```

2. **Password Comparison** (`apps/frontend/auth.ts:79-82`):
   ```typescript
   // ❌ This will NEVER work correctly
   isValidPassword = password === user.password;
   ```

3. **Login Hashing** (`apps/frontend/app/login/page.tsx:103`):
   ```typescript
   // ❌ This creates a DIFFERENT hash
   const hashedPassword = await hashPassword(data.password, saltData.salt);
   ```

## Solutions

### Option 1: Send Plain Password (Current Industry Standard) ✅ RECOMMENDED
- Client sends plain password over HTTPS
- Server uses `bcrypt.compare(plainPassword, storedHash)`
- **Pros**: Works correctly, standard approach, secure over HTTPS
- **Cons**: Password transmitted (but encrypted via HTTPS)

### Option 2: Use SHA-256 + Bcrypt (Double Hashing)
- Client: `SHA256(password)` → sends hash
- Server: `bcrypt.hash(SHA256_hash)` → stores
- Login: Client sends SHA256 hash, server uses `bcrypt.compare(sha256Hash, storedHash)`
- **Pros**: Password never sent in any form
- **Cons**: More complex, still need `bcrypt.compare` on server

### Option 3: Client-Side Bcrypt with Server Verification (Current Attempt - BROKEN)
- ❌ **This approach is fundamentally flawed and cannot work**

## Recommendation

**Use Option 1** - Send plain password over HTTPS and use `bcrypt.compare()` on the server. This is:
- The industry standard
- Secure (HTTPS encrypts in transit)
- Simple and reliable
- What most major platforms do (GitHub, Google, etc.)

## Files That Need Changes

1. `apps/frontend/app/login/page.tsx` - Remove salt fetching, send plain password
2. `apps/frontend/auth.ts` - Use `bcrypt.compare()` instead of string comparison
3. `apps/frontend/app/api/auth/get-password-salt/route.ts` - Can be removed
4. `apps/frontend/lib/password-hash.ts` - Keep for registration, but login should send plain

## Verification

To verify the issue, check the logs:
- Registration stores: `$2a$10$...hash1`
- Login creates: `$2a$10$...hash2` (different!)
- Comparison: `hash1 === hash2` → `false` ❌


