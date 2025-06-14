// Command processing service for handling chat commands
import { EventEmitter } from 'events';
import { platformIntegrationService, Platform } from './platformIntegration';
import { eventBus, StreamEvent } from './eventBus';
import { fetchViewerSettings } from '../core/database';
import pollyVoiceEngines from '../../shared/assets/pollyVoiceEngines.sorted.json';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// Permission levels for commands
export type PermissionLevel = 'viewer' | 'moderator' | 'super_moderator';

export interface SystemCommand {
  command: string;
  enabled: boolean;
  description: string;
  permissionLevel: PermissionLevel;
  enableTTSReply: boolean; // New: whether command responses should be read by TTS
  handler: (event: StreamEvent) => Promise<void>;
}

class CommandProcessor extends EventEmitter {
  private systemCommands: Map<string, SystemCommand> = new Map();

  constructor(initialSettings?: Record<string, { enabled: boolean }>) {
    super();
    this.initializeSystemCommands();
    this.setupEventListeners();
    
    // Apply initial settings if provided
    if (initialSettings) {
      this.loadSettings(initialSettings);
    }
  }

  private initializeSystemCommands() {
    // ~hello command
    const helloCommand: SystemCommand = {
      command: '~hello',
      enabled: true, // Default enabled, will be overridden by settings
      description: 'Replies with a hello message to the user',
      permissionLevel: 'viewer', // Default to viewer level
      enableTTSReply: false, // Don't read bot responses by default
      handler: async (event: StreamEvent) => {
        const response = `Hello ${event.user}! 👋`;
        // Check if TTS is enabled for this command
        const systemCommand = this.systemCommands.get('~hello');
        const skipTTS = systemCommand ? !systemCommand.enableTTSReply : true;
        await platformIntegrationService.sendChatMessage(response, event.platform, skipTTS);
      }
    };

    this.systemCommands.set('~hello', helloCommand);

    // ~voices command
    const voicesCommand: SystemCommand = {
      command: '~voices',
      enabled: true,
      description: 'Shows link to complete TTS voices list and neural voice status',
      permissionLevel: 'viewer',
      enableTTSReply: false,
      handler: async (event: StreamEvent) => {
        try {
          // Load TTS settings to check if neural voices are disabled
          let disableNeuralVoices = false;
          try {
            const userDataPath = app.getPath('userData');
            const ttsSettingsPath = path.join(userDataPath, 'ttsSettings.json');
            if (fs.existsSync(ttsSettingsPath)) {
              const ttsSettings = JSON.parse(fs.readFileSync(ttsSettingsPath, 'utf-8'));
              disableNeuralVoices = !!ttsSettings.disableNeuralVoices;
            }
          } catch {}

          // Simple response with link and neural voice status
          const neuralStatus = disableNeuralVoices ? 'Neural voices are DISABLED' : 'Neural voices are ENABLED';
          const response = `@${event.user} View all 94 available TTS voices here: https://stream-mesh-website.web.app/voices.html • ${neuralStatus}`;

          await this.sendCommandResponse(response, '~voices', event.platform);
        } catch (error) {
          console.error('[CommandProcessor] Error in ~voices command:', error);
          await this.sendCommandResponse(
            `@${event.user} Sorry, failed to retrieve voice information.`,
            '~voices',
            event.platform
          );
        }
      }
    };

    this.systemCommands.set('~voices', voicesCommand);

    // ~setvoice command
    const setvoiceCommand: SystemCommand = {
      command: '~setvoice',
      enabled: true,
      description: 'Set your personal TTS voice (use ~setvoice [voice_name])',
      permissionLevel: 'viewer',
      enableTTSReply: false,
      handler: async (event: StreamEvent) => {
        try {
          // Parse command arguments
          const message = event.message?.trim() || '';
          const args = message.split(' ').slice(1); // Remove ~setvoice part
          const voiceName = args[0];

          if (!voiceName) {
            await this.sendCommandResponse(
              `@${event.user} Please specify a voice name. Use ~voices to see available voices. Example: ~setvoice Joanna`,
              '~setvoice',
              event.platform
            );
            return;
          }

          // Load TTS settings to check if neural voices are disabled
          let disableNeuralVoices = false;
          try {
            const userDataPath = app.getPath('userData');
            const ttsSettingsPath = path.join(userDataPath, 'ttsSettings.json');
            if (fs.existsSync(ttsSettingsPath)) {
              const ttsSettings = JSON.parse(fs.readFileSync(ttsSettingsPath, 'utf-8'));
              disableNeuralVoices = !!ttsSettings.disableNeuralVoices;
            }
          } catch {}

          // Get all voices and filter if neural voices are disabled
          let allVoices = pollyVoiceEngines as any[];
          if (disableNeuralVoices) {
            allVoices = allVoices.filter(v => v.Engines.includes('standard'));
          }

          // Find the requested voice (case insensitive)
          const foundVoice = allVoices.find(v => 
            v.Name.toLowerCase() === voiceName.toLowerCase()
          );

          if (!foundVoice) {
            await this.sendCommandResponse(
              `@${event.user} Voice "${voiceName}" not found. Use ~voices to see available voices.`,
              '~setvoice',
              event.platform
            );
            return;
          }

          // Get user ID for database lookup
          const platformUserId = event.tags?.['user-id'] || event.user;
          const platform = event.platform;
          const crypto = require('crypto');
          const viewerKey = crypto.createHash('sha256').update(`${platform}:${platformUserId}`).digest('hex').slice(0, 12);

          // Save voice setting to database
          const { upsertViewerSetting } = require('../core/database');
          await new Promise<void>((resolve, reject) => {
            upsertViewerSetting(
              { viewer_id: viewerKey, key: 'voice', value: foundVoice.Name },
              (err: Error | null) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          await this.sendCommandResponse(
            `@${event.user} Your TTS voice has been set to ${foundVoice.Name} (${foundVoice.LanguageName}). Your next message will use this voice!`,
            '~setvoice',
            event.platform
          );
          
        } catch (error) {
          console.error('[CommandProcessor] Error in ~setvoice command:', error);
          await this.sendCommandResponse(
            `@${event.user} Sorry, failed to set your voice. Please try again.`,
            '~setvoice',
            event.platform
          );
        }
      }
    };

    this.systemCommands.set('~setvoice', setvoiceCommand);

    // ~myvoice command
    const myvoiceCommand: SystemCommand = {
      command: '~myvoice',
      enabled: true,
      description: 'Show your current TTS voice setting',
      permissionLevel: 'viewer',
      enableTTSReply: false,
      handler: async (event: StreamEvent) => {
        try {
          // Get user ID for database lookup
          const platformUserId = event.tags?.['user-id'] || event.user;
          const platform = event.platform;
          const crypto = require('crypto');
          const viewerKey = crypto.createHash('sha256').update(`${platform}:${platformUserId}`).digest('hex').slice(0, 12);

          // Fetch user's voice setting from database
          const { fetchViewerSettings } = require('../core/database');
          const settings = await new Promise<any[]>((resolve, reject) => {
            fetchViewerSettings(viewerKey, (err: Error | null, rows?: any[]) => {
              if (err) reject(err);
              else resolve(rows || []);
            });
          });

          const voiceSetting = settings.find(s => s.key === 'voice');
          const currentVoice = voiceSetting?.value;

          if (!currentVoice || currentVoice === '') {
            await this.sendCommandResponse(
              `@${event.user} You haven't set a custom TTS voice yet. Using default voice. Use ~setvoice [name] to set your voice (see ~voices for options).`,
              '~myvoice',
              event.platform
            );
            return;
          }

          // Find voice details
          const allVoices = pollyVoiceEngines as any[];
          const voiceDetails = allVoices.find(v => v.Name === currentVoice);

          if (voiceDetails) {
            await this.sendCommandResponse(
              `@${event.user} Your TTS voice is set to ${voiceDetails.Name} (${voiceDetails.LanguageName}). Use ~setvoice [name] to change it.`,
              '~myvoice',
              event.platform
            );
          } else {
            await this.sendCommandResponse(
              `@${event.user} Your TTS voice is set to ${currentVoice}, but this voice is no longer available. Use ~setvoice [name] to update it.`,
              '~myvoice',
              event.platform
            );
          }
          
        } catch (error) {
          console.error('[CommandProcessor] Error in ~myvoice command:', error);
          await this.sendCommandResponse(
            `@${event.user} Sorry, failed to retrieve your voice setting.`,
            '~myvoice',
            event.platform
          );
        }
      }
    };

    this.systemCommands.set('~myvoice', myvoiceCommand);
  }

  private loadSettings(settings: Record<string, { enabled: boolean }>) {
    for (const [command, config] of Object.entries(settings)) {
      const systemCommand = this.systemCommands.get(command);
      if (systemCommand) {
        systemCommand.enabled = config.enabled;
      }
    }
  }

  // Check if user has permission to execute a command
  private async checkPermission(event: StreamEvent, requiredLevel: PermissionLevel): Promise<boolean> {
    // Check if role is already provided in tags (for real-time events)
    const tagRole = event.tags?.['role'];
    if (tagRole) {
      return this.checkRolePermission(tagRole, requiredLevel);
    }

    // Fall back to database lookup for stored role settings
    const platformUserId = event.tags?.['user-id'] || event.user;
    const platform = event.platform;
    const crypto = require('crypto');
    const viewerKey = crypto.createHash('sha256').update(`${platform}:${platformUserId}`).digest('hex').slice(0, 12);
    
    return new Promise((resolve) => {
      fetchViewerSettings(viewerKey, (err, rows) => {
        if (err || !Array.isArray(rows)) {
          // Default to viewer level if no settings found
          resolve(requiredLevel === 'viewer');
          return;
        }
        
        const roleSetting = rows.find(r => r.key === 'role');
        const userRole = roleSetting?.value || 'viewer';
        
        resolve(this.checkRolePermission(userRole, requiredLevel));
      });
    });
  }

  // Helper method to check role permission hierarchy
  private checkRolePermission(userRole: string, requiredLevel: PermissionLevel): boolean {
    switch (requiredLevel) {
      case 'viewer':
        return true; // Everyone can run viewer commands
      case 'moderator':
        return userRole === 'moderator' || userRole === 'super_moderator';
      case 'super_moderator':
        return userRole === 'super_moderator';
      default:
        return false;
    }
  }

  private setupEventListeners() {
    // Listen for chat events and process commands
    eventBus.onEventType('chat', async (event: StreamEvent) => {
      if (!event.message) return;
      
      const message = event.message.trim();
      if (!message.startsWith('~')) return;
      
      // Extract command (first word)
      const command = message.split(' ')[0].toLowerCase();
      
      const systemCommand = this.systemCommands.get(command);
      if (systemCommand && systemCommand.enabled) {
        try {
          // Check if user has permission to run this command
          const hasPermission = await this.checkPermission(event, systemCommand.permissionLevel);
          
          if (!hasPermission) {
            console.log(`[CommandProcessor] User ${event.user} lacks permission for command: ${command} (requires ${systemCommand.permissionLevel})`);
            // Send permission denied message (never read by TTS)
            await platformIntegrationService.sendChatMessage(
              `@${event.user} You don't have permission to use that command. (Requires ${systemCommand.permissionLevel} or higher)`,
              event.platform,
              true // Always skip TTS for permission denied messages
            );
            return;
          }
          
          console.log(`[CommandProcessor] Executing system command: ${command} for user: ${event.user}`);
          await systemCommand.handler(event);
          this.emit('commandExecuted', { command, user: event.user, success: true });
        } catch (error) {
          console.error(`[CommandProcessor] Error executing command ${command}:`, error);
          this.emit('commandExecuted', { command, user: event.user, success: false, error });
        }
      }
    });
  }

  // Custom sendChatMessage that respects TTS settings
  async sendCommandResponse(message: string, command: string, platform: Platform = 'twitch'): Promise<void> {
    const systemCommand = this.systemCommands.get(command);
    const skipTTS = systemCommand ? !systemCommand.enableTTSReply : true;
    await platformIntegrationService.sendChatMessage(message, platform, skipTTS);
  }

  // Get all system commands for UI (without the handler functions)
  getSystemCommands(): Omit<SystemCommand, 'handler'>[] {
    return Array.from(this.systemCommands.values()).map(cmd => ({
      command: cmd.command,
      enabled: cmd.enabled,
      description: cmd.description,
      permissionLevel: cmd.permissionLevel,
      enableTTSReply: cmd.enableTTSReply
    }));
  }

  // Enable/disable a system command
  setCommandEnabled(command: string, enabled: boolean): void {
    const systemCommand = this.systemCommands.get(command);
    if (systemCommand) {
      systemCommand.enabled = enabled;
      console.log(`[CommandProcessor] Command ${command} ${enabled ? 'enabled' : 'disabled'}`);
      this.emit('commandToggled', { command, enabled });
    }
  }

  // Get command status
  isCommandEnabled(command: string): boolean {
    const systemCommand = this.systemCommands.get(command);
    return systemCommand ? systemCommand.enabled : false;
  }

  // Set command permission level
  setCommandPermissionLevel(command: string, permissionLevel: PermissionLevel): void {
    const systemCommand = this.systemCommands.get(command);
    if (systemCommand) {
      systemCommand.permissionLevel = permissionLevel;
      console.log(`[CommandProcessor] Command ${command} permission level set to ${permissionLevel}`);
      this.emit('commandPermissionChanged', { command, permissionLevel });
    }
  }

  // Get command permission level
  getCommandPermissionLevel(command: string): PermissionLevel | null {
    const systemCommand = this.systemCommands.get(command);
    return systemCommand ? systemCommand.permissionLevel : null;
  }

  // Set command TTS reply setting
  setCommandTTSReply(command: string, enableTTSReply: boolean): void {
    const systemCommand = this.systemCommands.get(command);
    if (systemCommand) {
      systemCommand.enableTTSReply = enableTTSReply;
      console.log(`[CommandProcessor] Command ${command} TTS reply ${enableTTSReply ? 'enabled' : 'disabled'}`);
      this.emit('commandTTSReplyChanged', { command, enableTTSReply });
    }
  }

  // Get command TTS reply setting
  getCommandTTSReply(command: string): boolean | null {
    const systemCommand = this.systemCommands.get(command);
    return systemCommand ? systemCommand.enableTTSReply : null;
  }
}

export const commandProcessor = new CommandProcessor();
