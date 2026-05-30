use super::session::redirect_response;
use crate::env;
use serde::Deserialize;
use worker::{Fetch, Method, Request, RequestInit, Response, Result};

const DISCORD_AUTHORIZE: &str = "https://discord.com/oauth2/authorize";
const DISCORD_TOKEN: &str = "https://discord.com/api/oauth2/token";
const DISCORD_USER: &str = "https://discord.com/api/users/@me";
const OAUTH_SCOPE: &str = "identify";

#[derive(Debug, Clone)]
pub struct DiscordUser {
    pub id: String,
    pub username: String,
    pub avatar: Option<String>,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
}

#[derive(Deserialize)]
struct DiscordUserResponse {
    id: String,
    username: String,
    avatar: Option<String>,
}

pub fn authorize_url(client_id: &str, redirect_uri: &str, state: &str) -> String {
    format!(
        "{DISCORD_AUTHORIZE}?response_type=code&client_id={}&redirect_uri={}&scope={}&state={}",
        form_encode(client_id),
        form_encode(redirect_uri),
        form_encode(OAUTH_SCOPE),
        form_encode(state),
    )
}

pub async fn exchange_code(
    client_id: &str,
    client_secret: &str,
    code: &str,
    redirect_uri: &str,
) -> Result<String> {
    let body = format!(
        "client_id={}&client_secret={}&grant_type=authorization_code&code={}&redirect_uri={}",
        form_encode(client_id),
        form_encode(client_secret),
        form_encode(code),
        form_encode(redirect_uri),
    );

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_body(Some(body.into()));

    let mut request = Request::new_with_init(DISCORD_TOKEN, &init)?;
    request
        .headers_mut()?
        .set("Content-Type", "application/x-www-form-urlencoded")?;

    let mut response = Fetch::Request(request).send().await?;
    let status = response.status_code();
    if !(200..300).contains(&status) {
        return Err(format!("discord token exchange failed: {status}").into());
    }

    let token: TokenResponse = response.json().await?;
    Ok(token.access_token)
}

pub async fn fetch_user(access_token: &str) -> Result<DiscordUser> {
    let mut request = Request::new(DISCORD_USER, Method::Get)?;
    request
        .headers_mut()?
        .set("Authorization", &format!("Bearer {access_token}"))?;

    let mut response = Fetch::Request(request).send().await?;
    let status = response.status_code();
    if !(200..300).contains(&status) {
        return Err(format!("discord user fetch failed: {status}").into());
    }

    let user: DiscordUserResponse = response.json().await?;
    Ok(DiscordUser {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
    })
}

pub fn avatar_url(discord_id: &str, avatar: Option<&str>) -> Option<String> {
    match avatar {
        Some(hash) => Some(format!(
            "https://cdn.discordapp.com/avatars/{discord_id}/{hash}.png"
        )),
        None => {
            let index = discord_id.parse::<u64>().ok().map(|id| (id >> 22) % 6)?;
            Some(format!("https://cdn.discordapp.com/embed/avatars/{index}.png"))
        }
    }
}

pub fn auth_error_redirect(env: &worker::Env, message: &str) -> Result<Response> {
    let base = env::frontend_redirect_url(env)?;
    let location = format!(
        "{base}?auth=error&message={}",
        form_encode(message)
    );
    redirect_response(&location)
}

fn form_encode(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    encoded
}
