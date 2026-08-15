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
    .setName('verify')
    .setDescription('Verify a license key so it can be used in the addon.')
    .addStringOption((option) =>
      option
        .setName('key')
        .setDescription('Your license key (VIBE-XXXX-XXXX-XXXX).')
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Verify the key for this user instead of yourself. (Admin)')
        .setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('removekey')
    .setDescription('Revoke a license key so it can no longer be used. (Admin)')
    .addStringOption((option) =>
      option
        .setName('key')
        .setDescription('The license key to revoke.')
        .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('reset-hwid')
    .setDescription('Reset the computer binding of a license key so it can be used again. (Admin)')
    .addStringOption((option) =>
      option
        .setName('key')
        .setDescription('The license key to reset.')
        .setRequired(true)
    )
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
  new SlashCommandBuilder()
    .setName('checklicense')
    .setDescription("Show the license key(s) a user has. (Admin)")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to look up.')
        .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('pricing')
    .setDescription('Post the pricing info into the sales channel. (Admin)')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
const route = GUILD_ID
  ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
  : Routes.applicationCommands(CLIENT_ID);

await rest.put(route, { body: commands });
console.log(`Slash-Befehl ${GUILD_ID ? 'für den Test-Server' : 'global'} registriert.`);
