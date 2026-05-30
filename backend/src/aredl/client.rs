use std::collections::HashMap;

use super::types::{ClanProfile, ResolvedLevelDetail, UpstreamLevel};
use crate::env;
use futures::future::join_all;
use serde::Deserialize;
use worker::{Env, Fetch, Method, Request};

#[derive(Debug)]
pub struct UpstreamError {
    pub status: u16,
}

pub async fn fetch_levels(
    env: &Env,
    exclude_legacy: bool,
) -> std::result::Result<Vec<UpstreamLevel>, UpstreamError> {
    let base = env::aredl_api_base(env).map_err(|_| UpstreamError { status: 0 })?;
    let url = if exclude_legacy {
        format!("{base}/aredl/levels?exclude_legacy=true")
    } else {
        format!("{base}/aredl/levels")
    };
    fetch_json(&url).await
}

pub async fn fetch_clan_profile(
    env: &Env,
    clan_id: &str,
) -> std::result::Result<ClanProfile, UpstreamError> {
    let base = env::aredl_api_base(env).map_err(|_| UpstreamError { status: 0 })?;
    let url = format!("{base}/aredl/clan/{clan_id}");
    fetch_json(&url).await
}

const SHOWCASE_FETCH_CHUNK: usize = 40;

/// Official AREDL showcase (verification) YouTube URLs keyed by level UUID.
pub async fn fetch_showcase_videos(
    env: &Env,
    level_ids: &[String],
) -> std::result::Result<HashMap<String, String>, UpstreamError> {
    let base = env::aredl_api_base(env).map_err(|_| UpstreamError { status: 0 })?;
    let mut showcases = HashMap::new();

    for chunk in level_ids.chunks(SHOWCASE_FETCH_CHUNK) {
        let requests: Vec<_> = chunk
            .iter()
            .map(|level_id| fetch_level_showcase(&base, level_id))
            .collect();
        let results = join_all(requests).await;
        for result in results {
            if let Some((level_id, video_url)) = result {
                showcases.insert(level_id, video_url);
            }
        }
    }

    Ok(showcases)
}

async fn fetch_level_showcase(base: &str, level_id: &str) -> Option<(String, String)> {
    let url = format!("{base}/aredl/levels/{level_id}");
    let detail: ResolvedLevelDetail = fetch_json(&url).await.ok()?;
    let video_url = detail.verifications.first()?.video_url.clone();
    if video_url.is_empty() {
        return None;
    }
    Some((level_id.to_string(), video_url))
}

async fn fetch_json<T>(url: &str) -> std::result::Result<T, UpstreamError>
where
    T: for<'de> Deserialize<'de>,
{
    let request = Request::new(url, Method::Get)
        .map_err(|_| UpstreamError { status: 0 })?;
    let mut response = Fetch::Request(request)
        .send()
        .await
        .map_err(|_| UpstreamError { status: 0 })?;
    let status = response.status_code();

    if !(200..300).contains(&status) {
        return Err(UpstreamError { status });
    }

    response.json().await.map_err(|_| UpstreamError { status: 0 })
}

impl std::fmt::Display for UpstreamError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "AREDL API returned {}", self.status)
    }
}
