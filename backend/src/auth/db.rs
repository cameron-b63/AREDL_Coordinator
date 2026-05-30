use uuid::Uuid;
use worker::{d1::D1Type, Env, Result};

#[derive(Debug, Clone)]
pub struct UserRecord {
    pub id: String,
    pub discord_id: String,
    pub username: String,
    pub avatar_url: Option<String>,
}

pub async fn upsert_user(
    env: &Env,
    discord_id: &str,
    username: &str,
    avatar_url: Option<&str>,
) -> Result<UserRecord> {
    let db = env.d1("DB")?;
    let existing = db
        .prepare("SELECT id FROM users WHERE discord_id = ?1")
        .bind_refs(&[D1Type::Text(discord_id)])?
        .first::<ExistingUser>(None)
        .await?;

    let user_id = if let Some(row) = existing {
        row.id
    } else {
        Uuid::new_v4().to_string()
    };

    db.prepare(
        "INSERT INTO users (id, discord_id, username, avatar_url)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(discord_id) DO UPDATE SET
           username = excluded.username,
           avatar_url = excluded.avatar_url",
    )
    .bind_refs(&[
        D1Type::Text(&user_id),
        D1Type::Text(discord_id),
        D1Type::Text(username),
        match avatar_url {
            Some(url) => D1Type::Text(url),
            None => D1Type::Null,
        },
    ])?
    .run()
    .await?;

    get_user_by_id(env, &user_id)
        .await?
        .ok_or_else(|| worker::Error::RustError("user row missing after upsert".into()))
}

pub async fn get_user_by_id(env: &Env, user_id: &str) -> Result<Option<UserRecord>> {
    let db = env.d1("DB")?;
    let row = db
        .prepare("SELECT id, discord_id, username, avatar_url FROM users WHERE id = ?1")
        .bind_refs(&[D1Type::Text(user_id)])?
        .first::<UserRow>(None)
        .await?;

    Ok(row.map(|row| UserRecord {
        id: row.id,
        discord_id: row.discord_id,
        username: row.username,
        avatar_url: row.avatar_url,
    }))
}

#[derive(serde::Deserialize)]
struct ExistingUser {
    id: String,
}

#[derive(serde::Deserialize)]
struct UserRow {
    id: String,
    discord_id: String,
    username: String,
    avatar_url: Option<String>,
}
