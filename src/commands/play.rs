use serenity::all::{CommandOptionType, CreateCommandOption};
use serenity::builder::CreateCommand;
use serenity::model::application::ResolvedOption;

pub fn run(_options: &[ResolvedOption]) -> String {
    "Not implemented yet.".to_string()
}

pub fn register() -> CreateCommand {
    let options = vec![
        CreateCommandOption::new(CommandOptionType::String, "query", "The name of the song you want to play or the youtube/spotify link").required(true)
    ];

    CreateCommand::new("play").description("Play a song by name or link").set_options(options)
}