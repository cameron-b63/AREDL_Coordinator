use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardResponse {
    pub levels: Vec<BoardLevel>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardLevel {
    pub id: String,
    pub position: i32,
    pub name: String,
    pub completion: CompletionInfo,
    pub claim: ClaimInfo,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionInfo {
    pub state: CompletionState,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub by: Option<Completer>,
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
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaimInfo {
    pub menu_enabled: bool,
    pub active: Option<ActiveClaim>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveClaim {
    pub kind: String,
    pub claimed_by: Completer,
}
