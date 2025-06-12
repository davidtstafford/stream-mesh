// Command processing service for handling chat commands
import { EventEmitter } from 'events';
import { platformIntegrationService } from './platformIntegration';
import { eventBus, StreamEvent } from './eventBus';

export interface SystemCommand {
  command: string;
  enabled: boolean;
  description: string;
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
      description: cmd.description
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
}

export const commandProcessor = new CommandProcessor();
