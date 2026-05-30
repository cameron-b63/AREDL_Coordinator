use super::db::UserRecord;
use super::discord::fetch_member_roles;
use super::{get_user_by_id, session_token_from_request, verify_session, SessionIdentity};
use crate::env;
use worker::{Env, Request, Result};

pub enum AuthError {
    Unauthorized,
    Forbidden,
}

pub fn resolve_session_identity(req: &Request, env: &Env) -> Result<SessionIdentity, AuthError> {
    let token = session_token_from_request(req).ok_or(AuthError::Unauthorized)?;
    let jwt_secret = env::jwt_secret(env).map_err(|_| AuthError::Unauthorized)?;
    verify_session(&token, &jwt_secret)
        .map_err(|_| AuthError::Unauthorized)?
        .ok_or(AuthError::Unauthorized)
}

pub async fn resolve_session_user(req: &Request, env: &Env) -> Result<UserRecord, AuthError> {
    let identity = resolve_session_identity(req, env)?;
    get_user_by_id(env, &identity.user_id)
        .await
        .map_err(|_| AuthError::Unauthorized)?
        .ok_or(AuthError::Unauthorized)
}

pub fn require_admin(identity: &SessionIdentity) -> Result<(), AuthError> {
    if identity.is_admin {
        Ok(())
    } else {
        Err(AuthError::Forbidden)
    }
}

pub async fn has_coordinator_role(env: &Env, discord_id: &str) -> Result<bool> {
    let required_role_id = env::discord_required_role_id(env)?;
    let bot_token = env::discord_bot_token(env)?;
    let guild_id = env::discord_guild_id(env)?;
    let roles = fetch_member_roles(&bot_token, &guild_id, discord_id).await?;
    Ok(roles.iter().any(|role| role == &required_role_id))
}
