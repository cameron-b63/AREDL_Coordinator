use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct UpstreamLevel {
    pub id: String,
    pub name: String,
    pub position: i32,
    #[serde(default)]
    pub points: i32,
    #[serde(default)]
    pub level_id: i32,
    #[serde(default)]
    pub two_player: bool,
    #[serde(default)]
    pub tags: Vec<Option<String>>,
}

/// `GET /aredl/clan/{id}` — clan profile with completed records.
#[derive(Debug, Deserialize, Serialize)]
pub struct ClanProfile {
    pub records: Vec<ClanRecord>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ClanRecord {
    pub level: ClanRecordLevel,
    pub submitted_by: ClanRecordUser,
    pub achieved_at: String,
    pub video_url: String,
    #[serde(default)]
    pub is_verification: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ClanRecordLevel {
    pub id: String,
    #[serde(default)]
    pub points: i32,
}

#[derive(Debug, Deserialize)]
pub struct LevelVerification {
    pub video_url: String,
}

/// `GET /aredl/levels/{id}` — includes official list verifications (showcase).
#[derive(Debug, Deserialize)]
pub struct ResolvedLevelDetail {
    pub verifications: Vec<LevelVerification>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ClanRecordUser {
    pub username: String,
    pub global_name: Option<String>,
    pub discord_id: String,
    pub discord_avatar: Option<String>,
}
