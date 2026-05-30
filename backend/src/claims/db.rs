use worker::{Env, Result};

#[derive(Debug, Clone)]
pub struct ClaimRow {
    pub level_id: String,
    pub kind: String,
    pub user_id: String,
    pub username: String,
    pub avatar_url: Option<String>,
    pub discord_id: String,
}

pub async fn list_all_claims(env: &Env) -> Result<Vec<ClaimRow>> {
    let db = env.d1("DB")?;
    let rows = db
        .prepare(
            "SELECT c.level_id, c.priority, c.user_id, u.username, u.avatar_url, u.discord_id
             FROM claims c
             INNER JOIN users u ON u.id = c.user_id",
        )
        .all()
        .await?
        .results::<ClaimQueryRow>()?;

    Ok(rows
        .into_iter()
        .map(|row| ClaimRow {
            level_id: row.level_id,
            kind: row.priority,
            user_id: row.user_id,
            username: row.username,
            avatar_url: row.avatar_url,
            discord_id: row.discord_id,
        })
        .collect())
}

#[derive(serde::Deserialize)]
struct ClaimQueryRow {
    level_id: String,
    priority: String,
    user_id: String,
    username: String,
    avatar_url: Option<String>,
    discord_id: String,
}
