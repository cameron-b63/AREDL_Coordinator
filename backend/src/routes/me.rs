use crate::aredl::fetch_clan_profile;
use crate::auth::{get_user_by_id, session_token_from_request, verify_session};
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
    stats: ViewerStatsJson,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ViewerStatsJson {
    levels_contributed: i32,
    points_earned: i32,
}

pub async fn me(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let token = match session_token_from_request(&req) {
        Some(token) => token,
        None => return unauthorized(),
    };

    let jwt_secret = env::jwt_secret(&ctx.env)?;
    let user_id = match verify_session(&token, &jwt_secret)? {
        Some(user_id) => user_id,
        None => return unauthorized(),
    };

    let user = match get_user_by_id(&ctx.env, &user_id).await? {
        Some(user) => user,
        None => return unauthorized(),
    };

    let clan_id = env::aredl_clan_id(&ctx.env)?;
    let clan = fetch_clan_profile(&ctx.env, &clan_id).await.map_err(|e| e.to_string())?;
    let stats = viewer_stats_from_clan(&clan, &user.discord_id);

    Response::from_json(&MeResponse {
        user: Some(ApiUser {
            id: user.id,
            discord_id: user.discord_id,
            username: user.username,
            avatar_url: user.avatar_url,
            stats: ViewerStatsJson {
                levels_contributed: stats.levels_contributed,
                points_earned: stats.points_earned,
            },
        }),
    })
}

fn unauthorized() -> Result<Response> {
    Ok(Response::from_json(&MeResponse { user: None })?.with_status(401))
}
