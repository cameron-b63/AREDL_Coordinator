use crate::env;
use worker::{Cache, Env, Result};

const CACHE_TTL_SECONDS: u32 = 900;
const BOARD_CACHE_VERSION: &str = "v=9";

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

pub async fn invalidate_clan_cache(env: &Env) -> Result<()> {
    let clan_id = env::aredl_clan_id(env)?;
    let cache = Cache::default();
    cache
        .delete(
            &format!("https://aredl-coordinator.internal/cache/clan?v=1&clan_id={clan_id}"),
            false,
        )
        .await?;
    Ok(())
}
