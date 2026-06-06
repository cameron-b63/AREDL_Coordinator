use crate::cors::normalize_origin;
use worker::{Env, Result, Url};

pub fn frontend_origin(env: &Env) -> Result<String> {
    env.var("FRONTEND_ORIGIN").map(|v| v.to_string())
}

pub fn frontend_base_path(env: &Env) -> Result<String> {
    match env.var("FRONTEND_BASE_PATH") {
        Ok(value) => Ok(value.to_string()),
        Err(_) => Ok(String::new()),
    }
}

pub fn frontend_redirect_url(env: &Env) -> Result<String> {
    let origin = normalize_origin(&frontend_origin(env)?);
    let mut path = frontend_base_path(env)?;
    if !path.starts_with('/') {
        path.insert(0, '/');
    }
    let path = path.trim_end_matches('/');
    Ok(format!("{origin}{path}/"))
}

pub fn aredl_api_base(env: &Env) -> Result<String> {
    env.var("AREDL_API_BASE").map(|v| v.to_string())
}

pub fn aredl_clan_id(env: &Env) -> Result<String> {
    env.var("AREDL_CLAN_ID").map(|v| v.to_string())
}

pub fn discord_guild_id(env: &Env) -> Result<String> {
    env.var("DISCORD_GUILD_ID").map(|v| v.to_string())
}

pub fn discord_required_role_id(env: &Env) -> Result<String> {
    env.var("DISCORD_REQUIRED_ROLE_ID").map(|v| v.to_string())
}

pub fn discord_admin_role_id(env: &Env) -> Result<String> {
    env.var("DISCORD_ADMIN_ROLE_ID").map(|v| v.to_string())
}

pub fn discord_bot_token(env: &Env) -> Result<String> {
    env.var("DISCORD_BOT_TOKEN").map(|v| v.to_string())
}

pub fn discord_client_id(env: &Env) -> Result<String> {
    env.var("DISCORD_CLIENT_ID").map(|v| v.to_string())
}

pub fn discord_client_secret(env: &Env) -> Result<String> {
    env.var("DISCORD_CLIENT_SECRET").map(|v| v.to_string())
}

pub fn jwt_secret(env: &Env) -> Result<String> {
    env.var("JWT_SECRET").map(|v| v.to_string())
}

pub fn oauth_callback_url(req_url: &Url) -> String {
    let mut origin = req_url.origin().ascii_serialization();
    if origin.ends_with(":443") {
        origin = origin.trim_end_matches(":443").to_string();
    }
    format!("{origin}/auth/discord/callback")
}

pub fn validate_frontend_return_to(env: &Env, return_to: &str) -> Option<String> {
    let allowed = normalize_origin(&frontend_origin(env).ok()?);
    validate_return_to_with_allowed_origin(&allowed, return_to)
}

fn validate_return_to_with_allowed_origin(allowed_origin: &str, return_to: &str) -> Option<String> {
    let candidate = Url::parse(return_to).ok()?;
    let candidate_origin = normalize_url_origin(&candidate);
    if candidate_origin != allowed_origin {
        return None;
    }
    Some(candidate.to_string())
}

fn normalize_url_origin(url: &Url) -> String {
    let mut origin = url.origin().ascii_serialization();
    if origin.ends_with(":443") {
        origin = origin.trim_end_matches(":443").to_string();
    }
    normalize_origin(&origin)
}

#[cfg(test)]
mod tests {
    use super::validate_return_to_with_allowed_origin;

    #[test]
    fn accepts_return_to_on_allowed_origin() {
        let allowed = "https://example.com";
        let candidate = "https://example.com/?tab=claims";
        let result = validate_return_to_with_allowed_origin(allowed, candidate);
        assert_eq!(result.as_deref(), Some(candidate));
    }

    #[test]
    fn rejects_return_to_on_different_origin() {
        let allowed = "https://example.com";
        let candidate = "https://evil.example/";
        assert!(validate_return_to_with_allowed_origin(allowed, candidate).is_none());
    }

    #[test]
    fn rejects_invalid_return_to_url() {
        let allowed = "https://example.com";
        assert!(validate_return_to_with_allowed_origin(allowed, "/relative/path").is_none());
    }
}
