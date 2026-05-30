use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct UpstreamLevel {
    pub id: String,
    pub name: String,
    pub position: i32,
}

/// `GET /aredl/clan/{id}` — clan profile with completed records.
#[derive(Debug, Deserialize)]
pub struct ClanProfile {
    pub records: Vec<ClanRecord>,
}

#[derive(Debug, Deserialize)]
pub struct ClanRecord {
    pub level: ClanRecordLevel,
    pub submitted_by: ClanRecordUser,
    pub achieved_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ClanRecordLevel {
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct ClanRecordUser {
    pub username: String,
    pub global_name: Option<String>,
    pub discord_id: String,
    pub discord_avatar: Option<String>,
}
