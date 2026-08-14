import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { DISCORD_TOKEN, BACKEND_URL, ADMIN_KEY, DISCORD_ADMIN_IDS } = process.env;
if (!DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is missing. Add it to the .env file.');

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jarsDir = path.join(rootDir, 'jars');
const downloadRoleId = '1535889645173473343';
const ownerRoleId = '1537156229753741423';
const allowedRoleIds = [downloadRoleId, ownerRoleId];
const allowedChannelId = '1535889596548907069';
const adminRoleIds = (DISCORD_ADMIN_IDS ?? ownerRoleId).split(',').map((id) => id.trim());

function isAdmin(interaction) {
  return interaction.inGuild() && interaction.member.roles.cache.some((role) => adminRoleIds.includes(role.id));
}

async function callBackend(path, body) {
  if (!BACKEND_URL) throw new Error('BACKEND_URL is not set. Add it to the .env file.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Backend returned a non-JSON response (HTTP ${response.status}). Is the backend outdated?`);
    }
    if (!response.ok) {
      throw new Error(`Backend error (HTTP ${response.status}): ${json?.error ?? text.slice(0, 200)}`);
    }
    return json;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Request timed out after 10s.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function availableJars() {
  try {
    const entries = await readdir(jarsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.jar'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, 'de'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Angemeldet als ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'download') {
      if (!interaction.inGuild() || interaction.channelId !== allowedChannelId) {
        await interaction.reply({ content: 'Download in download channel', ephemeral: true });
        return;
      }
      if (!interaction.member.roles.cache.some((role) => allowedRoleIds.includes(role.id))) {
        await interaction.reply({ content: 'You do not have the required role to download files.', ephemeral: true });
        return;
      }
      const files = await availableJars();
      if (!files.length) {
        await interaction.reply({ content: 'There are currently no JAR files available.', ephemeral: true });
        return;
      }
      const filePaths = files.map((name) => path.join(jarsDir, name));
      await interaction.reply({
        content: files.length > 1
          ? '**Do not share these JAR files**\n\n' + files.join('\n')
          : `**Do not share this Jar!**\n\n**${files[0]}**`,
        files: filePaths,
        ephemeral: true,
      });
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'verify') {
      const key = interaction.options.getString('key');
      await interaction.deferReply({ ephemeral: true });
      let result;
      try {
        result = await callBackend('/api/admin/claim', { adminKey: ADMIN_KEY, key, discordId: interaction.user.id });
      } catch (error) {
        console.error('Backend call failed:', error.message);
        await interaction.editReply({ content: `Could not reach the license backend: ${error.message}` });
        return;
      }
      console.log('Verify result:', JSON.stringify(result));
      if (!result.ok) {
        let message = 'This key could not be verified.';
        switch (result.reason) {
          case 'missing_fields': message = 'Please enter a license key.'; break;
          case 'key_not_found': message = 'This key does not exist. Check that you copied it correctly.'; break;
          case 'banned': message = 'This key has been banned.'; break;
          case 'expired': message = 'This key has expired.'; break;
          case 'wrong_owner': message = 'This key belongs to another Discord user.'; break;
          case 'already_verified': message = 'This key is already verified by another user.'; break;
          default: break;
        }
        await interaction.editReply({ content: `Verification failed: ${message}`, ephemeral: true });
        return;
      }
      const info = result.type === 'lifetime'
        ? 'Lifetime'
        : result.type === 'monthly'
          ? `Monthly (expires <t:${Math.floor(result.expiresAt / 1000)}:D>)`
          : 'active';
      await interaction.editReply({
        content: `Key verified!\nType: ${info}\n\nYou can now enter \`${key}\` in the addon to activate it. Do not share this key.`,
        ephemeral: true,
      });
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'removekey') {
      if (!isAdmin(interaction)) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        return;
      }
      const key = interaction.options.getString('key');
      await interaction.deferReply({ ephemeral: true });
      let result;
      try {
        result = await callBackend('/api/admin/revoke', { adminKey: ADMIN_KEY, key });
      } catch (error) {
        console.error('Backend call failed:', error.message);
        await interaction.editReply({ content: `Could not reach the license backend: ${error.message}` });
        return;
      }
      console.log('RemoveKey result:', JSON.stringify(result));
      if (!result.ok) {
        let message = 'This key could not be removed.';
        switch (result.reason) {
          case 'missing_fields': message = 'Please enter a license key.'; break;
          case 'key_not_found': message = 'This key does not exist.'; break;
          case 'already_banned': message = 'This key is already revoked.'; break;
          default: break;
        }
        await interaction.editReply({ content: `Failed: ${message}`, ephemeral: true });
        return;
      }
      await interaction.editReply({
        content: `Key revoked: \`${key}\`\nIt can no longer be used in the addon.`,
        ephemeral: true,
      });
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'reset-hwid') {
      if (!isAdmin(interaction)) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        return;
      }
      const key = interaction.options.getString('key');
      await interaction.deferReply({ ephemeral: true });
      let result;
      try {
        result = await callBackend('/api/admin/reset-hwid', { adminKey: ADMIN_KEY, key });
      } catch (error) {
        console.error('Backend call failed:', error.message);
        await interaction.editReply({ content: `Could not reach the license backend: ${error.message}` });
        return;
      }
      console.log('ResetHwid result:', JSON.stringify(result));
      if (!result.ok) {
        let message = 'This key could not be reset.';
        switch (result.reason) {
          case 'missing_fields': message = 'Please enter a license key.'; break;
          case 'key_not_found': message = 'This key does not exist.'; break;
          case 'banned': message = 'This key is banned.'; break;
          case 'no_hwid_bound': message = 'This key is not bound to any computer yet.'; break;
          default: break;
        }
        await interaction.editReply({ content: `Failed: ${message}`, ephemeral: true });
        return;
      }
      await interaction.editReply({
        content: `HWID reset for \`${key}\`\nThe key can now be activated on another computer.`,
        ephemeral: true,
      });
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'givekey') {
      if (!isAdmin(interaction)) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        return;
      }
      const target = interaction.options.getUser('user');
      const type = interaction.options.getString('type');
      await interaction.deferReply({ ephemeral: true });
      let result;
      try {
        result = await callBackend('/api/admin/generate', { adminKey: ADMIN_KEY, type, owner: target.id });
      } catch (error) {
        console.error('Backend call failed:', error.message);
        await interaction.editReply({ content: `Could not reach the license backend. Is it running? (${error.message})` });
        return;
      }
      console.log('GiveKey result:', JSON.stringify(result));
      if (!result.key) {
        await interaction.editReply({
          content: `Failed to generate key. Backend returned: ${JSON.stringify(result) ?? 'empty response'}`,
        });
        return;
      }
      await interaction.editReply({
        content: `Key for <@${target.id}> (${type}):\n\`${result.key}\``,
      });
      let roleMessage = '';
      try {
        const member = await interaction.guild.members.fetch(target.id);
        await member.roles.add('1535889645173473343');
        roleMessage = ` Role <@&1535889645173473343> added to <@${target.id}>.`;
      } catch (error) {
        console.error('Role assignment failed:', error.message);
        roleMessage = ` Could not add the role (is the user in this server? Is the bot's role above it and does it have Manage Roles?).`;
      }
      await interaction.followUp({ content: roleMessage.trim(), ephemeral: true });
      await target
        .send(`Here is your ${type} key for Vibecode:\n\`${result.key}\`\nEnter it in the addon to activate. Do not share it.`)
        .catch(() => {});
      return;
    }
  } catch (error) {
    console.error('Interaction error:', error);
    const message = 'Something went wrong while handling that command. Please try again.';
    if (interaction.deferred || interaction.replied) await interaction.editReply({ content: message, components: [] }).catch(() => {});
    else await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
  }
});

client.login(DISCORD_TOKEN);
