use crate::aredl::fetch_levels;
use crate::auth::{resolve_session_user, AuthError};
use crate::preferences::{
    clear_manual_hardest, level_name_for_position, set_manual_hardest, set_preferences_json,
    validate_preferences, StoredUserPreferences,
};
use serde::Deserialize;
use serde::Serialize;
use worker::{Request, Response, Result, RouteContext};

use super::me::{build_api_user, MeResponse};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManualHardestBody {
    position: i32,
}

#[derive(Serialize)]
struct ErrorBody {
    error: &'static str,
    message: String,
}

pub async fn put_manual_hardest(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = match resolve_session_user(&req, &ctx.env).await {
        Ok(user) => user,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return unauthorized(),
    };

    let body: ManualHardestBody = match req.json().await {
        Ok(body) => body,
        Err(_) => {
            return json_error(
                400,
                "invalid_body",
                "Expected JSON body with position",
            );
        }
    };

    if body.position < 1 {
        return json_error(400, "invalid_position", "position must be at least 1");
    }

    let levels = match fetch_levels(&ctx.env, true).await {
        Ok(levels) => levels,
        Err(err) => {
            return json_error(
                502,
                "upstream_error",
                &format!("Failed to load AREDL levels: {err}"),
            );
        }
    };

    let level_name = match level_name_for_position(&levels, body.position) {
        Some(name) => name,
        None => {
            return json_error(
                400,
                "unknown_position",
                "No level found at that placement on the AREDL list",
            );
        }
    };

    set_manual_hardest(&ctx.env, &user.id, body.position, &level_name).await?;

    let api_user = build_api_user(&req, &ctx, &user).await?;
    Response::from_json(&MeResponse {
        user: Some(api_user),
    })
}

pub async fn delete_manual_hardest(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = match resolve_session_user(&req, &ctx.env).await {
        Ok(user) => user,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return unauthorized(),
    };

    clear_manual_hardest(&ctx.env, &user.id).await?;

    let api_user = build_api_user(&req, &ctx, &user).await?;
    Response::from_json(&MeResponse {
        user: Some(api_user),
    })
}

pub async fn put_preferences(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = match resolve_session_user(&req, &ctx.env).await {
        Ok(user) => user,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return unauthorized(),
    };

    let body: StoredUserPreferences = match req.json().await {
        Ok(body) => body,
        Err(_) => {
            return json_error(
                400,
                "invalid_body",
                "Expected JSON body with filters and sortDirection",
            );
        }
    };

    if let Err(message) = validate_preferences(&body) {
        return json_error(400, "invalid_preferences", message);
    }

    let json = serde_json::to_string(&body).map_err(|e| e.to_string())?;
    set_preferences_json(&ctx.env, &user.id, &json).await?;

    let api_user = build_api_user(&req, &ctx, &user).await?;
    Response::from_json(&MeResponse {
        user: Some(api_user),
    })
}

fn unauthorized() -> Result<Response> {
    Ok(Response::from_json(&MeResponse { user: None })?.with_status(401))
}

fn json_error(status: u16, error: &'static str, message: &str) -> Result<Response> {
    Ok(Response::from_json(&ErrorBody {
        error,
        message: message.into(),
    })?
    .with_status(status))
}
