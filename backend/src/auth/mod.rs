mod db;
mod discord;
mod guard;
mod jwt;
mod session;

pub use db::{get_user_by_id, upsert_user, UserRecord};
pub use discord::{
    auth_error_redirect, authorize_url, avatar_url, exchange_code, fetch_member_roles, fetch_user,
    member_has_role,
};
pub use guard::{
    has_coordinator_role, require_admin, resolve_session_identity, resolve_session_user, AuthError,
};
pub use jwt::{sign_session, verify_session, SessionIdentity};
pub use session::{
    clear_oauth_state_cookie, clear_session_cookie, new_oauth_state, oauth_state_from_request,
    redirect_response, session_token_from_request, set_oauth_state_cookie, set_session_cookie,
    CookieOptions,
};
