# Access matrix

Current behaviour is what the RLS policies, grants, and page code do. It was read from SQL and TypeScript. It was not executed against a hosted project. Target is the spec. "No" means there is no such capability in the schema.

| Action | Anonymous | Signed-in non-designer | Designer, own rows | Designer, someone else's rows | Admin | Service role |
| --- | --- | --- | --- | --- | --- | --- |
| Read designer public profile | Yes, all columns, including bank account, phone, email, subaccount | Same | Same | Same | No admin | Bypasses RLS |
| Insert designer row | No, after migration 3 revokes anon insert | Yes, `id` must equal `auth.uid()` | Yes, self | Cannot insert for another id | No | Bypasses RLS |
| Update designer row, including `verified` and bank fields | No | Only if the row id is their user id | Yes, any column | No | No | Bypasses RLS |
| Read drops | Yes, every drop | Yes | Yes | Yes | No | Bypasses RLS |
| Insert or update a drop, including `status`, `price`, `current_qty` | No, anon write revoked | Only if a `designers` row exists for their user id | Yes | No | No | Bypasses RLS |
| Delete a drop | No | Owner only | Yes, cascades toward preorders | No | No | Bypasses RLS |
| Insert preorder from the client | No, policy removed | No | No | No | No | Yes. Webhook does this |
| Read preorders | No | No | Yes, for their drops | No | No | Bypasses RLS |
| Buyer reads their own orders | No buyer identity | No | Only if they are also the designer | No | No | Bypasses RLS |
| Update preorder status | No client policy found | No | No | No | No | Webhook sets `paid` on insert |
| Room posts | Read yes. Insert revoked for anon | Insert if `user_id = auth.uid()` | Same | Same | No | Bypasses RLS |
| Upload, replace, or delete any drop image | No | Yes, whole bucket | Yes, whole bucket, not only their prefix | Yes | No | Storage policies as written |
| Initialize Paystack (`pay`) | Yes. `verify_jwt = false` | Yes | Yes | Yes | n/a | Uses service role inside the function |
| Create Paystack subaccount | Yes. `verify_jwt = false` | Yes | Yes | Yes | n/a | Secret stays in the function env |
| Call `increment_drop_qty` | Grant is not revoked from PUBLIC in the migration. Treat as callable until a hosted check says otherwise | Same | Same | Same | No role | Granted |
| Approve a designer or a campaign | No | No | No | No | Role does not exist | No function |
| Issue a verification badge | No workflow | No | Can set `verified` true on their own row | No | Role does not exist | No |

## Target (not built)

| Rule | Target |
| --- | --- |
| Designer capability | An approved participation row, checked on the server. Not a field the browser can set. |
| Admin | `platform_roles` written only outside the app. Functions re-check the caller. |
| Self-approval | No function allows it. |
| Orders | A customer reads and updates nothing on another customer's order. A designer reads orders for their campaigns and cannot change payment status. |
| Payment results | Only the payment function, after signature and verify, writes success. |
| Public designer read | Brand name and public profile. No bank, phone, email, or subaccount. |
| Evidence files | Private bucket, signed URLs, owner-only, admin review. |
| Images | Public read of campaign images. Write and delete only under that designer's prefix. |
| Badges | Rendered from verification-check rows. Designers cannot insert those rows. None are issued until the procedure is approved. |

## Privileged functions today

| Function | Auth today | Gap |
| --- | --- | --- |
| `pay` | None. JWT verification off. | Should require a signed-in buyer once checkout requires an account, and should ignore client prices. |
| `create-subaccount` | None. | Should not run until settlement is decided, and then only for an approved designer. |
| `paystack-webhook` | Paystack signature, then verify API. JWT off is appropriate for a webhook. | Dedup and amount checks are incomplete. |
| `createServerClient` in the Next app | Unused. Would use the service-role key. | Do not call it from a route a browser can hit. |
