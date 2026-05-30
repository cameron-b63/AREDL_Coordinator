mod client;
mod types;

pub use client::{fetch_clan_profile, fetch_level_showcase, fetch_levels, UpstreamError};
pub use types::{ClanProfile, UpstreamLevel};

pub fn user_avatar_url(discord_id: &str, discord_avatar: Option<&str>) -> Option<String> {
    match discord_avatar {
        Some(hash) if !hash.is_empty() => Some(format!(
            "https://cdn.discordapp.com/avatars/{discord_id}/{hash}.png"
        )),
        _ => {
            let index = discord_id.parse::<u64>().ok().map(|id| (id >> 22) % 6)?;
            Some(format!("https://cdn.discordapp.com/embed/avatars/{index}.png"))
        }
    }
}

pub fn user_display_name(username: &str, global_name: Option<&str>) -> String {
    global_name
        .filter(|name| !name.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| username.to_string())
}
