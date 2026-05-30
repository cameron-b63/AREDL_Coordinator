use crate::claims::{list_claims_for_level, list_claims_for_user, select_dominant_claim, ClaimRow};
use serde::Serialize;
use worker::{Env, Result};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaimMutationResponse {
    pub level_id: String,
    pub claims: Vec<UserClaimJson>,
    pub level_active: Option<ActiveClaimJson>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserClaimJson {
    pub level_id: String,
    pub kind: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveClaimJson {
    pub kind: String,
    pub claimed_by: CompleterJson,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleterJson {
    pub username: String,
    pub avatar_url: Option<String>,
    pub discord_id: String,
}

pub async fn build_claim_mutation_response(
    env: &Env,
    user_id: &str,
    level_id: &str,
) -> Result<ClaimMutationResponse> {
    let user_claims = list_claims_for_user(env, user_id).await?;
    let level_claims = list_claims_for_level(env, level_id).await?;

    Ok(ClaimMutationResponse {
        level_id: level_id.to_string(),
        claims: user_claims
            .into_iter()
            .map(|claim| UserClaimJson {
                level_id: claim.level_id,
                kind: claim.kind,
            })
            .collect(),
        level_active: active_claim_json(&level_claims),
    })
}

fn active_claim_json(claims: &[ClaimRow]) -> Option<ActiveClaimJson> {
    select_dominant_claim(claims).map(|claim| ActiveClaimJson {
        kind: claim.kind.clone(),
        claimed_by: CompleterJson {
            username: claim.username.clone(),
            avatar_url: claim.avatar_url.clone(),
            discord_id: claim.discord_id.clone(),
        },
    })
}
