use crate::env;
use serde::Serialize;
use worker::{Fetch, Method, Request, Response, Result, RouteContext};

#[derive(Serialize)]
struct AredlPingResponse {
    ok: bool,
    upstream_status: u16,
}

pub async fn aredl_ping(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let base = env::aredl_api_base(&ctx.env)?;
    let url = format!("{}/health", base);
    let request = Request::new(&url, Method::Get)?;
    let upstream = Fetch::Request(request).send().await?;
    let status = upstream.status_code();

    Response::from_json(&AredlPingResponse {
        ok: (200..300).contains(&status),
        upstream_status: status,
    })
}
