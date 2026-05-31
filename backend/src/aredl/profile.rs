use super::types::{ProfileRecord, UserProfile};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HardestCompletion {
    pub position: i32,
    pub level_name: String,
}

pub fn hardest_from_profile(profile: &UserProfile) -> Option<HardestCompletion> {
    profile
        .records
        .iter()
        .filter(|record| !record.is_verification)
        .min_by_key(|record| record.level.position)
        .map(|record| HardestCompletion {
            position: record.level.position,
            level_name: record.level.name.clone(),
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::aredl::types::ProfileRecordLevel;

    fn record(position: i32, name: &str, is_verification: bool) -> ProfileRecord {
        ProfileRecord {
            level: ProfileRecordLevel {
                id: format!("lvl-{position}"),
                name: name.into(),
                position,
            },
            is_verification,
        }
    }

    #[test]
    fn hardest_ignores_verifications_and_picks_lowest_position() {
        let profile = UserProfile {
            records: vec![
                record(500, "Easier", false),
                record(200, "Hardest", false),
                record(100, "VerifyOnly", true),
            ],
        };

        let hardest = hardest_from_profile(&profile).expect("hardest");
        assert_eq!(hardest.position, 200);
        assert_eq!(hardest.level_name, "Hardest");
    }

    #[test]
    fn hardest_none_when_only_verifications() {
        let profile = UserProfile {
            records: vec![record(100, "Verify", true)],
        };
        assert!(hardest_from_profile(&profile).is_none());
    }
}
