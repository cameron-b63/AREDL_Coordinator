use std::collections::HashMap;

use crate::aredl::{user_avatar_url, user_display_name, ClanProfile, UpstreamLevel};
use crate::claims::ClaimRow;

use super::types::{
    ActiveClaim, BoardLevel, BoardResponse, BoardSummary, ClaimInfo, CompletionInfo,
    CompletionState, Completer,
};

struct LevelCompletion {
    achieved_at: String,
    completer: Completer,
}

/// When multiple clan members completed the same level, keep the most recent `achieved_at`.
pub fn build_board(
    levels: Vec<UpstreamLevel>,
    clan: ClanProfile,
    claims: Vec<ClaimRow>,
) -> BoardResponse {
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
            discord_id: record.submitted_by.discord_id.clone(),
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

    let mut claims_by_level: HashMap<String, ActiveClaim> = HashMap::new();
    for claim in claims {
        let claimed_by = Completer {
            username: claim.username,
            avatar_url: claim.avatar_url,
            discord_id: claim.discord_id,
        };
        claims_by_level.insert(
            claim.level_id,
            ActiveClaim {
                kind: claim.kind,
                claimed_by,
            },
        );
    }

    let total_count = levels.len() as i32;
    let mut completed_count = 0i32;

    let board_levels: Vec<BoardLevel> = levels
        .into_iter()
        .map(|level| {
            let completion = match completions.get(&level.id) {
                Some(entry) => {
                    completed_count += 1;
                    CompletionInfo {
                        state: CompletionState::Completed,
                        by: Some(entry.completer.clone()),
                    }
                }
                None => CompletionInfo {
                    state: CompletionState::Uncompleted,
                    by: None,
                },
            };

            let menu_enabled = !matches!(completion.state, CompletionState::Completed);
            let active = claims_by_level.get(&level.id).cloned();

            BoardLevel {
                id: level.id,
                position: level.position,
                name: level.name,
                points: level.points,
                completion,
                claim: ClaimInfo {
                    menu_enabled,
                    active,
                },
            }
        })
        .collect();

    BoardResponse {
        summary: BoardSummary {
            completed_count,
            total_count,
        },
        levels: board_levels,
    }
}
