# Deployment guide

Current configuration only. This checkpoint did not deploy, did not change hosting, and did not print secret values.

## What the repo says today

`netlify.toml`:

- Build command: `npx next build`
- Publish directory: `.next`
- Plugin: `@netlify/plugin-nextjs`

`package.json` scripts:

- `dev`: `next dev`
- `build`: `next build`
- `start`: `next start`
- `lint`: `next lint`
- `typecheck`: `tsc --noEmit`
- `test`: `vitest run`

`next.config.js` skips ESLint during `next build` and serves images unoptimized. A production build can succeed while `next lint` still reports the `<img>` warning.

There is no `vercel.json`, no GitHub Actions workflow, no Netlify site id, no branch context, and no Supabase project ref in `supabase/config.toml`.

## Local commands that were run

From a clean `node_modules` on 2026-11-06:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

Results are in TEST_RESULTS.md. All four checks exited 0. Supabase and Paystack variables were unset, so the home page built the demo state.

## Variable names a host would need

Do not commit values. Do not put the service-role key or the Paystack secret in a `NEXT_PUBLIC_` variable.

| Name | Used by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and the home page query |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser, including calls to `pay` and `create-subaccount` |
| `SUPABASE_URL` | Edge functions. Also a server-side fallback name in the browser client |
| `SUPABASE_ANON_KEY` | Fallback name in the browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge functions. Also read by the unused `createServerClient()` |
| `PAYSTACK_SECRET_KEY` | `pay`, `paystack-webhook`, `create-subaccount` |
| `APP_URL` | Paystack callback in `pay`. If missing, the function uses `https://yoloxtreme.tech` |

Edge function secrets live in the Supabase project, not in Netlify, if that is how the functions are deployed. This repo does not record that they have been deployed.

## Auth redirects and webhooks

Not configured in the repo.

- Supabase email confirm and redirect URLs: not set in source. The onboard page uses `supabase.auth.signUp` and then writes `designers`.
- Paystack callback: `${APP_URL}/d/${slug}` or `https://yoloxtreme.tech/d/${slug}`.
- Paystack webhook: not named in source. It would be the deployed URL of `supabase/functions/paystack-webhook`. Signature header: `x-paystack-signature`.

`metadataBase` in `app/layout.tsx` is `https://yoloxtreme.tech`. That host was not checked.

## Database changes

Migrations already in the repo, not run by this checkpoint:

1. `supabase/migrations/20261012234448_create_yoloxtreme_schema.sql`
2. `supabase/migrations/20261012234928_create_storage_bucket.sql`
3. `supabase/migrations/20261013001218_production_security_fixes.sql`

Whether a hosted project has applied them is unknown. Do not run them against a database you have not identified. Do not run the step-2 proposal until it is accepted. It is not a file in `supabase/migrations/`.

## Preview versus production

There is no preview configuration in the repo. The browser client substitutes a placeholder Supabase URL when the public env vars are missing, so a preview can build and then show demo drops. That is not a sandbox payment environment.

The public site https://yoloxtreme-preorder.netlify.app/ is not a deploy of this Next.js app. Do not assume promoting `main` updates it.

Vercel Analytics and Speed Insights are mounted in the root layout. No Vercel project name is in the source. This checkpoint did not change those packages and did not call Vercel.

## Rollback

Application rollback is a git revert of the deploy commit. There is no release tag. Database rollback is not possible from this repo: the migrations do not include down scripts, and `ON DELETE CASCADE` can remove preorders. Do not "roll back" by dropping tables.

## Admin bootstrap

There is no admin user. Do not add one by editing a row in the browser. The proposal is a `platform_roles` insert run outside the app, for an account the founder names.

## Before a future preview

1. Founder names the site and confirms it is not the existing preorder or adoption site unless they mean to replace that site.
2. Next.js is upgraded off 13.5.1 onto the patched line, in its own change, and the build is run again.
3. Preview env uses a Supabase project that is not production, and a Paystack test key.
4. Demo stats are not served as if they were real.
5. Webhook URL and `APP_URL` point at that preview, not at a guessed production domain.
