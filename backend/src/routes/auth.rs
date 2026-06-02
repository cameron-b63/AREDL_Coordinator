use crate::auth::{
    auth_error_redirect, authorize_url, avatar_url, clear_oauth_return_to_cookie,
    clear_oauth_state_cookie, clear_session_cookie, exchange_code, fetch_member_roles, fetch_user,
    frontend_session_redirect_url, new_oauth_state, oauth_return_to_from_request,
    oauth_state_from_request, redirect_response, set_oauth_return_to_cookie, set_oauth_state_cookie,
    set_session_cookie, sign_session, upsert_user,
};
use crate::env::{self, frontend_redirect_url, oauth_callback_url, validate_frontend_return_to};
use serde::Deserialize;
use worker::{Request, Response, Result, RouteContext};

#[derive(Deserialize)]
struct LoginQuery {
    return_to: Option<String>,
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
}

pub async fn discord_login(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let query: LoginQuery = req.query()?;
    let client_id = env::discord_client_id(&ctx.env)?;
    let req_url = req.url()?;
    let redirect_uri = oauth_callback_url(&req_url);
    let state = new_oauth_state();
    let authorize = authorize_url(&client_id, &redirect_uri, &state);

    let response = redirect_response(&authorize)?;
    set_oauth_state_cookie(&response, &state)?;
    if let Some(return_to) = query.return_to {
        if let Some(validated) = validate_frontend_return_to(&ctx.env, &return_to) {
            set_oauth_return_to_cookie(&response, &validated)?;
        }
    }
    Ok(response)
}

pub async fn discord_callback(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let query: CallbackQuery = req.query()?;

    if query.error.is_some() {
        return auth_error_redirect(&ctx.env, "discord authorization denied");
    }

    let code = query
        .code
        .ok_or_else(|| "missing oauth code".to_string())?;
    let state = query
        .state
        .ok_or_else(|| "missing oauth state".to_string())?;

    let stored_state = oauth_state_from_request(&req)
        .ok_or_else(|| "missing oauth state cookie".to_string())?;
    if stored_state != state {
        return auth_error_redirect(&ctx.env, "invalid oauth state");
    }

    let req_url = req.url()?;
    let redirect_uri = oauth_callback_url(&req_url);
    let client_id = env::discord_client_id(&ctx.env)?;
    let client_secret = env::discord_client_secret(&ctx.env)?;
    let jwt_secret = env::jwt_secret(&ctx.env)?;

    let access_token = exchange_code(&client_id, &client_secret, &code, &redirect_uri).await?;
    let discord_user = fetch_user(&access_token).await?;

    let bot_token = env::discord_bot_token(&ctx.env)?;
    let guild_id = env::discord_guild_id(&ctx.env)?;
    let required_role_id = env::discord_required_role_id(&ctx.env)?;
    let admin_role_id = env::discord_admin_role_id(&ctx.env)?;
    let roles = fetch_member_roles(&bot_token, &guild_id, &discord_user.id).await?;

    let allowed = roles.iter().any(|role| role == &required_role_id);
    if !allowed {
        return auth_error_redirect(
            &ctx.env,
            "You need the coordinator role in Discord to sign in",
        );
    }

    let is_admin = roles.iter().any(|role| role == &admin_role_id);
    let avatar = avatar_url(&discord_user.id, discord_user.avatar.as_deref());

    let user = upsert_user(
        &ctx.env,
        &discord_user.id,
        &discord_user.username,
        avatar.as_deref(),
    )
    .await?;

    let token = sign_session(&user.id, is_admin, &jwt_secret)?;
    let frontend = oauth_return_to_from_request(&req).unwrap_or(frontend_redirect_url(&ctx.env)?);
    let redirect_target = frontend_session_redirect_url(&frontend, &token);

    let response = redirect_response(&redirect_target)?;
    clear_oauth_state_cookie(&response)?;
    clear_oauth_return_to_cookie(&response)?;
    set_session_cookie(&response, &token)?;
    Ok(response)
}

pub async fn discord_logout(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let frontend = frontend_redirect_url(&ctx.env)?;
    let response = redirect_response(&frontend)?;
    clear_session_cookie(&response)?;
    Ok(response)
}
