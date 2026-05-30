use crate::aredl::{fetch_clan_profile, fetch_levels, fetch_showcase_videos, UpstreamError};
use crate::board::{build_board, BoardResponse};
use crate::claims::list_all_claims;
use crate::env;
use serde::Serialize;
use worker::{Cache, Request, Response, Result, RouteContext};

const CACHE_TTL_SECONDS: u32 = 900;

#[derive(Serialize)]
struct ErrorResponse {
    error: &'static str,
    message: String,
}

fn cache_key(exclude_legacy: bool, clan_id: &str) -> String {
    format!(
        "https://aredl-coordinator.internal/cache/board?v=3&exclude_legacy={exclude_legacy}&clan_id={clan_id}"
    )
}

fn parse_exclude_legacy(req: &Request) -> Result<bool> {
    let url = req.url()?;
    Ok(url
        .query_pairs()
        .find(|(key, _)| key == "exclude_legacy")
        .map(|(_, value)| value == "true")
        .unwrap_or(true))
}

fn board_response(body: &BoardResponse) -> Result<Response> {
    let mut response = Response::from_json(body)?;
    response.headers_mut().set(
        "Cache-Control",
        &format!("public, max-age={CACHE_TTL_SECONDS}, s-maxage={CACHE_TTL_SECONDS}"),
    )?;
    Ok(response)
}

pub async fn board(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let exclude_legacy = parse_exclude_legacy(&req)?;
    let clan_id = env::aredl_clan_id(&ctx.env)?;
    let cache = Cache::default();
    let key = cache_key(exclude_legacy, &clan_id);

    if let Some(cached) = cache.get(&key, false).await? {
        return Ok(cached);
    }

    let levels = match fetch_levels(&ctx.env, exclude_legacy).await {
        Ok(levels) => levels,
        Err(err) => return upstream_error_response(err),
    };

    let clan = match fetch_clan_profile(&ctx.env, &clan_id).await {
        Ok(clan) => clan,
        Err(err) => return upstream_error_response(err),
    };

    let claims = list_all_claims(&ctx.env).await?;
    let level_ids: Vec<String> = levels.iter().map(|level| level.id.clone()).collect();
    let showcase_videos = match fetch_showcase_videos(&ctx.env, &level_ids).await {
        Ok(showcases) => showcases,
        Err(err) => return upstream_error_response(err),
    };
    let body = build_board(levels, clan, claims, showcase_videos);

    let response = board_response(&body)?;
    cache.put(&key, board_response(&body)?).await?;
    Ok(response)
}

fn upstream_error_response(err: UpstreamError) -> Result<Response> {
    Ok(Response::from_json(&ErrorResponse {
        error: "upstream_error",
        message: err.to_string(),
    })?
    .with_status(502))
}
