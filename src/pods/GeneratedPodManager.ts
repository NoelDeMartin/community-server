import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceStore } from '../storage/ResourceStore';
import { ConflictHttpError } from '../util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import type { Agent } from './agent/Agent';
import type { IdentifierGenerator } from './generate/IdentifierGenerator';
import type { ResourcesGenerator } from './generate/ResourcesGenerator';
import type { PodManager } from './PodManager';

/**
 * Pod manager that uses an {@link IdentifierGenerator} and {@link ResourcesGenerator}
 * to create the default resources and identifier for a new pod.
 */
export class GeneratedPodManager implements PodManager {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;
  private readonly idGenerator: IdentifierGenerator;
  private readonly resourcesGenerator: ResourcesGenerator;

  public constructor(store: ResourceStore, idGenerator: IdentifierGenerator, resourcesGenerator: ResourcesGenerator) {
    this.store = store;
    this.idGenerator = idGenerator;
    this.resourcesGenerator = resourcesGenerator;
  }

  /**
   * Creates a new pod, pre-populating it with the resources created by the data generator.
   * Pod identifiers are created based on the identifier generator.
   * Will throw an error if the given identifier already has a resource.
   */
  public async createPod(agent: Agent): Promise<ResourceIdentifier> {
    const podIdentifier = this.idGenerator.generate(agent.login);
    this.logger.info(`Creating pod ${podIdentifier.path}`);
    try {
      const result = await this.store.getRepresentation(podIdentifier, {});
      result.data.destroy();
      throw new ConflictHttpError(`There already is a resource at ${podIdentifier.path}`);
    } catch (error: unknown) {
      // We want the identifier to not exist
      if (!(error instanceof NotFoundHttpError)) {
        throw error;
      }
    }

    const resources = this.resourcesGenerator.generate(podIdentifier, agent);
    let count = 0;
    for await (const { identifier, representation } of resources) {
      await this.store.setRepresentation(identifier, representation);
      count += 1;
    }
    this.logger.info(`Added ${count} resources to ${podIdentifier.path}`);
    return podIdentifier;
  }
}
