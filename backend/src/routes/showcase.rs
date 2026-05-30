use crate::aredl::{fetch_level_showcase, UpstreamError};
use serde::Serialize;
use worker::{Request, Response, Result, RouteContext};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ShowcaseResponse {
    video_url: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: &'static str,
    message: String,
}

fn level_id_from_path(req: &Request) -> Option<String> {
    let url = req.url().ok()?;
    let segments: Vec<&str> = url
        .path()
        .trim_end_matches('/')
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect();

    match segments.as_slice() {
        ["api", "levels", level_id, "showcase"] => Some(level_id.to_string()),
        _ => None,
    }
}

pub async fn level_showcase(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let level_id = match level_id_from_path(&req) {
        Some(id) => id,
        None => {
            return Ok(Response::from_json(&ErrorResponse {
                error: "bad_request",
                message: "Invalid level id".to_string(),
            })?
            .with_status(400));
        }
    };

    match fetch_level_showcase(&ctx.env, &level_id).await {
        Ok(Some(video_url)) => Ok(Response::from_json(&ShowcaseResponse { video_url })?),
        Ok(None) => Ok(Response::from_json(&ErrorResponse {
            error: "not_found",
            message: "No showcase video for this level".to_string(),
        })?
        .with_status(404)),
        Err(err) => upstream_error_response(err),
    }
}

fn upstream_error_response(err: UpstreamError) -> Result<Response> {
    Ok(Response::from_json(&ErrorResponse {
        error: "upstream_error",
        message: err.to_string(),
    })?
    .with_status(502))
}
