const PRIORITIES: &[&str] = &[
    "begrudgingly_earmarked",
    "claimed",
    "locked_down",
    "supposedly_completed",
];

pub fn priority_rank(priority: &str) -> Option<i32> {
    PRIORITIES
        .iter()
        .position(|value| *value == priority)
        .map(|index| index as i32)
}

pub fn is_valid_priority(priority: &str) -> bool {
    priority_rank(priority).is_some()
}

/// Clobber: new claim must outrank the dominant claim on the level.
pub fn can_clobber_dominant(dominant: &str, new: &str) -> bool {
    let dominant_rank = match priority_rank(dominant) {
        Some(rank) => rank,
        None => return false,
    };
    let new_rank = match priority_rank(new) {
        Some(rank) => rank,
        None => return false,
    };

    new_rank > dominant_rank
}

pub fn is_deescalation(current: &str, new: &str) -> bool {
    match (priority_rank(current), priority_rank(new)) {
        (Some(current_rank), Some(new_rank)) => new_rank < current_rank,
        _ => false,
    }
}

pub fn select_dominant_claim<'a>(claims: &'a [super::db::ClaimRow]) -> Option<&'a super::db::ClaimRow> {
    claims.iter().max_by(|left, right| {
        let left_rank = priority_rank(&left.kind).unwrap_or(-1);
        let right_rank = priority_rank(&right.kind).unwrap_or(-1);
        left_rank
            .cmp(&right_rank)
            .then_with(|| left.updated_at.cmp(&right.updated_at))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_deescalation_when_new_rank_is_lower() {
        assert!(is_deescalation("locked_down", "claimed"));
        assert!(is_deescalation("supposedly_completed", "begrudgingly_earmarked"));
    }

    #[test]
    fn is_not_deescalation_when_escalating_or_same() {
        assert!(!is_deescalation("claimed", "locked_down"));
        assert!(!is_deescalation("claimed", "claimed"));
    }
}
