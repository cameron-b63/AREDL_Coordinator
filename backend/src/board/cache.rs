use crate::aredl::{fetch_clan_profile, fetch_levels};
use crate::board::{build_board, CompletionState};
use crate::claims::list_all_claims;
use crate::env;
use worker::{Cache, Env, Result};

const CACHE_TTL_SECONDS: u32 = 900;
const BOARD_CACHE_VERSION: &str = "v=6";

pub fn board_cache_key(exclude_legacy: bool, clan_id: &str) -> String {
    format!(
        "https://aredl-coordinator.internal/cache/board?{BOARD_CACHE_VERSION}&exclude_legacy={exclude_legacy}&clan_id={clan_id}"
    )
}

pub fn board_cache_control_header() -> String {
    format!("public, max-age={CACHE_TTL_SECONDS}, s-maxage={CACHE_TTL_SECONDS}")
}

pub async fn invalidate_board_cache(env: &Env) -> Result<()> {
    let clan_id = env::aredl_clan_id(env)?;
    let cache = Cache::default();

    for exclude_legacy in [true, false] {
        let key = board_cache_key(exclude_legacy, &clan_id);
        cache.delete(&key, false).await?;
    }

    Ok(())
}

pub async fn level_is_board_completed(env: &Env, level_id: &str) -> Result<bool> {
    let clan_id = env::aredl_clan_id(env)?;
    let levels = fetch_levels(env, true)
        .await
        .map_err(|err| worker::Error::RustError(err.to_string()))?;
    let clan = fetch_clan_profile(env, &clan_id)
        .await
        .map_err(|err| worker::Error::RustError(err.to_string()))?;
    let claims = list_all_claims(env).await?;
    let board = build_board(levels, clan, claims);

    Ok(board
        .levels
        .iter()
        .find(|level| level.id == level_id)
        .map(|level| matches!(level.completion.state, CompletionState::Completed))
        .unwrap_or(false))
}
