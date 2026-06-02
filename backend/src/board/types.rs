use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardResponse {
    pub summary: BoardSummary,
    pub levels: Vec<BoardLevel>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardSummary {
    pub completed_count: i32,
    pub supposedly_completed_count: i32,
    pub total_count: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardLevel {
    pub id: String,
    pub position: i32,
    pub name: String,
    pub points: i32,
    pub game_level_id: i32,
    pub two_player: bool,
    pub tags: Vec<String>,
    pub list_page_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clan_verification_video_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub record_achieved_at: Option<String>,
    pub completion: CompletionInfo,
    pub claim: ClaimInfo,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionInfo {
    pub state: CompletionState,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub by: Option<Completer>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video_url: Option<String>,
    #[serde(default, skip_serializing_if = "is_false")]
    pub is_verification: bool,
}

fn is_false(value: &bool) -> bool {
    !*value
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum CompletionState {
    Uncompleted,
    Completed,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Completer {
    pub username: String,
    pub avatar_url: Option<String>,
    pub discord_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaimInfo {
    pub menu_enabled: bool,
    pub active: Option<ActiveClaim>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ActiveClaim {
    pub kind: String,
    pub claimed_by: Completer,
}
