use super::not_implemented;
use worker::{Response, Result, RouteContext};

pub fn me(_req: worker::Request, _ctx: RouteContext<()>) -> Result<Response> {
    not_implemented("Authenticated user profile")
}
