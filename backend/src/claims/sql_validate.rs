#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SqlKind {
    Query,
    Mutation,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SqlValidationError {
    pub message: String,
}

impl SqlValidationError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

pub fn validate_claims_sql(sql: &str) -> Result<SqlKind, SqlValidationError> {
    let normalized = normalize_sql(sql);
    if normalized.is_empty() {
        return Err(SqlValidationError::new("SQL must not be empty"));
    }

    if normalized.contains(';') {
        return Err(SqlValidationError::new(
            "Only a single SQL statement is allowed",
        ));
    }

    if contains_forbidden_token(&normalized) {
        return Err(SqlValidationError::new(
            "Statement contains a forbidden SQL keyword",
        ));
    }

    let kind = statement_kind(&normalized)?;

    match kind {
        SqlKind::Query => validate_select(&normalized)?,
        SqlKind::Mutation => validate_mutation(&normalized)?,
    }

    Ok(kind)
}

fn normalize_sql(sql: &str) -> String {
    let mut out = strip_block_comments(sql);
    out = strip_line_comments(&out);
    let mut out = out.trim().to_string();
    if out.ends_with(';') {
        out.pop();
        out = out.trim().to_string();
    }
    collapse_whitespace(&out)
}

fn strip_block_comments(sql: &str) -> String {
    let mut out = String::with_capacity(sql.len());
    let mut chars = sql.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '/' && chars.peek() == Some(&'*') {
            chars.next();
            let mut prev = '\0';
            for c in chars.by_ref() {
                if prev == '*' && c == '/' {
                    break;
                }
                prev = c;
            }
            out.push(' ');
            continue;
        }
        out.push(ch);
    }
    out
}

fn strip_line_comments(sql: &str) -> String {
    let mut out = String::with_capacity(sql.len());
    for line in sql.lines() {
        if let Some(idx) = line.find("--") {
            out.push_str(line[..idx].trim_end());
        } else {
            out.push_str(line);
        }
        out.push(' ');
    }
    out
}

fn collapse_whitespace(sql: &str) -> String {
    let mut out = String::with_capacity(sql.len());
    let mut prev_space = true;
    for ch in sql.chars() {
        if ch.is_whitespace() {
            if !prev_space {
                out.push(' ');
            }
            prev_space = true;
        } else {
            out.push(ch);
            prev_space = false;
        }
    }
    out.trim().to_string()
}

const FORBIDDEN: &[&str] = &[
    "DROP", "ALTER", "CREATE", "PRAGMA", "ATTACH", "DETACH", "TRUNCATE", "REPLACE", "VACUUM",
    "REINDEX",
];

fn contains_forbidden_token(normalized: &str) -> bool {
    let upper = normalized.to_uppercase();
    FORBIDDEN
        .iter()
        .any(|token| contains_word(&upper, token))
}

fn contains_word(haystack: &str, word: &str) -> bool {
    let bytes = haystack.as_bytes();
    let word_bytes = word.as_bytes();
    let len = word_bytes.len();
    if len == 0 || haystack.len() < len {
        return false;
    }
    let mut start = 0;
    while let Some(pos) = haystack[start..].find(word) {
        let idx = start + pos;
        let before_ok = idx == 0 || !is_ident_char(bytes[idx - 1]);
        let after_idx = idx + len;
        let after_ok = after_idx >= bytes.len() || !is_ident_char(bytes[after_idx]);
        if before_ok && after_ok {
            return true;
        }
        start = idx + 1;
    }
    false
}

fn is_ident_char(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || byte == b'_'
}

fn statement_kind(normalized: &str) -> Result<SqlKind, SqlValidationError> {
    let upper = normalized.to_uppercase();
    if upper.starts_with("SELECT ") || upper == "SELECT" {
        return Ok(SqlKind::Query);
    }
    if upper.starts_with("INSERT ")
        || upper.starts_with("UPDATE ")
        || upper.starts_with("DELETE ")
    {
        return Ok(SqlKind::Mutation);
    }
    Err(SqlValidationError::new(
        "Only SELECT, INSERT, UPDATE, and DELETE are allowed",
    ))
}

