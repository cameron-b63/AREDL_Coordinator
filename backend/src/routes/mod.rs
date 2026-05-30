mod aredl;
mod auth;
mod health;
mod me;

pub use aredl::{aredl_levels, aredl_ping};
pub use auth::{discord_callback, discord_login};
pub use health::health;
pub use me::me;

use serde::Serialize;
use worker::{Response, Result};

#[derive(Serialize)]
struct NotImplementedResponse {
    error: &'static str,
    message: &'static str,
}

pub fn not_implemented(message: &'static str) -> Result<Response> {
    Ok(Response::from_json(&NotImplementedResponse {
        error: "not_implemented",
        message,
    })?
    .with_status(501))
}
