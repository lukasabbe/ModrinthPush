import fs from 'fs';
import { ModrinthProject, ModrinthVersion, Settings } from './interfaces';
import sqlite3 from 'sqlite3';
import fetch from 'node-fetch';
import { WebhookClient, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const webhookClient = new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL || '' });

(async () => {
    const settings = JSON.parse(fs.readFileSync('settings.json', 'utf-8')) as Settings;
    const db = new sqlite3.Database("data.db")

    db.serialize(() => {
        db.run("CREATE TABLE IF NOT EXISTS versions (auto_id INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT, projectId TEXT)");
        setInterval(() => run(settings, db), settings.intervalSeconds * 1000);
    });
})();

const getProject = async (projectId: string) => {
    const res = await fetch(`https://api.modrinth.com/v2/project/${projectId}`);
    if (!res.ok) throw new Error(`Failed to fetch project ${projectId}`);
    return await res.json() as ModrinthProject;
}

const getVersion = async (versionId: string) => {
    const res = await fetch(`https://api.modrinth.com/v2/version/${versionId}`);
    if (!res.ok) throw new Error(`Failed to fetch version ${versionId}`);
    return await res.json() as ModrinthVersion;
}

const sendPush = async (projectId: ModrinthProject, versionId: string) => {
    const version = await getVersion(versionId);
    const embed = new EmbedBuilder()
        .setTitle(`New version for ${projectId.title}`)
        .setURL(`https://modrinth.com/project/${projectId.id}/version/${versionId}`)
        .setDescription(`**Version ID:** ${version.id}\n**Loaders:** ${version.loaders.join(", ")}\n**Game Versions:** ${version.game_versions.join(", ")}`)
        .setColor(0x00AE86)
        .setThumbnail(projectId.icon_url)
        .setTimestamp(new Date());

    await webhookClient.send({
        username: 'Modrinth Push Bot',
        embeds: [embed],
    });
}

const run = async (settings: Settings, db: sqlite3.Database) => {
    for (const projectId of settings.pushProjects) {
        const project = await getProject(projectId);
        for (const versionId of project.versions) {
            db.get("SELECT id FROM versions WHERE id = ? AND projectId = ?", [versionId, projectId], (err, row) => {
                if (err) {
                    console.error(err);
                    return;
                }
                if (!row) {
                    if (!settings.fillDatabase) {
                        sendPush(project, versionId).catch(console.error);
                    }
                    db.run("INSERT INTO versions (id, projectId) VALUES (?, ?)", [versionId, projectId]);
                }
            });
        }
    }
    settings.fillDatabase = false;
}