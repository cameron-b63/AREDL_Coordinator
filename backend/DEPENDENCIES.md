# Backend dependency policy

This Worker uses [workers-rs](https://github.com/cloudflare/workers-rs) (`worker` crate). Most compile time and bundle size comes from the `worker` dependency graph (~80 transitive crates), not application code. Keep direct dependencies lean.

## Direct dependency budget

Target **≤ 5 direct dependencies** for this project. Before adding a crate:

1. Confirm it supports `wasm32-unknown-unknown`.
2. Run `cargo tree -i {crate}` from `backend/` to see blast radius.
3. Ask whether `Fetch`, D1, or env vars already solve the problem.

## Platform APIs first

| Need | Lean choice | Avoid |
|---|---|---|
| HTTP to AREDL / Discord | `Fetch::Request` | `reqwest`, `hyper` client |
| JSON responses | `serde` + `Response::from_json` | Extra JSON crates |
| D1 | Re-enable `worker` `d1` feature; parameterized SQL via `env.d1("DB")` | ORMs, query builders |
| JWT sessions | `hmac` + `sha2` + `base64` + manual claims, or one vetted wasm32 JWT crate | Heavy auth frameworks |
| IDs / randomness | `uuid` with minimal features, or Workers crypto | `nanoid`, large crypto suites |
| Time | ISO strings from D1 `datetime('now')`; parse only when needed | `chrono` in app code |

## `worker` feature flags — opt-in only

Never enable unless actively used:

| Feature | Enable when |
|---|---|
| `d1` | Writing D1 queries (currently disabled until implemented) |
| `queue` | Background jobs via Queues |
| `axum` | Deliberately using axum integration |
| `timezone` | Almost never needed here |

To enable D1:

```toml
worker = { version = "0.8", features = ["d1"] }
```

## Release profile

`Cargo.toml` uses a CI-friendly release profile (`thin` LTO, parallel codegen units). If deploy fails on WASM size limits, tighten to full LTO and `codegen-units = 1` before adding more dependencies.

## Adding a dependency checklist

- [ ] Required for a feature we are building now (not “just in case”)
- [ ] wasm32-compatible
- [ ] `cargo tree -i` reviewed
- [ ] No duplicate of an existing platform API
- [ ] Documented in this file if non-obvious
