mod cache;
mod client;
mod profile;
mod types;

pub use cache::{fetch_clan_profile_cached, fetch_user_profile_cached, level_has_clan_completion};
pub use client::{fetch_clan_profile, fetch_level_showcase, fetch_levels, fetch_user_profile, UpstreamError};
pub use profile::{hardest_from_profile, HardestCompletion};
pub use types::{ClanProfile, ClanRecord, ClanRecordLevel, ClanRecordUser, UpstreamLevel, UserProfile};

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
