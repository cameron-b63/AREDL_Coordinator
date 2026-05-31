use serde::Serialize;
use worker::{Response, Result, RouteContext};

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    db: DbHealth,
}

#[derive(Serialize)]
struct DbHealth {
    claims_count: i64,
    users_count: i64,
    migrations_applied: i64,
}

#[derive(serde::Deserialize)]
struct CountRow {
    count: i64,
}

pub async fn health(_req: worker::Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;

    let claims_count = count_query(&db, "SELECT COUNT(*) AS count FROM claims").await?;
    let users_count = count_query(&db, "SELECT COUNT(*) AS count FROM users").await?;
    let migrations_applied =
        count_query(&db, "SELECT COUNT(*) AS count FROM d1_migrations").await.unwrap_or(0);

    Response::from_json(&HealthResponse {
        status: "ok",
        service: "aredl-coordinator",
        db: DbHealth {
            claims_count,
            users_count,
            migrations_applied,
        },
    })
}

async fn count_query(db: &worker::D1Database, sql: &str) -> Result<i64> {
    let row = db
        .prepare(sql)
        .first::<CountRow>(None)
        .await?
        .ok_or_else(|| worker::Error::RustError("missing count row".into()))?;
    Ok(row.count)
}
