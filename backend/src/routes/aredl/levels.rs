use crate::env;
use serde::{Deserialize, Serialize};
use worker::{Cache, Fetch, Method, Request, Response, Result, RouteContext};

const CACHE_TTL_SECONDS: u32 = 900;

#[derive(Serialize)]
struct ErrorResponse {
    error: &'static str,
    message: String,
}

#[derive(Serialize)]
pub struct LevelSummary {
    id: String,
    name: String,
    position: i32,
}

#[derive(Deserialize)]
struct UpstreamLevel {
    id: String,
    name: String,
    position: i32,
}

fn cache_key(exclude_legacy: bool) -> String {
    format!(
        "https://aredl-coordinator.internal/cache/aredl/levels?exclude_legacy={exclude_legacy}"
    )
}

fn upstream_url(base: &str, exclude_legacy: bool) -> String {
    if exclude_legacy {
        format!("{base}/aredl/levels?exclude_legacy=true")
    } else {
        format!("{base}/aredl/levels")
    }
}

fn parse_exclude_legacy(req: &Request) -> Result<bool> {
    let url = req.url()?;
    Ok(url
        .query_pairs()
        .find(|(key, _)| key == "exclude_legacy")
        .map(|(_, value)| value == "true")
        .unwrap_or(true))
}

fn build_levels_response(summary: &Vec<LevelSummary>) -> Result<Response> {
    let mut response = Response::from_json(summary)?;
    response.headers_mut().set(
        "Cache-Control",
        &format!("public, max-age={CACHE_TTL_SECONDS}, s-maxage={CACHE_TTL_SECONDS}"),
    )?;
    Ok(response)
}

pub async fn aredl_levels(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let exclude_legacy = parse_exclude_legacy(&req)?;
    let cache = Cache::default();
    let key = cache_key(exclude_legacy);

    if let Some(cached) = cache.get(&key, false).await? {
        return Ok(cached);
    }

    let base = env::aredl_api_base(&ctx.env)?;
    let url = upstream_url(&base, exclude_legacy);
    let request = Request::new(&url, Method::Get)?;
    let mut upstream = Fetch::Request(request).send().await?;
    let status = upstream.status_code();

    if !(200..300).contains(&status) {
        return Ok(Response::from_json(&ErrorResponse {
            error: "upstream_error",
            message: format!("AREDL API returned {status}"),
        })?
        .with_status(502));
    }

    let levels: Vec<UpstreamLevel> = upstream.json().await?;
    let summary: Vec<LevelSummary> = levels
        .into_iter()
        .map(|level| LevelSummary {
            id: level.id,
            name: level.name,
            position: level.position,
        })
        .collect();

    let response = build_levels_response(&summary)?;
    cache.put(&key, build_levels_response(&summary)?).await?;
    Ok(response)
}
