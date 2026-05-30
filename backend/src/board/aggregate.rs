use std::collections::HashMap;

use crate::aredl::{user_avatar_url, user_display_name, ClanProfile, ClanRecord, UpstreamLevel};
use crate::claims::{select_dominant_claim, ClaimRow};

use super::types::{
    ActiveClaim, BoardLevel, BoardResponse, BoardSummary, ClaimInfo, CompletionInfo,
    CompletionState, Completer,
};

struct LevelCompletion {
    achieved_at: String,
    completer: Completer,
    video_url: String,
    is_verification: bool,
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

fn completer_from_record(record: &ClanRecord) -> Completer {
    Completer {
        username: user_display_name(
            &record.submitted_by.username,
            record.submitted_by.global_name.as_deref(),
        ),
        avatar_url: user_avatar_url(
            &record.submitted_by.discord_id,
            record.submitted_by.discord_avatar.as_deref(),
        ),
        discord_id: record.submitted_by.discord_id.clone(),
    }
}

/// Prefer the newer record; on equal `achieved_at`, prefer a completion over a verification.
fn should_replace_completion(existing: &LevelCompletion, candidate: &LevelCompletion) -> bool {
    if candidate.achieved_at > existing.achieved_at {
        return true;
    }
    if candidate.achieved_at < existing.achieved_at {
        return false;
    }
    existing.is_verification && !candidate.is_verification
}

/// When multiple clan members completed or verified the same level, keep the best record.
pub fn build_board(
    levels: Vec<UpstreamLevel>,
    clan: ClanProfile,
    claims: Vec<ClaimRow>,
) -> BoardResponse {
    let mut completions: HashMap<String, LevelCompletion> = HashMap::new();
    let mut clan_verification_videos: HashMap<String, String> = HashMap::new();

    for record in clan.records {
        let level_id = record.level.id.clone();

        if record.is_verification && !record.video_url.is_empty() {
            clan_verification_videos.insert(level_id.clone(), record.video_url.clone());
        }

        let candidate = LevelCompletion {
            completer: completer_from_record(&record),
            achieved_at: record.achieved_at,
            video_url: record.video_url,
            is_verification: record.is_verification,
        };

        match completions.get(&level_id) {
            Some(existing) if !should_replace_completion(existing, &candidate) => {}
            _ => {
                completions.insert(level_id, candidate);
            }
        }
    }

    let mut claims_by_level: HashMap<String, Vec<ClaimRow>> = HashMap::new();
    for claim in claims {
        claims_by_level
            .entry(claim.level_id.clone())
            .or_default()
            .push(claim);
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
                        video_url: if entry.video_url.is_empty() {
                            None
                        } else {
                            Some(entry.video_url.clone())
                        },
                        is_verification: entry.is_verification,
                    }
                }
                None => CompletionInfo {
                    state: CompletionState::Uncompleted,
                    by: None,
                    video_url: None,
                    is_verification: false,
                },
            };

            let clan_verification_video_url = if completion.is_verification {
                None
            } else {
                clan_verification_videos
                    .get(&level.id)
                    .filter(|verification_url| {
                        completion
                            .video_url
                            .as_ref()
                            .map(|completion_url| completion_url != *verification_url)
                            .unwrap_or(true)
                    })
                    .cloned()
            };

            let menu_enabled = !matches!(completion.state, CompletionState::Completed);
            let active = claims_by_level
                .get(&level.id)
                .and_then(|level_claims| select_dominant_claim(level_claims))
                .map(|claim| ActiveClaim {
                    kind: claim.kind.clone(),
                    claimed_by: Completer {
                        username: claim.username.clone(),
                        avatar_url: claim.avatar_url.clone(),
                        discord_id: claim.discord_id.clone(),
                    },
                });

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::aredl::{ClanRecordLevel, ClanRecordUser};
    use crate::board::types::CompletionState;

    fn record(
        level_id: &str,
        achieved_at: &str,
        is_verification: bool,
        video_url: &str,
    ) -> ClanRecord {
        ClanRecord {
            level: ClanRecordLevel {
                id: level_id.into(),
                points: 100,
            },
            submitted_by: ClanRecordUser {
                discord_id: "1".into(),
                username: "player".into(),
                global_name: None,
                discord_avatar: None,
            },
            achieved_at: achieved_at.into(),
            video_url: video_url.into(),
            is_verification,
        }
    }

    fn level(id: &str) -> UpstreamLevel {
        UpstreamLevel {
            id: id.into(),
            name: "Test".into(),
            position: 1,
            points: 100,
            level_id: 1,
            two_player: false,
            tags: vec![],
        }
    }

    #[test]
    fn verification_counts_as_completed() {
        let board = build_board(
            vec![level("lvl-1")],
            ClanProfile {
                records: vec![record("lvl-1", "2024-01-02", true, "https://verify")],
            },
            vec![],
        );

        assert_eq!(board.summary.completed_count, 1);
        let lvl = &board.levels[0];
        assert!(matches!(lvl.completion.state, CompletionState::Completed));
        assert!(lvl.completion.is_verification);
        assert_eq!(
            lvl.completion.video_url.as_deref(),
            Some("https://verify")
        );
        assert!(lvl.clan_verification_video_url.is_none());
    }

    #[test]
    fn completion_wins_over_older_verification() {
        let board = build_board(
            vec![level("lvl-1")],
            ClanProfile {
                records: vec![
                    record("lvl-1", "2024-01-01", true, "https://verify"),
                    record("lvl-1", "2024-01-02", false, "https://complete"),
                ],
            },
            vec![],
        );

        let lvl = &board.levels[0];
        assert!(!lvl.completion.is_verification);
        assert_eq!(
            lvl.completion.video_url.as_deref(),
            Some("https://complete")
        );
    }
}
