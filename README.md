# orangeBOT

A Discord bot inspired by Mee6, built with JavaScript and Discord.js.

## Features

- **Leveling System**: Earn XP by chatting and level up!
- **Moderation**: Kick, ban, and mute users (requires appropriate permissions).
- **Welcome Messages**: Set a welcome channel to greet new members.
- **Moderator Roles**: Assign a moderator role for bot commands.
- **Information Commands**: Check bot info, ping, server count, and user count.
- **Leaderboard**: See the top 10 users by XP.

## Setup

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Create a `.env` file with your Discord bot token:
   ```
   DISCORD_TOKEN=your_token_here
   ```
4. Enable the following intents in the Discord Developer Portal:
   - Guilds
   - Guild Messages
   - Message Content
   - Guild Members
5. Run the bot with `node index.js`.

## Commands

- `!level` - Check your current level and XP.
- `!kick <user>` - Kick a user from the server (requires kick permissions).
- `!ban <user>` - Ban a user from the server (requires ban permissions).
- `!mute <user>` - Mute a user for 1 minute (requires moderate members permissions).
- `!setwelcome <channel>` - Set the welcome channel (requires manage channels permissions).
- `!setmodrole <role>` - Set the moderator role (requires manage roles permissions).
- `!help` - Display the help message.
- `!leaderboard` - Display the top 10 users by XP.
- `!info` - Display bot information.
- `!ping` - Display the bot's ping.
- `!uptime` - Display the bot's uptime.
- `!servercount` - Display the number of servers the bot is in.
- `!usercount` - Display the number of users the bot is serving.
- `!resetxp` - Reset your XP to 0 (requires manage messages permissions).

## Contributing

Feel free to fork the repository and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License.