use serde::Serialize;
use worker::{Response, Result, RouteContext};

#[derive(Serialize)]
struct MeResponse {
    user: Option<()>,
}

pub fn me(_req: worker::Request, _ctx: RouteContext<()>) -> Result<Response> {
    Ok(Response::from_json(&MeResponse { user: None })?.with_status(401))
}
