use super::db::{clear_manual_hardest, get_user_preferences, set_manual_hardest, ManualHardest};
use crate::aredl::{
    fetch_levels, fetch_user_profile_cached, hardest_from_profile, HardestCompletion, UpstreamLevel,
};
use crate::claims::{list_claims_for_user, UserClaimSummary};
use worker::{Env, Result};

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

pub fn is_harder_than(candidate: i32, baseline: i32) -> bool {
    candidate < baseline
}

pub fn should_promote_manual_hardest(
    new_position: i32,
    manual: Option<&ManualHardest>,
    aredl: Option<&HardestCompletion>,
) -> bool {
    match manual {
        Some(m) => is_harder_than(new_position, m.position),
        None => match aredl {
            Some(a) => is_harder_than(new_position, a.position),
            None => true,
        },
    }
}

pub fn level_for_id(levels: &[UpstreamLevel], level_id: &str) -> Option<(i32, String)> {
    levels
        .iter()
        .find(|level| level.id == level_id)
        .map(|level| (level.position, level.name.clone()))
}

pub fn level_name_for_position(levels: &[UpstreamLevel], position: i32) -> Option<String> {
    levels
        .iter()
        .find(|level| level.position == position)
        .map(|level| level.name.clone())
}

pub fn hardest_supposedly_completed_claim(
    claims: &[UserClaimSummary],
    levels: &[UpstreamLevel],
) -> Option<(i32, String)> {
    claims
        .iter()
        .filter(|claim| claim.kind == "supposedly_completed")
        .filter_map(|claim| level_for_id(levels, &claim.level_id))
        .min_by_key(|(position, _)| *position)
}

pub fn should_revert_manual_for_removed_sc(
    removed_level_position: i32,
    manual: Option<&ManualHardest>,
) -> bool {
    manual.is_some_and(|m| m.position == removed_level_position)
}

pub fn manual_after_sc_removal(
    remaining_sc: Option<(i32, String)>,
    aredl: Option<&HardestCompletion>,
) -> Option<ManualHardest> {
    match remaining_sc {
        Some((position, level_name))
            if should_promote_manual_hardest(position, None, aredl) =>
        {
            Some(ManualHardest {
                position,
                level_name,
            })
        }
        Some(_) | None => None,
    }
}

pub struct HardestMutationUpdate {
    pub effective: Option<HardestCompletion>,
    pub manual: Option<HardestCompletion>,
}

fn mutation_update_from_manual(
    manual: Option<&ManualHardest>,
    aredl: Option<&HardestCompletion>,
) -> HardestMutationUpdate {
    HardestMutationUpdate {
        effective: effective_hardest(manual, aredl),
        manual: manual.map(|m| HardestCompletion {
            position: m.position,
            level_name: m.level_name.clone(),
        }),
    }
}

pub async fn maybe_promote_manual_hardest(
    env: &Env,
    user_id: &str,
    discord_id: &str,
    level_id: &str,
) -> Result<Option<HardestMutationUpdate>> {
    let levels = fetch_levels(env, true)
        .await
        .map_err(|err| worker::Error::RustError(format!("Failed to load AREDL levels: {err}")))?;

    let Some((position, level_name)) = level_for_id(&levels, level_id) else {
        return Ok(None);
    };

    let prefs = get_user_preferences(env, user_id).await?;
    let manual = prefs.manual_hardest.as_ref();
    let aredl = fetch_user_profile_cached(env, discord_id)
        .await
        .ok()
        .and_then(|profile| hardest_from_profile(&profile));

    if !should_promote_manual_hardest(position, manual, aredl.as_ref()) {
        return Ok(None);
    }

    set_manual_hardest(env, user_id, position, &level_name).await?;

    let updated_manual = ManualHardest {
        position,
        level_name,
    };
    Ok(Some(mutation_update_from_manual(
        Some(&updated_manual),
        aredl.as_ref(),
    )))
}

