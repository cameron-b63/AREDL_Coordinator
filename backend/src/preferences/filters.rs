use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StoredLevelFilters {
    pub exclude_completed: bool,
    pub exclude_new_hardests: bool,
    pub only_my_completions: bool,
    pub only_unclaimed: bool,
    pub board_claim_kinds: Vec<String>,
    pub only_mine: bool,
    #[serde(default)]
    pub position_min: Option<i32>,
    #[serde(default)]
    pub position_max: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StoredUserPreferences {
    pub filters: StoredLevelFilters,
    pub sort_direction: String,
    #[serde(default = "default_sort_mode")]
    pub sort_mode: String,
}

const VALID_CLAIM_KINDS: &[&str] = &[
    "begrudgingly_earmarked",
    "claimed",
    "locked_down",
    "supposedly_completed",
];

pub fn default_preferences() -> StoredUserPreferences {
    StoredUserPreferences {
        filters: StoredLevelFilters {
            exclude_completed: false,
            exclude_new_hardests: false,
            only_my_completions: false,
            only_unclaimed: false,
            board_claim_kinds: vec![],
            only_mine: false,
            position_min: None,
            position_max: None,
        },
        sort_direction: "asc".into(),
        sort_mode: default_sort_mode(),
    }
}

fn default_sort_mode() -> String {
    "position".into()
}

pub fn parse_preferences_json(json: Option<&str>) -> StoredUserPreferences {
    let Some(raw) = json.filter(|value| !value.trim().is_empty()) else {
        return default_preferences();
    };
    serde_json::from_str(raw).unwrap_or_else(|_| default_preferences())
}

pub fn validate_preferences(prefs: &StoredUserPreferences) -> Result<(), &'static str> {
    if prefs.sort_direction != "asc" && prefs.sort_direction != "desc" {
        return Err("sortDirection must be asc or desc");
    }
    if prefs.sort_mode != "position" && prefs.sort_mode != "record_date" {
        return Err("sortMode must be position or record_date");
    }
    for kind in &prefs.filters.board_claim_kinds {
        if !VALID_CLAIM_KINDS.contains(&kind.as_str()) {
            return Err("invalid boardClaimKinds entry");
        }
    }
    if let Some(min) = prefs.filters.position_min {
        if min < 1 {
            return Err("positionMin must be at least 1");
        }
    }
    if let Some(max) = prefs.filters.position_max {
        if max < 1 {
            return Err("positionMax must be at least 1");
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_missing_json_uses_defaults() {
        let prefs = parse_preferences_json(None);
        assert_eq!(prefs, default_preferences());
    }

    #[test]
    fn validate_rejects_invalid_sort() {
        let mut prefs = default_preferences();
        prefs.sort_direction = "sideways".into();
        assert!(validate_preferences(&prefs).is_err());
    }
}
