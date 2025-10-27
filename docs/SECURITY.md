# Security Guidelines

## ✅ Protected Files

The following sensitive files are excluded from git:

- `solana_wallets.json` - Contains private keys (NEVER commit!)
- `.env.devnet` - Environment variables
- `.env.test` - Test environment variables
- `.env.production` - Production environment variables
- `*.env` - All environment files

## 🔒 Wallet Security

**NEVER commit wallet private keys to git!**

The `solana_wallets.json` file contains:
- Private keys (base58 encoded)
- Secret keys (hex encoded)
- Public keys (safe to share)

**Always verify** that `solana_wallets.json` is in `.gitignore` before committing.

## ✅ Verification

Run these commands to verify no secrets are in git:

```bash
# Check for wallet files
git ls-files | grep wallet

# Check for env files
git ls-files | grep "\.env"

# Search for private keys in git history
git log --all --full-history -- "*.json" | grep -i "private"
```

## 📝 Pre-Commit Checklist

Before committing:
1. ✅ Verify `solana_wallets.json` is gitignored
2. ✅ Verify `.env*` files are gitignored
3. ✅ Check `git status` for any sensitive files
4. ✅ Run `git diff` to verify no secrets

## 🚨 If Secrets Are Exposed

If you accidentally commit secrets:

1. **Immediately** rotate the compromised keys
2. Use `git filter-branch` or `git-filter-repo` to remove from history
3. Force push after cleaning history
4. Notify team members to re-clone the repository

## 🔑 Generating New Wallets

Use the provided script:

```bash
npm run generate-wallets
```

This creates a new wallet and saves it to `solana_wallets.json` (gitignored).

