use rand::Rng;
use serenity::all::{CommandInteraction, CommandOptionType, Context, CreateCommandOption};
use serenity::builder::CreateCommand;

pub fn run(ctx: &Context, interaction: &CommandInteraction) -> String {
    println!("{:?}", interaction.data.options);
    let random_number = rand::thread_rng().gen_range(1..=5);

    let user_number = interaction.data.options[0].value.as_i64();

    if Some(random_number) == user_number {
        return "You lose!".to_string();
    }

    return "You win!".to_string();
}

pub fn register() -> CreateCommand {
    let options =
        vec![
            CreateCommandOption::new(CommandOptionType::Integer, "number", "Number from 1 to 5")
                .min_int_value(1)
                .max_int_value(5)
                .required(true),
        ];

    CreateCommand::new("roulette")
        .description("Select a number from 1 to 5, if you lose you are kicked from the voice channel")
        .set_options(options)
}
