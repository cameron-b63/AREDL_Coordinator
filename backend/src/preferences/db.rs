use worker::{d1::D1Type, Env, Result};

#[derive(Debug, Clone)]
pub struct ManualHardest {
    pub position: i32,
    pub level_name: String,
}

#[derive(Debug, Clone, Default)]
pub struct UserPreferencesRow {
    pub manual_hardest: Option<ManualHardest>,
    pub preferences_json: Option<String>,
}

pub async fn get_user_preferences(env: &Env, user_id: &str) -> Result<UserPreferencesRow> {
    let db = env.d1("DB")?;
    let row = db
        .prepare(
            "SELECT manual_hardest_position, manual_hardest_level_name, preferences_json
             FROM users WHERE id = ?1",
        )
        .bind_refs(&[D1Type::Text(user_id)])?
        .first::<PreferencesRow>(None)
        .await?;

    Ok(row.map(row_into_preferences).unwrap_or_default())
}

pub async fn set_manual_hardest(
    env: &Env,
    user_id: &str,
    position: i32,
    level_name: &str,
) -> Result<()> {
    let db = env.d1("DB")?;
    db.prepare(
        "UPDATE users SET manual_hardest_position = ?1, manual_hardest_level_name = ?2
         WHERE id = ?3",
    )
    .bind_refs(&[
        D1Type::Integer(position.into()),
        D1Type::Text(level_name),
        D1Type::Text(user_id),
    ])?
    .run()
    .await?;
    Ok(())
}

pub async fn clear_manual_hardest(env: &Env, user_id: &str) -> Result<()> {
    let db = env.d1("DB")?;
    db.prepare(
        "UPDATE users SET manual_hardest_position = NULL, manual_hardest_level_name = NULL
         WHERE id = ?1",
    )
    .bind_refs(&[D1Type::Text(user_id)])?
    .run()
    .await?;
    Ok(())
}

pub async fn set_preferences_json(env: &Env, user_id: &str, json: &str) -> Result<()> {
    let db = env.d1("DB")?;
    db.prepare("UPDATE users SET preferences_json = ?1 WHERE id = ?2")
        .bind_refs(&[D1Type::Text(json), D1Type::Text(user_id)])?
        .run()
        .await?;
    Ok(())
}

fn row_into_preferences(row: PreferencesRow) -> UserPreferencesRow {
    let manual_hardest = match (row.manual_hardest_position, row.manual_hardest_level_name) {
        (Some(position), Some(level_name)) if !level_name.is_empty() => Some(ManualHardest {
            position,
            level_name,
        }),
        _ => None,
    };
    UserPreferencesRow {
        manual_hardest,
        preferences_json: row.preferences_json,
    }
}

#[derive(serde::Deserialize)]
struct PreferencesRow {
    manual_hardest_position: Option<i32>,
    manual_hardest_level_name: Option<String>,
    preferences_json: Option<String>,
}
