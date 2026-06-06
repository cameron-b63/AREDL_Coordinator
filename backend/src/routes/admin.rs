use crate::auth::{has_coordinator_role, require_admin, resolve_session_identity, resolve_session_user, AuthError};
use crate::board::invalidate_board_cache;
use crate::claims::{
    build_claim_mutation_response, delete_all_claims_for_level, delete_claims_for_user_ids,
    execute_claims_sql, list_distinct_claim_holders, ClaimsSqlResult,
};
use serde::{Deserialize, Serialize};
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ClaimsSqlBody {
    sql: String,
}

pub async fn admin_reset_claim(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let identity = match resolve_session_identity(&req, &ctx.env) {
        Ok(identity) => identity,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return forbidden(),
    };

    if require_admin(&identity).is_err() {
        return forbidden();
    }

    let user = match resolve_session_user(&req, &ctx.env).await {
        Ok(user) => user,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return forbidden(),
    };
    let level_id = path_param(&req, "/api/admin/claims/")?;
    delete_all_claims_for_level(&ctx.env, &level_id).await?;
    invalidate_board_cache(&ctx.env).await?;

    let body = build_claim_mutation_response(&ctx.env, &user.id, &level_id, None).await?;
    Response::from_json(&body)
}

pub async fn admin_prune_claims(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let identity = match resolve_session_identity(&req, &ctx.env) {
        Ok(identity) => identity,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return forbidden(),
    };

    if require_admin(&identity).is_err() {
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

pub async fn admin_execute_claims_sql(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let identity = match resolve_session_identity(&req, &ctx.env) {
        Ok(identity) => identity,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return forbidden(),
    };

    if require_admin(&identity).is_err() {
        return forbidden();
    }

    let body: ClaimsSqlBody = match req.json().await {
        Ok(body) => body,
        Err(_) => {
            return bad_request("Expected JSON body with sql");
        }
    };

    let sql = body.sql.trim();
    if sql.is_empty() {
        return bad_request("SQL must not be empty");
    }

    match execute_claims_sql(&ctx.env, sql).await {
        Ok(ClaimsSqlResult::Mutation { changes }) => {
            if changes > 0 {
                invalidate_board_cache(&ctx.env).await?;
            }
            Response::from_json(&ClaimsSqlResult::Mutation { changes })
        }
        Ok(result) => Response::from_json(&result),
        Err(err) => bad_request(&err.message()),
    }
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

fn bad_request(message: &str) -> Result<Response> {
    Ok(Response::from_json(&ErrorBody {
        error: "bad_request",
        message: message.into(),
    })?
    .with_status(400))
}
