import config from "@config/dotenv.config";

// Optional: Client to notify property service about media changes
export class PropertyClient {
  private address: string;

  constructor(address?: string) {
    this.address = address || `localhost:${config.grpcPort + 1}`;

    // This assumes property service has a proto definition
    // For now, this is a placeholder
    console.log(`Property client would connect to: ${this.address}`);
  }

  async notifyMediaAdded(propertyId: string, mediaId: string): Promise<void> {
    // Placeholder for notifying property service
    console.log(
      `Notifying property service: Media ${mediaId} added to property ${propertyId}`
    );
  }

  async notifyMediaRemoved(propertyId: string, mediaId: string): Promise<void> {
    // Placeholder for notifying property service
    console.log(
      `Notifying property service: Media ${mediaId} removed from property ${propertyId}`
    );
  }
}

export const propertyClient = new PropertyClient();
