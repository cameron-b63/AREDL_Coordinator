use uuid::Uuid;
use worker::{Request, Response, Result};

pub const SESSION_COOKIE: &str = "session";
pub const OAUTH_STATE_COOKIE: &str = "oauth_state";

const OAUTH_STATE_TTL_SECS: u64 = 600;
const SESSION_TTL_SECS: u64 = 7 * 24 * 60 * 60;

pub fn session_token_from_request(req: &Request) -> Option<String> {
    if let Ok(Some(auth)) = req.headers().get("Authorization") {
        if let Some(token) = auth.strip_prefix("Bearer ") {
            let token = token.trim();
            if !token.is_empty() {
                return Some(token.to_string());
            }
        }
    }
    cookie_value(req, SESSION_COOKIE)
}

pub fn oauth_state_from_request(req: &Request) -> Option<String> {
    cookie_value(req, OAUTH_STATE_COOKIE)
}

pub fn set_oauth_state_cookie(response: &Response, state: &str) -> Result<()> {
    append_set_cookie(
        response,
        &cookie_header(OAUTH_STATE_COOKIE, state, OAUTH_STATE_TTL_SECS),
    )
}

pub fn clear_oauth_state_cookie(response: &Response) -> Result<()> {
    append_set_cookie(response, &clear_cookie_header(OAUTH_STATE_COOKIE))
}

pub fn set_session_cookie(response: &Response, token: &str) -> Result<()> {
    append_set_cookie(
        response,
        &cookie_header(SESSION_COOKIE, token, SESSION_TTL_SECS),
    )
}

pub fn clear_session_cookie(response: &Response) -> Result<()> {
    append_set_cookie(response, &clear_cookie_header(SESSION_COOKIE))
}

pub fn new_oauth_state() -> String {
    Uuid::new_v4().to_string()
}

pub fn redirect_response(location: &str) -> Result<Response> {
    let response = Response::empty()?.with_status(302);
    response.headers().set("Location", location)?;
    Ok(response)
}

pub fn append_set_cookie(response: &Response, cookie: &str) -> Result<()> {
    response.headers().append("Set-Cookie", cookie)
}

fn cookie_value(req: &Request, name: &str) -> Option<String> {
    let header = req.headers().get("Cookie").ok().flatten()?;
    for part in header.split(';') {
        let part = part.trim();
        if let Some(value) = part.strip_prefix(&format!("{name}=")) {
            return Some(value.to_string());
        }
    }
    None
}

fn cookie_header(name: &str, value: &str, max_age_secs: u64) -> String {
    format!(
        "{name}={value}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age={max_age_secs}"
    )
}

fn clear_cookie_header(name: &str) -> String {
    format!("{name}=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0")
}

