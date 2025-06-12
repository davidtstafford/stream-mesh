// Command processing service for handling chat commands
import { EventEmitter } from 'events';
import { platformIntegrationService } from './platformIntegration';
import { eventBus, StreamEvent } from './eventBus';
import { fetchViewerSettings } from '../core/database';

// Permission levels for commands
export type PermissionLevel = 'viewer' | 'moderator' | 'super_moderator';

export interface SystemCommand {
  command: string;
  enabled: boolean;
  description: string;
  permissionLevel: PermissionLevel;
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
      handler: async (event: StreamEvent) => {
        const response = `Hello ${event.user}! 👋`;
        await platformIntegrationService.sendChatMessage(response);
      }
    };

    this.systemCommands.set('~hello', helloCommand);
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
    // Get user ID for database lookup
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
        
        // Check permission hierarchy
        switch (requiredLevel) {
          case 'viewer':
            resolve(true); // Everyone can run viewer commands
            break;
          case 'moderator':
            resolve(userRole === 'moderator' || userRole === 'super_moderator');
            break;
          case 'super_moderator':
            resolve(userRole === 'super_moderator');
            break;
          default:
            resolve(false);
        }
      });
    });
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
            // Optionally send a message back to chat about insufficient permissions
            await platformIntegrationService.sendChatMessage(
              `@${event.user} You don't have permission to use that command. (Requires ${systemCommand.permissionLevel} or higher)`
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

  // Get all system commands for UI (without the handler functions)
  getSystemCommands(): Omit<SystemCommand, 'handler'>[] {
    return Array.from(this.systemCommands.values()).map(cmd => ({
      command: cmd.command,
      enabled: cmd.enabled,
      description: cmd.description,
      permissionLevel: cmd.permissionLevel
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
}

export const commandProcessor = new CommandProcessor();
