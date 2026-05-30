use crate::aredl::{fetch_clan_profile_cached, fetch_levels, UpstreamError};
use crate::board::{board_cache_control_header, board_cache_key, build_board, BoardResponse};
use crate::claims::list_all_claims;
use crate::env;
use serde::Serialize;
use worker::{Cache, Request, Response, Result, RouteContext};

#[derive(Serialize)]
struct ErrorResponse {
    error: &'static str,
    message: String,
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
    response
        .headers_mut()
        .set("Cache-Control", &board_cache_control_header())?;
    Ok(response)
}

pub async fn board(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let exclude_legacy = parse_exclude_legacy(&req)?;
    let clan_id = env::aredl_clan_id(&ctx.env)?;
    let cache = Cache::default();
    let key = board_cache_key(exclude_legacy, &clan_id);

    if let Some(cached) = cache.get(&key, false).await? {
        return Ok(cached);
    }

    let levels = match fetch_levels(&ctx.env, exclude_legacy).await {
        Ok(levels) => levels,
        Err(err) => return upstream_error_response(err),
    };

    let clan = match fetch_clan_profile_cached(&ctx.env, &clan_id).await {
        Ok(clan) => clan,
        Err(err) => return upstream_error_response(err),
    };

    let claims = list_all_claims(&ctx.env).await?;
    let body = build_board(levels, clan, claims);

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
