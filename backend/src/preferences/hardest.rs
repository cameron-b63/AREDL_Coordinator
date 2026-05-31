use super::db::ManualHardest;
use crate::aredl::HardestCompletion;

pub fn effective_hardest(
    manual: Option<&ManualHardest>,
    aredl: Option<&HardestCompletion>,
) -> Option<HardestCompletion> {
    if let Some(manual) = manual {
        return Some(HardestCompletion {
            position: manual.position,
            level_name: manual.level_name.clone(),
        });
    }
    aredl.cloned()
}

pub fn level_name_for_position(levels: &[crate::aredl::UpstreamLevel], position: i32) -> Option<String> {
    levels
        .iter()
        .find(|level| level.position == position)
        .map(|level| level.name.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hardest(position: i32, name: &str) -> HardestCompletion {
        HardestCompletion {
            position,
            level_name: name.into(),
        }
    }

    fn manual(position: i32, name: &str) -> ManualHardest {
        ManualHardest {
            position,
            level_name: name.into(),
        }
    }

    #[test]
    fn effective_prefers_manual_over_aredl() {
        let aredl = hardest(100, "Aredl");
        let manual = manual(50, "Manual");
        let result = effective_hardest(Some(&manual), Some(&aredl)).unwrap();
        assert_eq!(result.position, 50);
        assert_eq!(result.level_name, "Manual");
    }

    #[test]
    fn effective_falls_back_to_aredl_when_manual_cleared() {
        let aredl = hardest(100, "Aredl");
        let result = effective_hardest(None, Some(&aredl)).unwrap();
        assert_eq!(result.position, 100);
    }

    #[test]
    fn effective_none_when_both_missing() {
        assert!(effective_hardest(None, None).is_none());
    }

    #[test]
    fn level_name_for_position_finds_match() {
        use crate::aredl::UpstreamLevel;
        let levels = vec![UpstreamLevel {
            id: "a".into(),
            name: "Test Level".into(),
            position: 42,
            points: 0,
            level_id: 1,
            two_player: false,
            tags: vec![],
        }];
        assert_eq!(
            level_name_for_position(&levels, 42).as_deref(),
            Some("Test Level")
        );
        assert!(level_name_for_position(&levels, 99).is_none());
    }
}
