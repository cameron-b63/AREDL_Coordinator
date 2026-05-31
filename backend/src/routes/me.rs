use crate::aredl::{fetch_clan_profile_cached, fetch_user_profile_cached, hardest_from_profile};
use crate::auth::{resolve_session_identity, resolve_session_user, AuthError};
use crate::claims::list_claims_for_user;
use crate::env;
use crate::stats::viewer_stats_from_clan;
use serde::Serialize;
use worker::{Request, Response, Result, RouteContext};

#[derive(Serialize)]
struct MeResponse {
    user: Option<ApiUser>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ApiUser {
    id: String,
    discord_id: String,
    username: String,
    #[serde(rename = "avatarUrl")]
    avatar_url: Option<String>,
    is_admin: bool,
    stats: ViewerStatsJson,
    claims: Vec<UserClaimJson>,
    hardest: Option<HardestJson>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HardestJson {
    position: i32,
    level_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UserClaimJson {
    level_id: String,
    kind: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ViewerStatsJson {
    levels_contributed: i32,
    points_earned: i32,
}

pub async fn me(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let identity = match resolve_session_identity(&req, &ctx.env) {
        Ok(identity) => identity,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return unauthorized(),
    };

    let user = match resolve_session_user(&req, &ctx.env).await {
        Ok(user) => user,
        Err(AuthError::Unauthorized) => return unauthorized(),
        Err(AuthError::Forbidden) => return unauthorized(),
    };

    let clan_id = env::aredl_clan_id(&ctx.env)?;
    let clan = fetch_clan_profile_cached(&ctx.env, &clan_id)
        .await
        .map_err(|e| e.to_string())?;
    let stats = viewer_stats_from_clan(&clan, &user.discord_id);
    let claims = list_claims_for_user(&ctx.env, &user.id).await?;
    let hardest = fetch_user_profile_cached(&ctx.env, &user.discord_id)
        .await
        .ok()
        .and_then(|profile| hardest_from_profile(&profile))
        .map(|hardest| HardestJson {
            position: hardest.position,
            level_name: hardest.level_name,
        });

    Response::from_json(&MeResponse {
        user: Some(ApiUser {
            id: user.id,
            discord_id: user.discord_id,
            username: user.username,
            avatar_url: user.avatar_url,
            is_admin: identity.is_admin,
            stats: ViewerStatsJson {
                levels_contributed: stats.levels_contributed,
                points_earned: stats.points_earned,
            },
            claims: claims
                .into_iter()
                .map(|claim| UserClaimJson {
                    level_id: claim.level_id,
                    kind: claim.kind,
                })
                .collect(),
            hardest,
        }),
    })
}

fn unauthorized() -> Result<Response> {
    Ok(Response::from_json(&MeResponse { user: None })?.with_status(401))
}
