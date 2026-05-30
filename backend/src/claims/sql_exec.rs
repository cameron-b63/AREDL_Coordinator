use crate::claims::sql_validate::{validate_claims_sql, SqlKind, SqlValidationError};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use worker::{Env, Result};

const MAX_ROWS: usize = 1000;

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ClaimsSqlResult {
    #[serde(rename = "query")]
    Query {
        columns: Vec<String>,
        rows: Vec<HashMap<String, Value>>,
        row_count: usize,
        #[serde(skip_serializing_if = "is_false")]
        truncated: bool,
    },
    #[serde(rename = "mutation")]
    Mutation { changes: u32 },
}

pub async fn execute_claims_sql(env: &Env, sql: &str) -> Result<ClaimsSqlResult, SqlExecError> {
    let kind = validate_claims_sql(sql).map_err(SqlExecError::Validation)?;

    let db = env.d1("DB").map_err(|err| SqlExecError::Database(err.to_string()))?;

    match kind {
        SqlKind::Query => {
            let result = db
                .prepare(sql)
                .all()
                .await
                .map_err(|err| SqlExecError::Database(err.to_string()))?;
            let rows: Vec<HashMap<String, Value>> = result
                .results()
                .map_err(|err| SqlExecError::Database(err.to_string()))?;

            let total = rows.len();
            let truncated = total > MAX_ROWS;
            let rows: Vec<_> = rows.into_iter().take(MAX_ROWS).collect();

            let columns = rows
                .first()
                .map(|row| {
                    let mut keys: Vec<_> = row.keys().cloned().collect();
                    keys.sort();
                    keys
                })
                .unwrap_or_default();

            Ok(ClaimsSqlResult::Query {
                columns,
                row_count: total,
                rows,
                truncated,
            })
        }
        SqlKind::Mutation => {
            let result = db
                .prepare(sql)
                .run()
                .await
                .map_err(|err| SqlExecError::Database(err.to_string()))?;
            let changes = result
                .meta()
                .ok()
                .flatten()
                .and_then(|meta| meta.changes)
                .unwrap_or(0) as u32;

            Ok(ClaimsSqlResult::Mutation { changes })
        }
    }
}

#[derive(Debug)]
pub enum SqlExecError {
    Validation(SqlValidationError),
    Database(String),
}

fn is_false(value: &bool) -> bool {
    !*value
}

impl SqlExecError {
    pub fn message(&self) -> String {
        match self {
            SqlExecError::Validation(err) => err.message.clone(),
            SqlExecError::Database(msg) => msg.clone(),
        }
    }
}