fn validate_select(normalized: &str) -> Result<(), SqlValidationError> {
    let upper = normalized.to_uppercase();
    if !contains_word(&upper, "CLAIMS") {
        return Err(SqlValidationError::new(
            "SELECT must reference the claims table",
        ));
    }
    Ok(())
}

fn validate_mutation(normalized: &str) -> Result<(), SqlValidationError> {
    let upper = normalized.to_uppercase();

    if contains_word(&upper, "USERS") {
        return Err(SqlValidationError::new(
            "Mutations must not reference the users table",
        ));
    }

    let valid = if upper.starts_with("INSERT ") {
        upper.starts_with("INSERT INTO CLAIMS ")
            || upper.starts_with("INSERT INTO CLAIMS(")
            || upper.starts_with("INSERT INTO CLAIMS (")
    } else if upper.starts_with("UPDATE ") {
        upper.starts_with("UPDATE CLAIMS ")
            || upper.starts_with("UPDATE CLAIMS SET ")
    } else if upper.starts_with("DELETE ") {
        upper.starts_with("DELETE FROM CLAIMS ")
            || upper == "DELETE FROM CLAIMS"
    } else {
        false
    };

    if !valid {
        return Err(SqlValidationError::new(
            "INSERT must target claims; UPDATE must use UPDATE claims; DELETE must use DELETE FROM claims",
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_select_with_users_join() {
        let sql = "SELECT c.id, u.username FROM claims c JOIN users u ON u.id = c.user_id LIMIT 10";
        assert_eq!(validate_claims_sql(sql).unwrap(), SqlKind::Query);
    }

    #[test]
    fn allows_insert_update_delete_on_claims() {
        assert_eq!(
            validate_claims_sql("INSERT INTO claims (id, user_id, level_id, priority) VALUES ('a','b','c','claimed')")
                .unwrap(),
            SqlKind::Mutation
        );
        assert_eq!(
            validate_claims_sql("UPDATE claims SET priority = 'claimed' WHERE level_id = '1'")
                .unwrap(),
            SqlKind::Mutation
        );
        assert_eq!(
            validate_claims_sql("DELETE FROM claims WHERE level_id = '1'").unwrap(),
            SqlKind::Mutation
        );
    }

    #[test]
    fn rejects_multi_statement() {
        assert!(validate_claims_sql("SELECT 1; SELECT 2").is_err());
    }

    #[test]
    fn rejects_drop_and_alter() {
        assert!(validate_claims_sql("DROP TABLE claims").is_err());
        assert!(validate_claims_sql("SELECT * FROM claims; DROP TABLE users").is_err());
        assert!(validate_claims_sql("ALTER TABLE claims ADD COLUMN x TEXT").is_err());
    }

    #[test]
    fn rejects_select_without_claims() {
        assert!(validate_claims_sql("SELECT * FROM users").is_err());
    }

    #[test]
    fn rejects_mutations_on_users() {
        assert!(validate_claims_sql("DELETE FROM users").is_err());
        assert!(validate_claims_sql("UPDATE users SET username = 'x'").is_err());
        assert!(validate_claims_sql("INSERT INTO users (id, discord_id, username) VALUES ('a','b','c')").is_err());
    }

    #[test]
    fn rejects_wrong_mutation_targets() {
        assert!(validate_claims_sql("UPDATE users SET username = 'x' WHERE id = '1'").is_err());
        assert!(validate_claims_sql("DELETE FROM claims_extra").is_err());
    }

    #[test]
    fn strips_comments_before_validation() {
        let sql = "SELECT * FROM claims -- DROP TABLE users\nLIMIT 1";
        assert_eq!(validate_claims_sql(sql).unwrap(), SqlKind::Query);
        let sql = "/* DELETE FROM users */ SELECT id FROM claims";
        assert_eq!(validate_claims_sql(sql).unwrap(), SqlKind::Query);
    }

    #[test]
    fn rejects_hidden_forbidden_in_comment_block_for_mutation() {
        assert!(validate_claims_sql("INSERT INTO claims VALUES (1) /* ; DROP TABLE claims */").is_ok());
    }
}
