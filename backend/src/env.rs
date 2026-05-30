use crate::cors::normalize_origin;
use worker::{Env, Result, Url};

pub fn frontend_origin(env: &Env) -> Result<String> {
    env.var("FRONTEND_ORIGIN").map(|v| v.to_string())
}

pub fn frontend_base_path(env: &Env) -> Result<String> {
    match env.var("FRONTEND_BASE_PATH") {
        Ok(value) => Ok(value.to_string()),
        Err(_) => Ok("/AREDL_Coordinator".to_string()),
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
