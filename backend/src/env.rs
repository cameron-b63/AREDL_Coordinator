use worker::{Env, Result};

pub fn frontend_origin(env: &Env) -> Result<String> {
    env.var("FRONTEND_ORIGIN").map(|v| v.to_string())
}

pub fn aredl_api_base(env: &Env) -> Result<String> {
    env.var("AREDL_API_BASE").map(|v| v.to_string())
}
