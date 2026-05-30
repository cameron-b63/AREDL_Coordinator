use super::{fetch_clan_profile, ClanProfile, UpstreamError};
use crate::env;
use worker::{Cache, Env, Result};

const CLAN_CACHE_TTL_SECONDS: u32 = 900;

fn clan_cache_key(clan_id: &str) -> String {
    format!("https://aredl-coordinator.internal/cache/clan?v=1&clan_id={clan_id}")
}

pub async fn fetch_clan_profile_cached(
    env: &Env,
    clan_id: &str,
) -> std::result::Result<ClanProfile, UpstreamError> {
    let cache = Cache::default();
    let key = clan_cache_key(clan_id);

    if let Ok(Some(mut cached)) = cache.get(&key, false).await {
        if let Ok(profile) = cached.json::<ClanProfile>().await {
            return Ok(profile);
        }
    }

    let profile = fetch_clan_profile(env, clan_id).await?;
    if let Ok(mut response) = worker::Response::from_json(&profile) {
        let _ = response.headers_mut().set(
            "Cache-Control",
            &format!("public, max-age={CLAN_CACHE_TTL_SECONDS}, s-maxage={CLAN_CACHE_TTL_SECONDS}"),
        );
        let _ = cache.put(&key, response).await;
    }

    Ok(profile)
}

pub async fn level_has_clan_completion(env: &Env, level_id: &str) -> Result<bool> {
    let clan_id = env::aredl_clan_id(env)?;
    let clan = fetch_clan_profile_cached(env, &clan_id)
        .await
        .map_err(|err| worker::Error::RustError(err.to_string()))?;

    Ok(clan
        .records
        .iter()
        .any(|record| record.level.id == level_id))
}
