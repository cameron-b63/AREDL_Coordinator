use serde::Serialize;
use worker::{Response, Result, RouteContext};

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
}

pub fn health(_req: worker::Request, _ctx: RouteContext<()>) -> Result<Response> {
    Response::from_json(&HealthResponse {
        status: "ok",
        service: "aredl-coordinator",
    })
}
