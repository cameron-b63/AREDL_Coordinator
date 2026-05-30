mod aredl;
mod auth;
mod board;
mod cors;
mod env;
mod routes;

use cors::{cors_allow_origin, with_cors};
use routes::{
    aredl_levels, aredl_ping, board, discord_callback, discord_login, discord_logout, health, me,
};
use worker::*;

#[event(fetch, respond_with_errors)]
pub async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let configured_origin = env::frontend_origin(&env)?;
    let cors_origin = cors_allow_origin(&req, &configured_origin);

    if req.method() == Method::Options {
        let response = Response::empty()?.with_status(204);
        return with_cors(response, &cors_origin);
    }

    let response = Router::new()
        .get("/api/health", health)
        .get_async("/api/aredl/ping", aredl_ping)
        .get_async("/api/aredl/levels", aredl_levels)
        .get_async("/api/board", board)
        .get_async("/auth/discord", discord_login)
        .get_async("/auth/discord/callback", discord_callback)
        .get_async("/auth/logout", discord_logout)
        .get_async("/api/me", me)
        .run(req, env)
        .await?;

    with_cors(response, &cors_origin)
}
