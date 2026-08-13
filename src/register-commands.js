import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  throw new Error('DISCORD_TOKEN and CLIENT_ID must be set in the .env file.');
}

const commands = [
  new SlashCommandBuilder()
    .setName('download')
    .setDescription('Select a JAR file to download.')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('givekey')
    .setDescription('Generate a license key for a user.')
    .addUserOption((option) => option.setName('user').setDescription('The user who gets the key.').setRequired(true))
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('Key type.')
        .setRequired(true)
        .addChoices(
          { name: 'Lifetime', value: 'lifetime' },
          { name: 'Monthly', value: 'monthly' },
        )
    )
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
const route = GUILD_ID
  ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
  : Routes.applicationCommands(CLIENT_ID);

await rest.put(route, { body: commands });
console.log(`Slash-Befehl ${GUILD_ID ? 'für den Test-Server' : 'global'} registriert.`);
