use uuid::Uuid;
use worker::{Request, Response, Result};

pub const SESSION_COOKIE: &str = "session";
pub const OAUTH_STATE_COOKIE: &str = "oauth_state";
pub const OAUTH_RETURN_TO_COOKIE: &str = "oauth_return_to";

const OAUTH_STATE_TTL_SECS: u64 = 600;
const SESSION_TTL_SECS: u64 = 7 * 24 * 60 * 60;

enum SameSitePolicy {
    Lax,
    None,
}

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

pub fn oauth_return_to_from_request(req: &Request) -> Option<String> {
    let value = cookie_value(req, OAUTH_RETURN_TO_COOKIE)?;
    url_decode(&value)
}

pub fn set_oauth_state_cookie(response: &Response, state: &str) -> Result<()> {
    append_set_cookie(
        response,
        &cookie_header(
            OAUTH_STATE_COOKIE,
            state,
            OAUTH_STATE_TTL_SECS,
            SameSitePolicy::Lax,
        ),
    )
}

pub fn clear_oauth_state_cookie(response: &Response) -> Result<()> {
    append_set_cookie(
        response,
        &clear_cookie_header(OAUTH_STATE_COOKIE, SameSitePolicy::Lax),
    )
}

pub fn set_oauth_return_to_cookie(response: &Response, return_to: &str) -> Result<()> {
    append_set_cookie(
        response,
        &cookie_header(
            OAUTH_RETURN_TO_COOKIE,
            &url_encode(return_to),
            OAUTH_STATE_TTL_SECS,
            SameSitePolicy::Lax,
        ),
    )
}

pub fn clear_oauth_return_to_cookie(response: &Response) -> Result<()> {
    append_set_cookie(
        response,
        &clear_cookie_header(OAUTH_RETURN_TO_COOKIE, SameSitePolicy::Lax),
    )
}

pub fn set_session_cookie(response: &Response, token: &str) -> Result<()> {
    append_set_cookie(
        response,
        &cookie_header(SESSION_COOKIE, token, SESSION_TTL_SECS, SameSitePolicy::None),
    )
}

pub fn clear_session_cookie(response: &Response) -> Result<()> {
    append_set_cookie(
        response,
        &clear_cookie_header(SESSION_COOKIE, SameSitePolicy::None),
    )
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

fn cookie_header(name: &str, value: &str, max_age_secs: u64, same_site: SameSitePolicy) -> String {
    let same_site = same_site_value(same_site);
    format!(
        "{name}={value}; HttpOnly; Secure; SameSite={same_site}; Path=/; Max-Age={max_age_secs}"
    )
}

fn clear_cookie_header(name: &str, same_site: SameSitePolicy) -> String {
    let same_site = same_site_value(same_site);
    format!("{name}=; HttpOnly; Secure; SameSite={same_site}; Path=/; Max-Age=0")
}

fn same_site_value(policy: SameSitePolicy) -> &'static str {
    match policy {
        SameSitePolicy::Lax => "Lax",
        SameSitePolicy::None => "None",
    }
}

pub fn frontend_session_redirect_url(base: &str, token: &str) -> String {
    let encoded = url_encode(token);
    if base.contains('?') {
        format!("{base}&session={encoded}")
    } else {
        format!("{base}?session={encoded}")
    }
}

fn url_encode(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    encoded
}

fn url_decode(value: &str) -> Option<String> {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'%' if i + 2 < bytes.len() => {
                let hi = from_hex(bytes[i + 1])?;
                let lo = from_hex(bytes[i + 2])?;
                decoded.push((hi << 4) | lo);
                i += 3;
            }
            byte => {
                decoded.push(byte);
                i += 1;
            }
        }
    }
    String::from_utf8(decoded).ok()
}

fn from_hex(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::{cookie_header, clear_cookie_header, SameSitePolicy};

    #[test]
    fn oauth_cookies_use_samesite_lax() {
        let set_cookie = cookie_header("oauth_state", "test", 600, SameSitePolicy::Lax);
        assert!(set_cookie.contains("SameSite=Lax"));
        assert!(!set_cookie.contains("SameSite=None"));

        let clear_cookie = clear_cookie_header("oauth_state", SameSitePolicy::Lax);
        assert!(clear_cookie.contains("SameSite=Lax"));
    }

    #[test]
    fn session_cookie_uses_samesite_none() {
        let set_cookie = cookie_header("session", "token", 60, SameSitePolicy::None);
        assert!(set_cookie.contains("SameSite=None"));
        assert!(!set_cookie.contains("SameSite=Lax"));

        let clear_cookie = clear_cookie_header("session", SameSitePolicy::None);
        assert!(clear_cookie.contains("SameSite=None"));
    }
}

