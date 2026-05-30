use crate::auth::{has_coordinator_role, require_admin, resolve_session_user, AuthError};
use crate::board::invalidate_board_cache;
use crate::claims::{delete_all_claims_for_level, delete_claims_for_user_ids, list_distinct_claim_holders};
use serde::Serialize;
use worker::{Request, Response, Result, RouteContext};

#[derive(Serialize)]
struct ErrorBody {
    error: &'static str,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PruneResponse {
    pruned: u32,
}

pub async fn admin_reset_claim(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = match resolve_session_user(&req, &ctx.env).await {
        Ok(user) => user,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return forbidden(),
    };

    if require_admin(&ctx.env, &user).await.is_err() {
        return forbidden();
    }

    let level_id = path_param(&req, "/api/admin/claims/")?;
    delete_all_claims_for_level(&ctx.env, &level_id).await?;
    invalidate_board_cache(&ctx.env).await?;

    Ok(Response::empty()?.with_status(204))
}

pub async fn admin_prune_claims(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = match resolve_session_user(&_req, &ctx.env).await {
        Ok(user) => user,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return forbidden(),
    };

    if require_admin(&ctx.env, &user).await.is_err() {
        return forbidden();
    }

    let holders = list_distinct_claim_holders(&ctx.env).await?;
    let mut stale_user_ids = Vec::new();

    for holder in holders {
        let still_coordinator = has_coordinator_role(&ctx.env, &holder.discord_id)
            .await
            .unwrap_or(false);
        if !still_coordinator {
            stale_user_ids.push(holder.user_id);
        }
    }

    let pruned = delete_claims_for_user_ids(&ctx.env, &stale_user_ids).await?;
    if pruned > 0 {
        invalidate_board_cache(&ctx.env).await?;
    }

    Response::from_json(&PruneResponse { pruned })
}

fn path_param(req: &Request, prefix: &str) -> Result<String> {
    let path = req.path();
    path.strip_prefix(prefix)
        .filter(|value| !value.is_empty() && !value.contains('/'))
        .map(str::to_string)
        .ok_or_else(|| worker::Error::RustError("invalid path".into()))
}

fn unauthorized() -> Result<Response> {
    Ok(Response::from_json(&ErrorBody {
        error: "unauthorized",
        message: "Sign in required".into(),
    })?
    .with_status(401))
}

fn forbidden() -> Result<Response> {
    Ok(Response::from_json(&ErrorBody {
        error: "forbidden",
        message: "Admin access required".into(),
    })?
    .with_status(403))
}
