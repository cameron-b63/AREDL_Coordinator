use crate::auth::{get_user_by_id, session_from_request, verify_session};
use crate::env;
use serde::Serialize;
use worker::{Request, Response, Result, RouteContext};

#[derive(Serialize)]
struct MeResponse {
    user: Option<ApiUser>,
}

#[derive(Serialize)]
struct ApiUser {
    id: String,
    username: String,
    #[serde(rename = "avatarUrl")]
    avatar_url: Option<String>,
}

pub async fn me(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let token = match session_from_request(&req) {
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

    Response::from_json(&MeResponse {
        user: Some(ApiUser {
            id: user.id,
            username: user.username,
            avatar_url: user.avatar_url,
        }),
    })
}

fn unauthorized() -> Result<Response> {
    Ok(Response::from_json(&MeResponse { user: None })?.with_status(401))
}
