use std::collections::HashMap;

use crate::aredl::{user_avatar_url, user_display_name, ClanProfile, UpstreamLevel};

use super::types::{
    ActiveClaim, BoardLevel, ClaimInfo, CompletionInfo, CompletionState, Completer,
};

struct LevelCompletion {
    achieved_at: String,
    completer: Completer,
}

/// When multiple clan members completed the same level, keep the most recent `achieved_at`.
pub fn build_board(levels: Vec<UpstreamLevel>, clan: ClanProfile) -> Vec<BoardLevel> {
    let mut completions: HashMap<String, LevelCompletion> = HashMap::new();

    for record in clan.records {
        let level_id = record.level.id;
        let completer = Completer {
            username: user_display_name(
                &record.submitted_by.username,
                record.submitted_by.global_name.as_deref(),
            ),
            avatar_url: user_avatar_url(
                &record.submitted_by.discord_id,
                record.submitted_by.discord_avatar.as_deref(),
            ),
        };

        match completions.get(&level_id) {
            Some(existing) if existing.achieved_at >= record.achieved_at => {}
            _ => {
                completions.insert(
                    level_id,
                    LevelCompletion {
                        achieved_at: record.achieved_at,
                        completer,
                    },
                );
            }
        }
    }

    levels
        .into_iter()
        .map(|level| {
            let completion = match completions.get(&level.id) {
                Some(entry) => CompletionInfo {
                    state: CompletionState::Completed,
                    by: Some(entry.completer.clone()),
                },
                None => CompletionInfo {
                    state: CompletionState::Uncompleted,
                    by: None,
                },
            };

            let menu_enabled = !matches!(completion.state, CompletionState::Completed);

            BoardLevel {
                id: level.id,
                position: level.position,
                name: level.name,
                completion,
                claim: ClaimInfo {
                    menu_enabled,
                    active: None::<ActiveClaim>,
                },
            }
        })
        .collect()
}