pub async fn maybe_revert_manual_hardest_after_sc_removal(
    env: &Env,
    user_id: &str,
    discord_id: &str,
    removed_level_id: &str,
) -> Result<Option<HardestMutationUpdate>> {
    let levels = fetch_levels(env, true)
        .await
        .map_err(|err| worker::Error::RustError(format!("Failed to load AREDL levels: {err}")))?;

    let Some(removed_position) = level_for_id(&levels, removed_level_id).map(|(pos, _)| pos) else {
        return Ok(None);
    };

    let prefs = get_user_preferences(env, user_id).await?;
    let manual = prefs.manual_hardest.as_ref();

    if !should_revert_manual_for_removed_sc(removed_position, manual) {
        return Ok(None);
    }

    let aredl = fetch_user_profile_cached(env, discord_id)
        .await
        .ok()
        .and_then(|profile| hardest_from_profile(&profile));

    let claims = list_claims_for_user(env, user_id).await?;
    let remaining_sc = hardest_supposedly_completed_claim(&claims, &levels);
    let next_manual = manual_after_sc_removal(remaining_sc, aredl.as_ref());

    match &next_manual {
        Some(m) => set_manual_hardest(env, user_id, m.position, &m.level_name).await?,
        None => clear_manual_hardest(env, user_id).await?,
    }

    Ok(Some(mutation_update_from_manual(
        next_manual.as_ref(),
        aredl.as_ref(),
    )))
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

    fn claim(level_id: &str, kind: &str) -> UserClaimSummary {
        UserClaimSummary {
            level_id: level_id.into(),
            kind: kind.into(),
        }
    }

    fn levels() -> Vec<UpstreamLevel> {
        vec![
            UpstreamLevel {
                id: "lvl-40".into(),
                name: "Level 40".into(),
                position: 40,
                points: 0,
                level_id: 1,
                two_player: false,
                tags: vec![],
                nlw_tier: None,
            },
            UpstreamLevel {
                id: "lvl-50".into(),
                name: "Level 50".into(),
                position: 50,
                points: 0,
                level_id: 2,
                two_player: false,
                tags: vec![],
                nlw_tier: None,
            },
            UpstreamLevel {
                id: "lvl-100".into(),
                name: "Level 100".into(),
                position: 100,
                points: 0,
                level_id: 3,
                two_player: false,
                tags: vec![],
                nlw_tier: None,
            },
        ]
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
        let levels = vec![UpstreamLevel {
            id: "a".into(),
            name: "Test Level".into(),
            position: 42,
            points: 0,
            level_id: 1,
            two_player: false,
            tags: vec![],
            nlw_tier: None,
        }];
        assert_eq!(
            level_name_for_position(&levels, 42).as_deref(),
            Some("Test Level")
        );
        assert!(level_name_for_position(&levels, 99).is_none());
    }

    #[test]
    fn level_for_id_finds_match() {
        let levels = vec![UpstreamLevel {
            id: "lvl-abc".into(),
            name: "Hard Level".into(),
            position: 10,
            points: 0,
            level_id: 1,
            two_player: false,
            tags: vec![],
            nlw_tier: None,
        }];
        assert_eq!(
            level_for_id(&levels, "lvl-abc"),
            Some((10, "Hard Level".into()))
        );
        assert!(level_for_id(&levels, "missing").is_none());
    }

    #[test]
    fn should_promote_when_manual_unset_and_no_aredl() {
        assert!(should_promote_manual_hardest(50, None, None));
    }

    #[test]
    fn should_promote_when_harder_than_aredl_baseline() {
        let aredl = hardest(100, "Aredl");
        assert!(should_promote_manual_hardest(50, None, Some(&aredl)));
    }

    #[test]
    fn should_not_promote_when_easier_than_aredl_baseline() {
        let aredl = hardest(50, "Aredl");
        assert!(!should_promote_manual_hardest(100, None, Some(&aredl)));
        assert!(!should_promote_manual_hardest(50, None, Some(&aredl)));
    }

    #[test]
    fn should_promote_when_harder_than_manual_baseline() {
        let manual = manual(100, "Manual");
        let aredl = hardest(200, "Aredl");
        assert!(should_promote_manual_hardest(
            50,
            Some(&manual),
            Some(&aredl)
        ));
    }

    #[test]
    fn should_not_promote_when_easier_than_manual_even_if_harder_than_aredl() {
        let manual = manual(50, "Manual");
        let aredl = hardest(200, "Aredl");
        assert!(!should_promote_manual_hardest(
            75,
            Some(&manual),
            Some(&aredl)
        ));
    }

    #[test]
    fn should_not_promote_when_equal_to_manual() {
        let manual = manual(50, "Manual");
        assert!(!should_promote_manual_hardest(50, Some(&manual), None));
    }

    #[test]
    fn hardest_supposedly_completed_picks_lowest_position() {
        let claims = vec![
            claim("lvl-100", "claimed"),
            claim("lvl-50", "supposedly_completed"),
            claim("lvl-40", "supposedly_completed"),
        ];
        let result = hardest_supposedly_completed_claim(&claims, &levels()).unwrap();
        assert_eq!(result, (40, "Level 40".into()));
    }

    #[test]
    fn should_revert_when_manual_matches_removed_level() {
        assert!(should_revert_manual_for_removed_sc(
            50,
            Some(&manual(50, "Level 50"))
        ));
    }

    #[test]
    fn should_not_revert_when_manual_differs() {
        assert!(!should_revert_manual_for_removed_sc(
            50,
            Some(&manual(30, "Level 30"))
        ));
        assert!(!should_revert_manual_for_removed_sc(50, None));
    }

    #[test]
    fn manual_after_sc_removal_clears_when_no_remaining_sc_and_aredl_exists() {
        let aredl = hardest(100, "Aredl");
        assert!(manual_after_sc_removal(None, Some(&aredl)).is_none());
    }

    #[test]
    fn manual_after_sc_removal_keeps_hardest_remaining_sc() {
        let aredl = hardest(100, "Aredl");
        let next = manual_after_sc_removal(Some((40, "Level 40".into())), Some(&aredl)).unwrap();
        assert_eq!(next.position, 40);
    }

    #[test]
    fn manual_after_sc_removal_clears_when_remaining_sc_easier_than_aredl() {
        let aredl = hardest(50, "Aredl");
        assert!(manual_after_sc_removal(
            Some((100, "Level 100".into())),
            Some(&aredl)
        )
        .is_none());
    }

    #[test]
    fn manual_after_sc_removal_sets_when_no_aredl() {
        let next = manual_after_sc_removal(Some((100, "Level 100".into())), None).unwrap();
        assert_eq!(next.position, 100);
    }
}
