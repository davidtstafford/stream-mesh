// Secure secrets management for Stream Mesh
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

interface SecureConfig {
  kick: {
    clientId: string;
    clientSecret: string;
  };
}

// AES-256-GCM encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is always 16 bytes
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const ITERATIONS = 100000; // PBKDF2 iterations

export class SecretsManager {
  private configPath: string;
  private masterKey: string | null = null;

  constructor() {
    // Store encrypted config in app data directory
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, '.streamesh-secrets.enc');
  }

  /**
   * Initialize with a master password/key
   * This should be called once during app setup
   */
  public initialize(masterPassword: string): void {
    this.masterKey = masterPassword;
  }

  /**
   * Derive encryption key from master password and salt
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  }

  /**
   * Encrypt and save configuration
   */
  public async saveSecureConfig(config: SecureConfig): Promise<void> {
    if (!this.masterKey) {
      throw new Error('SecretsManager not initialized with master key');
    }

    const configJson = JSON.stringify(config);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = this.deriveKey(this.masterKey, salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(configJson, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();

    // Combine salt + iv + authTag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);

    fs.writeFileSync(this.configPath, combined);
    console.log('Secure configuration saved successfully');
  }

  /**
   * Load and decrypt configuration
   */
  public async loadSecureConfig(): Promise<SecureConfig | null> {
    if (!this.masterKey) {
      throw new Error('SecretsManager not initialized with master key');
    }

    if (!fs.existsSync(this.configPath)) {
      return null;
    }

    try {
      const combined = fs.readFileSync(this.configPath);
      
      // Extract components
      const salt = combined.subarray(0, SALT_LENGTH);
      const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
      const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

      const key = this.deriveKey(this.masterKey, salt);
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt configuration:', error);
      return null;
    }
  }

  /**
   * Check if secure config exists
   */
  public hasSecureConfig(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Delete secure configuration
   */
  public deleteSecureConfig(): void {
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
      console.log('Secure configuration deleted');
    }
  }

  /**
   * Get KICK credentials
   */
  public async getKickCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
    const config = await this.loadSecureConfig();
    return config?.kick || null;
  }
}

// Export singleton instance
export const secretsManager = new SecretsManager();
