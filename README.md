# SmartShop Enterprise

## Local Development

Requirements: Node.js 24 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:5173. The Vite server proxies `/api` requests to the local auth API on port 3001. Authentication data is stored in `server/data/auth.sqlite`, which is ignored by Git.

Run the auth integration tests with:

```sh
npm test
```

## Local Account Flow

- Register with a name, email, phone number, and a password of at least 8 characters containing uppercase, lowercase, a number, and a symbol.
- In development, the verification action is shown in the account dialog; no email is sent.
- Sign in after verification. Sessions use an HTTP-only cookie and persist in SQLite across server restarts until expiry or logout.
- Password reset codes are shown in the development account dialog; no email or SMS is sent.
- Passwords are hashed with bcrypt. Resetting a password revokes the user's existing sessions.
- Optional authenticator-app MFA is available from the signed-in account dialog. MFA disablement requires the current password and authenticator code.
- MFA seeds are encrypted at rest. MFA recovery codes are not implemented; keep access to the configured authenticator app.

## Current Limits

This local implementation is not production-ready. No email provider is configured, so registration, verification resend, and password recovery are disabled when `NODE_ENV=production`. Production startup also requires a 32-byte `MFA_ENCRYPTION_KEY` provided through the deployment secret manager. Social sign-in, MFA recovery codes, persistent carts/orders, and a production email service are not implemented. Do not deploy this as a customer authentication service until those requirements, deployment secrets, HTTPS, and operational controls are addressed.

The checkout payment step is a browser-only simulation. It does not collect card data, move money, or persist an order.