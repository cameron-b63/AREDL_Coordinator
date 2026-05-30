use serde::Serialize;
use worker::*;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
}

#[derive(Serialize)]
struct AredlPingResponse {
    ok: bool,
    upstream_status: u16,
}

#[derive(Serialize)]
struct NotImplementedResponse {
    error: &'static str,
    message: &'static str,
}

fn normalize_origin(configured: &str) -> String {
    let trimmed = configured.trim_end_matches('/');
    if let Some(scheme_end) = trimmed.find("://") {
        let after_scheme = scheme_end + 3;
        if let Some(path_start) = trimmed[after_scheme..].find('/') {
            return trimmed[..after_scheme + path_start].to_string();
        }
    }
    trimmed.to_string()
}

fn cors_allow_origin(req: &Request, configured: &str) -> String {
    let allowed = normalize_origin(configured);
    if let Ok(Some(request_origin)) = req.headers().get("Origin") {
        if request_origin == allowed {
            return request_origin;
        }
    }
    allowed
}

fn with_cors(mut response: Response, origin: &str) -> Result<Response> {
    let headers = response.headers_mut();
    headers.set("Access-Control-Allow-Origin", origin)?;
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")?;
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")?;
    headers.set("Access-Control-Max-Age", "86400")?;
    Ok(response)
}

fn not_implemented(message: &'static str) -> Result<Response> {
    Ok(Response::from_json(&NotImplementedResponse {
        error: "not_implemented",
        message,
    })?
    .with_status(501))
}

#[event(fetch, respond_with_errors)]
pub async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let configured_origin = env.var("FRONTEND_ORIGIN")?.to_string();
    let cors_origin = cors_allow_origin(&req, &configured_origin);

    if req.method() == Method::Options {
        let response = Response::empty()?.with_status(204);
        return with_cors(response, &cors_origin);
    }

    let response = Router::new()
        .get("/api/health", |_, _| {
            Response::from_json(&HealthResponse {
                status: "ok",
                service: "aredl-coordinator",
            })
        })
        .get_async("/api/aredl/ping", |_, ctx| async move {
            let base = ctx.env.var("AREDL_API_BASE")?.to_string();
            let url = format!("{}/health", base);
            let request = Request::new(&url, Method::Get)?;
            let upstream = Fetch::Request(request).send().await?;
            let status = upstream.status_code();

            Response::from_json(&AredlPingResponse {
                ok: (200..300).contains(&status),
                upstream_status: status,
            })
        })
        .get("/auth/discord", |_, _| not_implemented("Discord OAuth login"))
        .get("/auth/discord/callback", |_, _| {
            not_implemented("Discord OAuth callback")
        })
        .get("/api/me", |_, _| not_implemented("Authenticated user profile"))
        .run(req, env)
        .await?;

    with_cors(response, &cors_origin)
}
