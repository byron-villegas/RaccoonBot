mod commands;
use std::env;
use dotenv::dotenv;
use serenity::{
    all::{
        Command, Context, CreateInteractionResponse, CreateInteractionResponseMessage,
        EventHandler, GatewayIntents, GuildId, Interaction, Ready,
    },
    async_trait, Client,
};

struct Handler;

#[async_trait]
impl EventHandler for Handler {
    async fn interaction_create(&self, ctx: Context, interaction: Interaction) {
        if let Interaction::Command(command) = interaction {
            println!("Received command interaction: {command:#?}");

            let content = match command.data.name.as_str() {
                "ping" => Some(commands::ping::run(&command.data.options())),
                "play" => Some(commands::play::run(&command.data.options())),
                "pause" => Some(commands::pause::run(&command.data.options())),
                "resume" => Some(commands::resume::run(&command.data.options())),
                "skip" => Some(commands::skip::run(&command.data.options())),
                "stop" => Some(commands::stop::run(&command.data.options())),
                "queue" => Some(commands::queue::run(&command.data.options())),
                "roulette" => Some(commands::roulette::run(&ctx, &command)),
                _ => Some("Not implemented yet.".to_string()),
            };

            if let Some(content) = content {
                let data = CreateInteractionResponseMessage::new().content(content);
                let builder = CreateInteractionResponse::Message(data);
                if let Err(error) = command.create_response(&ctx.http, builder).await {
                    println!("Cannot respond to slash command: {error}");
                }
            }
        }
    }

    async fn ready(&self, ctx: Context, ready: Ready) {
        println!("{} is connected!", ready.user.name);

        println!("{}", ready.guilds[0].id);

        let guild_id = GuildId::new(ready.guilds[0].id.get());

        let commands = guild_id
            .set_commands(
                &ctx.http,
                vec![
                    commands::ping::register(),
                    commands::play::register(),
                    commands::pause::register(),
                    commands::resume::register(),
                    commands::skip::register(),
                    commands::stop::register(),
                    commands::queue::register(),
                    commands::roulette::register()
                ]
            )
            .await;

        println!("I now have the following guild slash commands: {commands:#?}");

        let guild_command =
            Command::create_global_command(&ctx.http, commands::ping::register())
                .await;

        println!("I created the following global slash command: {guild_command:#?}");
    }
}

#[tokio::main]
async fn main() {
    // Load the environment variables from a .env file
    dotenv().ok();

    // Login with a bot token from the environment
    let token = env::var("DISCORD_TOKEN").expect("Error obtaining discord token from environment");

    // Set gateway intents, which decides what events the bot will be notified about
    let intents = GatewayIntents::GUILDS
        | GatewayIntents::GUILD_VOICE_STATES
        | GatewayIntents::GUILD_MESSAGES;

    // Build our client.
    let mut client = Client::builder(token, intents)
        .event_handler(Handler)
        .await
        .expect("Error creating client");

    // Finally, start a single shard, and start listening to events.
    //
    // Shards will automatically attempt to reconnect, and will perform exponential backoff until
    // it reconnects.
    if let Err(error) = client.start().await {
        println!("Client error: {error:?}");
    }
}
