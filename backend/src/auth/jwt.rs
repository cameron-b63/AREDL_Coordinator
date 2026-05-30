use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use worker::{Date, Result};

type HmacSha256 = Hmac<Sha256>;

const SESSION_TTL_SECS: u64 = 7 * 24 * 60 * 60;

#[derive(Debug, Clone)]
pub struct SessionIdentity {
    pub user_id: String,
    pub is_admin: bool,
}

pub fn sign_session(user_id: &str, is_admin: bool, secret: &str) -> Result<String> {
    let now = Date::now().as_millis() / 1000;
    let exp = now + SESSION_TTL_SECS;
    sign_token(user_id, is_admin, secret, exp, now)
}

pub fn verify_session(token: &str, secret: &str) -> Result<Option<SessionIdentity>> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Ok(None);
    }

    let signing_input = format!("{}.{}", parts[0], parts[1]);
    let expected_sig = URL_SAFE_NO_PAD.decode(parts[2]).map_err(|e| e.to_string())?;

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).map_err(|e| e.to_string())?;
    mac.update(signing_input.as_bytes());
    if mac.verify_slice(&expected_sig).is_err() {
        return Ok(None);
    }

    let payload_bytes = URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|e| e.to_string())?;
    let payload = String::from_utf8(payload_bytes).map_err(|e| e.to_string())?;

    let claims = parse_claims(&payload).ok_or_else(|| "invalid jwt payload".to_string())?;
    let now = Date::now().as_millis() / 1000;
    if claims.exp <= now {
        return Ok(None);
    }

    Ok(Some(SessionIdentity {
        user_id: claims.sub,
        is_admin: claims.adm,
    }))
}

fn sign_token(sub: &str, is_admin: bool, secret: &str, exp: u64, iat: u64) -> Result<String> {
    let header_b64 = URL_SAFE_NO_PAD.encode(r#"{"alg":"HS256","typ":"JWT"}"#);
    let adm = if is_admin { "true" } else { "false" };
    let payload = format!(r#"{{"sub":"{sub}","exp":{exp},"iat":{iat},"adm":{adm}}}"#);
    let payload_b64 = URL_SAFE_NO_PAD.encode(payload.as_bytes());
    let signing_input = format!("{header_b64}.{payload_b64}");

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).map_err(|e| e.to_string())?;
    mac.update(signing_input.as_bytes());
    let signature = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());

    Ok(format!("{signing_input}.{signature}"))
}

struct Claims {
    sub: String,
    exp: u64,
    adm: bool,
}

fn parse_claims(payload: &str) -> Option<Claims> {
    let sub = extract_json_string(payload, "sub")?;
    let exp = extract_json_u64(payload, "exp")?;
    let adm = extract_json_bool(payload, "adm").unwrap_or(false);
    Some(Claims { sub, exp, adm })
}

fn extract_json_string(json: &str, key: &str) -> Option<String> {
    let needle = format!("\"{key}\":\"");
    let start = json.find(&needle)? + needle.len();
    let rest = &json[start..];
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

fn extract_json_u64(json: &str, key: &str) -> Option<u64> {
    let needle = format!("\"{key}\":");
    let start = json.find(&needle)? + needle.len();
    let rest = json[start..].trim_start();
    let end = rest
        .find(|c: char| !c.is_ascii_digit())
        .unwrap_or(rest.len());
    rest[..end].parse().ok()
}

fn extract_json_bool(json: &str, key: &str) -> Option<bool> {
    let needle = format!("\"{key}\":");
    let start = json.find(&needle)? + needle.len();
    let rest = json[start..].trim_start();
    if rest.starts_with("true") {
        Some(true)
    } else if rest.starts_with("false") {
        Some(false)
    } else {
        None
    }
}
