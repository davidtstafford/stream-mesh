import { SystemCommand } from './SystemCommands';

const gangwarsCommand: SystemCommand = {
  command: '~gangwars',
  enabled: true,
  description: 'Show the Gang Wars game guide and all chat commands',
  permissionLevel: 'viewer',
  enableTTSReply: false,
};

export default gangwarsCommand;
