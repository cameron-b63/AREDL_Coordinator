use crate::aredl::{fetch_clan_profile_cached, fetch_user_profile_cached, hardest_from_profile};
use crate::auth::{resolve_session_identity, resolve_session_user, AuthError, UserRecord};
use crate::claims::list_claims_for_user;
use crate::env;
use crate::preferences::{
    effective_hardest, get_user_preferences, parse_preferences_json, StoredUserPreferences,
};
use crate::stats::viewer_stats_from_clan;
use serde::Serialize;
use worker::{Request, Response, Result, RouteContext};

#[derive(Serialize)]
pub struct MeResponse {
    pub user: Option<ApiUser>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiUser {
    pub id: String,
    pub discord_id: String,
    pub username: String,
    #[serde(rename = "avatarUrl")]
    pub avatar_url: Option<String>,
    pub is_admin: bool,
    pub stats: ViewerStatsJson,
    pub claims: Vec<UserClaimJson>,
    pub hardest: Option<HardestJson>,
    pub aredl_hardest: Option<HardestJson>,
    pub manual_hardest: Option<HardestJson>,
    pub preferences: StoredUserPreferences,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HardestJson {
    pub position: i32,
    pub level_name: String,
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

    let api_user = build_api_user_with_admin(&req, &ctx, &user, identity.is_admin).await?;
    Response::from_json(&MeResponse {
        user: Some(api_user),
    })
}

pub async fn build_api_user(
    req: &Request,
    ctx: &RouteContext<()>,
    user: &UserRecord,
) -> Result<ApiUser> {
    let identity = match resolve_session_identity(req, &ctx.env) {
        Ok(identity) => identity,
        Err(AuthError::Unauthorized) | Err(AuthError::Forbidden) => {
            return Err(worker::Error::RustError("unauthorized".into()));
        }
    };
    build_api_user_with_admin(req, ctx, user, identity.is_admin).await
}

async fn build_api_user_with_admin(
    _req: &Request,
    ctx: &RouteContext<()>,
    user: &UserRecord,
    is_admin: bool,
) -> Result<ApiUser> {
    let clan_id = env::aredl_clan_id(&ctx.env)?;
    let clan = fetch_clan_profile_cached(&ctx.env, &clan_id)
        .await
        .map_err(|e| e.to_string())?;
    let stats = viewer_stats_from_clan(&clan, &user.discord_id);
    let claims = list_claims_for_user(&ctx.env, &user.id).await?;

    let aredl_hardest = fetch_user_profile_cached(&ctx.env, &user.discord_id)
        .await
        .ok()
        .and_then(|profile| hardest_from_profile(&profile));

    let prefs_row = get_user_preferences(&ctx.env, &user.id).await?;
    let preferences = parse_preferences_json(prefs_row.preferences_json.as_deref());
    let manual_hardest = prefs_row.manual_hardest.as_ref();
    let effective = effective_hardest(manual_hardest, aredl_hardest.as_ref());

    Ok(ApiUser {
        id: user.id.clone(),
        discord_id: user.discord_id.clone(),
        username: user.username.clone(),
        avatar_url: user.avatar_url.clone(),
        is_admin,
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
        hardest: effective.map(hardest_to_json),
        aredl_hardest: aredl_hardest.map(hardest_to_json),
        manual_hardest: manual_hardest.map(|h| HardestJson {
            position: h.position,
            level_name: h.level_name.clone(),
        }),
        preferences,
    })
}

fn hardest_to_json(hardest: crate::aredl::HardestCompletion) -> HardestJson {
    HardestJson {
        position: hardest.position,
        level_name: hardest.level_name,
    }
}

fn unauthorized() -> Result<Response> {
    Ok(Response::from_json(&MeResponse { user: None })?.with_status(401))
}

