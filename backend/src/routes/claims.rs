use crate::auth::{resolve_session_user, AuthError};
use crate::aredl::level_has_clan_completion;
use crate::board::invalidate_board_cache;
use crate::claims::{
    build_claim_mutation_response, can_clobber_dominant, delete_user_claim_for_level, insert_claim,
    is_deescalation, is_valid_priority, list_claims_for_level, select_dominant_claim, update_user_claim,
};
use serde::Deserialize;
use serde::Serialize;
use worker::{Request, Response, Result, RouteContext};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SubmitClaimBody {
    level_id: String,
    kind: String,
}

#[derive(Serialize)]
struct ErrorBody {
    error: &'static str,
    message: String,
}

pub async fn submit_claim(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = match resolve_session_user(&req, &ctx.env).await {
        Ok(user) => user,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return forbidden(),
    };

    let body: SubmitClaimBody = match req.json().await {
        Ok(body) => body,
        Err(_) => {
            return json_error(
                400,
                "invalid_body",
                "Expected JSON body with levelId and kind",
            );
        }
    };

    if !is_valid_priority(&body.kind) {
        return json_error(
            400,
            "invalid_priority",
            "Unknown claim priority",
        );
    }

    if level_has_clan_completion(&ctx.env, &body.level_id).await? {
        return json_error(
            409,
            "level_completed",
            "This level is already completed on the board",
        );
    }

    let level_claims = list_claims_for_level(&ctx.env, &body.level_id).await?;
    let dominant = select_dominant_claim(&level_claims);
    let own = level_claims
        .iter()
        .find(|claim| claim.user_id == user.id);

    if let Some(own_claim) = own {
        if own_claim.kind == body.kind {
            return mutation_response(&ctx.env, &user.id, &body.level_id).await;
        }

        if is_deescalation(&own_claim.kind, &body.kind) {
            delete_user_claim_for_level(&ctx.env, &user.id, &body.level_id).await?;
        } else {
            update_user_claim(&ctx.env, &user.id, &body.level_id, &body.kind).await?;
        }
    } else if let Some(dominant_claim) = dominant {
        if !can_clobber_dominant(&dominant_claim.kind, &body.kind) {
            return json_error(
                409,
                "claim_conflict",
                "You cannot lower or match another user's claim — escalate to a stronger priority instead",
            );
        }
        insert_claim(&ctx.env, &user.id, &body.level_id, &body.kind).await?;
    } else {
        insert_claim(&ctx.env, &user.id, &body.level_id, &body.kind).await?;
    }

    invalidate_board_cache(&ctx.env).await?;
    mutation_response(&ctx.env, &user.id, &body.level_id).await
}

pub async fn remove_claim(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = match resolve_session_user(&req, &ctx.env).await {
        Ok(user) => user,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return forbidden(),
    };

    let level_id = path_param(&req, "/api/claims/")?;
    delete_user_claim_for_level(&ctx.env, &user.id, &level_id).await?;
    invalidate_board_cache(&ctx.env).await?;
    mutation_response(&ctx.env, &user.id, &level_id).await
}

async fn mutation_response(env: &worker::Env, user_id: &str, level_id: &str) -> Result<Response> {
    let body = build_claim_mutation_response(env, user_id, level_id).await?;
    Response::from_json(&body)
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
        message: "You do not have permission for this action".into(),
    })?
    .with_status(403))
}

fn json_error(status: u16, error: &'static str, message: &str) -> Result<Response> {
    Ok(Response::from_json(&ErrorBody {
        error,
        message: message.into(),
    })?
    .with_status(status))
}
