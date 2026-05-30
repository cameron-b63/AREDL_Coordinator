use crate::aredl::ClanProfile;

#[derive(Debug, Clone, Copy)]
pub struct ViewerStats {
    pub levels_contributed: i32,
    pub points_earned: i32,
}

pub fn viewer_stats_from_clan(clan: &ClanProfile, discord_id: &str) -> ViewerStats {
    let mut levels_contributed = 0i32;
    let mut points_earned = 0i32;

    for record in &clan.records {
        if record.submitted_by.discord_id != discord_id {
            continue;
        }
        levels_contributed += 1;
        points_earned += record.level.points;
    }

    ViewerStats {
        levels_contributed,
        points_earned,
    }
}
