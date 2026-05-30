use uuid::Uuid;
use worker::{d1::D1Type, Env, Result};

#[derive(Debug, Clone)]
pub struct ClaimRow {
    pub id: String,
    pub level_id: String,
    pub kind: String,
    pub user_id: String,
    pub username: String,
    pub avatar_url: Option<String>,
    pub discord_id: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct ClaimHolder {
    pub user_id: String,
    pub discord_id: String,
}

#[derive(Debug, Clone)]
pub struct UserClaimSummary {
    pub level_id: String,
    pub kind: String,
}

pub async fn list_all_claims(env: &Env) -> Result<Vec<ClaimRow>> {
    let db = env.d1("DB")?;
    let rows = db
        .prepare(
            "SELECT c.id, c.level_id, c.priority, c.user_id, u.username, u.avatar_url, u.discord_id, c.updated_at
             FROM claims c
             INNER JOIN users u ON u.id = c.user_id",
        )
        .all()
        .await?
        .results::<ClaimQueryRow>()?;

    Ok(rows.into_iter().map(ClaimRow::from).collect())
}

pub async fn list_claims_for_level(env: &Env, level_id: &str) -> Result<Vec<ClaimRow>> {
    let db = env.d1("DB")?;
    let rows = db
        .prepare(
            "SELECT c.id, c.level_id, c.priority, c.user_id, u.username, u.avatar_url, u.discord_id, c.updated_at
             FROM claims c
             INNER JOIN users u ON u.id = c.user_id
             WHERE c.level_id = ?1",
        )
        .bind_refs(&[D1Type::Text(level_id)])?
        .all()
        .await?
        .results::<ClaimQueryRow>()?;

    Ok(rows.into_iter().map(ClaimRow::from).collect())
}

pub async fn list_claims_for_user(env: &Env, user_id: &str) -> Result<Vec<UserClaimSummary>> {
    let db = env.d1("DB")?;
    let rows = db
        .prepare("SELECT level_id, priority FROM claims WHERE user_id = ?1")
        .bind_refs(&[D1Type::Text(user_id)])?
        .all()
        .await?
        .results::<UserClaimRow>()?;

    Ok(rows
        .into_iter()
        .map(|row| UserClaimSummary {
            level_id: row.level_id,
            kind: row.priority,
        })
        .collect())
}

pub async fn get_user_claim_for_level(
    env: &Env,
    user_id: &str,
    level_id: &str,
) -> Result<Option<ClaimRow>> {
    let db = env.d1("DB")?;
    let row = db
        .prepare(
            "SELECT c.id, c.level_id, c.priority, c.user_id, u.username, u.avatar_url, u.discord_id, c.updated_at
             FROM claims c
             INNER JOIN users u ON u.id = c.user_id
             WHERE c.user_id = ?1 AND c.level_id = ?2",
        )
        .bind_refs(&[D1Type::Text(user_id), D1Type::Text(level_id)])?
        .first::<ClaimQueryRow>(None)
        .await?;

    Ok(row.map(ClaimRow::from))
}

pub async fn insert_claim(
    env: &Env,
    user_id: &str,
    level_id: &str,
    priority: &str,
) -> Result<()> {
    let db = env.d1("DB")?;
    let claim_id = Uuid::new_v4().to_string();
    db.prepare(
        "INSERT INTO claims (id, user_id, level_id, priority)
         VALUES (?1, ?2, ?3, ?4)",
    )
    .bind_refs(&[
        D1Type::Text(&claim_id),
        D1Type::Text(user_id),
        D1Type::Text(level_id),
        D1Type::Text(priority),
    ])?
    .run()
    .await?;

    Ok(())
}

pub async fn update_user_claim(
    env: &Env,
    user_id: &str,
    level_id: &str,
    priority: &str,
) -> Result<()> {
    let db = env.d1("DB")?;
    db.prepare(
        "UPDATE claims SET priority = ?1, updated_at = datetime('now')
         WHERE user_id = ?2 AND level_id = ?3",
    )
    .bind_refs(&[
        D1Type::Text(priority),
        D1Type::Text(user_id),
        D1Type::Text(level_id),
    ])?
    .run()
    .await?;

    Ok(())
}

pub async fn delete_user_claim_for_level(
    env: &Env,
    user_id: &str,
    level_id: &str,
) -> Result<bool> {
    let db = env.d1("DB")?;
    let result = db
        .prepare("DELETE FROM claims WHERE user_id = ?1 AND level_id = ?2")
        .bind_refs(&[D1Type::Text(user_id), D1Type::Text(level_id)])?
        .run()
        .await?;

    let changes = result.meta()?.and_then(|meta| meta.changes).unwrap_or(0);
    Ok(changes > 0)
}

pub async fn delete_all_claims_for_level(env: &Env, level_id: &str) -> Result<u32> {
    let db = env.d1("DB")?;
    let result = db
        .prepare("DELETE FROM claims WHERE level_id = ?1")
        .bind_refs(&[D1Type::Text(level_id)])?
        .run()
        .await?;

    Ok(result.meta()?.and_then(|meta| meta.changes).unwrap_or(0) as u32)
}

pub async fn list_distinct_claim_holders(env: &Env) -> Result<Vec<ClaimHolder>> {
    let db = env.d1("DB")?;
    let rows = db
        .prepare(
            "SELECT DISTINCT c.user_id, u.discord_id
             FROM claims c
             INNER JOIN users u ON u.id = c.user_id",
        )
        .all()
        .await?
        .results::<ClaimHolderRow>()?;

    Ok(rows
        .into_iter()
        .map(|row| ClaimHolder {
            user_id: row.user_id,
            discord_id: row.discord_id,
        })
        .collect())
}

pub async fn delete_claims_for_user_ids(env: &Env, user_ids: &[String]) -> Result<u32> {
    let mut total = 0u32;

    for user_id in user_ids {
        let db = env.d1("DB")?;
        let result = db
            .prepare("DELETE FROM claims WHERE user_id = ?1")
            .bind_refs(&[D1Type::Text(user_id)])?
            .run()
            .await?;
        total += result.meta()?.and_then(|meta| meta.changes).unwrap_or(0) as u32;
    }

    Ok(total)
}

#[derive(serde::Deserialize)]
struct ClaimQueryRow {
    id: String,
    level_id: String,
    priority: String,
    user_id: String,
    username: String,
    avatar_url: Option<String>,
    discord_id: String,
    updated_at: String,
}

impl From<ClaimQueryRow> for ClaimRow {
    fn from(row: ClaimQueryRow) -> Self {
        ClaimRow {
            id: row.id,
            level_id: row.level_id,
            kind: row.priority,
            user_id: row.user_id,
            username: row.username,
            avatar_url: row.avatar_url,
            discord_id: row.discord_id,
            updated_at: row.updated_at,
        }
    }
}

#[derive(serde::Deserialize)]
struct UserClaimRow {
    level_id: String,
    priority: String,
}

#[derive(serde::Deserialize)]
struct ClaimHolderRow {
    user_id: String,
    discord_id: String,
}
