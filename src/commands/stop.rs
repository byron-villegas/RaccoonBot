use serenity::builder::CreateCommand;
use serenity::model::application::ResolvedOption;

pub fn run(_options: &[ResolvedOption]) -> String {
    "Not implemented yet.".to_string()
}

pub fn register() -> CreateCommand {
    CreateCommand::new("stop").description("Stop song and clear the queue")
}