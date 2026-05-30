use super::not_implemented;
use worker::{Response, Result, RouteContext};

pub fn discord_login(_req: worker::Request, _ctx: RouteContext<()>) -> Result<Response> {
    not_implemented("Discord OAuth login")
}

pub fn discord_callback(_req: worker::Request, _ctx: RouteContext<()>) -> Result<Response> {
    not_implemented("Discord OAuth callback")
}
