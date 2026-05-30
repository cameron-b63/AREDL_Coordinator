use super::db::UserRecord;
use super::discord::fetch_member_roles;
use super::{get_user_by_id, session_token_from_request, verify_session};
use crate::env;
use worker::{Env, Request, Result};

pub enum AuthError {
    Unauthorized,
    Forbidden,
}

pub async fn resolve_session_user(req: &Request, env: &Env) -> Result<UserRecord, AuthError> {
    let token = session_token_from_request(req).ok_or(AuthError::Unauthorized)?;
    let jwt_secret = env::jwt_secret(env).map_err(|_| AuthError::Unauthorized)?;
    let user_id = verify_session(&token, &jwt_secret)
        .map_err(|_| AuthError::Unauthorized)?
        .ok_or(AuthError::Unauthorized)?;

    get_user_by_id(env, &user_id)
        .await
        .map_err(|_| AuthError::Unauthorized)?
        .ok_or(AuthError::Unauthorized)
}

async fn member_roles(env: &Env, discord_id: &str) -> Result<Vec<String>> {
    let bot_token = env::discord_bot_token(env)?;
    let guild_id = env::discord_guild_id(env)?;
    fetch_member_roles(&bot_token, &guild_id, discord_id).await
}

pub async fn has_coordinator_role(env: &Env, discord_id: &str) -> Result<bool> {
    let required_role_id = env::discord_required_role_id(env)?;
    let roles = member_roles(env, discord_id).await?;
    Ok(roles.iter().any(|role| role == &required_role_id))
}

pub async fn is_admin(env: &Env, discord_id: &str) -> Result<bool> {
    let admin_role_id = env::discord_admin_role_id(env)?;
    let roles = member_roles(env, discord_id).await?;
    Ok(roles.iter().any(|role| role == &admin_role_id))
}

pub async fn require_coordinator(env: &Env, user: &UserRecord) -> Result<(), AuthError> {
    if has_coordinator_role(env, &user.discord_id)
        .await
        .map_err(|_| AuthError::Unauthorized)?
    {
        Ok(())
    } else {
        Err(AuthError::Forbidden)
    }
}

pub async fn require_admin(env: &Env, user: &UserRecord) -> Result<(), AuthError> {
    if is_admin(env, &user.discord_id)
        .await
        .map_err(|_| AuthError::Unauthorized)?
    {
        Ok(())
    } else {
        Err(AuthError::Forbidden)
    }
}
