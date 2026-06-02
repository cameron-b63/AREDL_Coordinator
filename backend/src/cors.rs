use worker::{Headers, Request, Response, Result};

pub fn normalize_origin(configured: &str) -> String {
    let trimmed = configured.trim_end_matches('/');
    if let Some(scheme_end) = trimmed.find("://") {
        let after_scheme = scheme_end + 3;
        if let Some(path_start) = trimmed[after_scheme..].find('/') {
            return trimmed[..after_scheme + path_start].to_string();
        }
    }
    trimmed.to_string()
}

pub fn cors_allow_origin(req: &Request, configured: &str) -> String {
    let allowed = normalize_origin(configured);
    if let Ok(Some(request_origin)) = req.headers().get("Origin") {
        if request_origin == allowed {
            return request_origin;
        }
    }
    allowed
}

fn cors_headers(existing: &Headers, origin: &str) -> Result<Headers> {
    let headers = Headers::new();

    for (name, value) in existing.entries() {
        if name.eq_ignore_ascii_case("access-control-allow-origin")
            || name.eq_ignore_ascii_case("access-control-allow-methods")
            || name.eq_ignore_ascii_case("access-control-allow-headers")
            || name.eq_ignore_ascii_case("access-control-allow-credentials")
            || name.eq_ignore_ascii_case("access-control-max-age")
        {
            continue;
        }
        headers.set(&name, &value)?;
    }

    headers.set("Access-Control-Allow-Origin", origin)?;
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")?;
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")?;
    headers.set("Access-Control-Allow-Credentials", "true")?;
    headers.set("Access-Control-Max-Age", "86400")?;
    Ok(headers)
}

pub fn with_cors(response: Response, origin: &str) -> Result<Response> {
    let status = response.status_code();
    let headers = cors_headers(response.headers(), origin)?;
    Ok(response.with_headers(headers).with_status(status))
}
