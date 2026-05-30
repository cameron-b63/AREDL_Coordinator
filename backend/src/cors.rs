use worker::{Request, Response, Result};

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

pub fn with_cors(mut response: Response, origin: &str) -> Result<Response> {
    let headers = response.headers_mut();
    headers.set("Access-Control-Allow-Origin", origin)?;
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")?;
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")?;
    headers.set("Access-Control-Max-Age", "86400")?;
    Ok(response)
}
