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
    video_url: String,
}

fn normalize_tags(tags: Vec<Option<String>>) -> Vec<String> {
    tags.into_iter().flatten().collect()
}

fn list_page_url(game_level_id: i32, two_player: bool) -> String {
    if two_player {
        format!("https://aredl.net/list/{game_level_id}_2p")
    } else {
        format!("https://aredl.net/list/{game_level_id}")
    }
}

/// When multiple clan members completed the same level, keep the most recent `achieved_at`.
pub fn build_board(
    levels: Vec<UpstreamLevel>,
    clan: ClanProfile,
    claims: Vec<ClaimRow>,
) -> BoardResponse {
    let mut completions: HashMap<String, LevelCompletion> = HashMap::new();
    let mut clan_verification_videos: HashMap<String, String> = HashMap::new();

    for record in clan.records {
        let level_id = record.level.id;

        if record.is_verification {
            if !record.video_url.is_empty() {
                clan_verification_videos.insert(level_id, record.video_url);
            }
            continue;
        }

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
                        video_url: record.video_url,
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
            let tags = normalize_tags(level.tags);
            let list_page_url = list_page_url(level.level_id, level.two_player);

            let completion = match completions.get(&level.id) {
                Some(entry) => {
                    completed_count += 1;
                    CompletionInfo {
                        state: CompletionState::Completed,
                        by: Some(entry.completer.clone()),
                        video_url: Some(entry.video_url.clone()),
                    }
                }
                None => CompletionInfo {
                    state: CompletionState::Uncompleted,
                    by: None,
                    video_url: None,
                },
            };

            let clan_verification_video_url = clan_verification_videos
                .get(&level.id)
                .filter(|verification_url| {
                    completion
                        .video_url
                        .as_ref()
                        .map(|completion_url| completion_url != *verification_url)
                        .unwrap_or(true)
                })
                .cloned();

            let menu_enabled = !matches!(completion.state, CompletionState::Completed);
            let active = claims_by_level.get(&level.id).cloned();

            BoardLevel {
                id: level.id,
                position: level.position,
                name: level.name,
                points: level.points,
                game_level_id: level.level_id,
                two_player: level.two_player,
                tags,
                list_page_url,
                clan_verification_video_url,
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
