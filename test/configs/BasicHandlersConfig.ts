import type {
  HttpHandler,
  ResourceStore,
} from '../../src/index';
import {
  AllowEverythingAuthorizer,
  AuthenticatedLdpHandler,
  EmptyCredentialsExtractor,
  MethodPermissionsExtractor,
  QuadToRdfConverter,
  RawBodyParser,
  RdfToQuadConverter,
  SparqlUpdateBodyParser,
  SparqlPatchPermissionsExtractor,
  WaterfallHandler,
} from '../../src/index';

import type { ServerConfig } from './ServerConfig';
import {
  getInMemoryResourceStore,
  getOperationHandler,
  getConvertingStore,
  getPatchingStore,
  getBasicRequestParser,
  getResponseWriter,
} from './Util';

/**
 * BasicHandlersConfig works with
 * - an AllowEverythingAuthorizer (no acl)
 * - an InMemoryResourceStore wrapped in a converting store & wrapped in a patching store
 * - GET, POST, PUT, PATCH & DELETE operation handlers
 */

export class BasicHandlersConfig implements ServerConfig {
  public store: ResourceStore;

  public constructor() {
    const convertingStore = getConvertingStore(
      getInMemoryResourceStore(),
      [ new QuadToRdfConverter(), new RdfToQuadConverter() ],
    );
    this.store = getPatchingStore(convertingStore);
  }

  public getHttpHandler(): HttpHandler {
    const requestParser = getBasicRequestParser([
      new SparqlUpdateBodyParser(),
      new RawBodyParser(),
    ]);

    const credentialsExtractor = new EmptyCredentialsExtractor();
    const permissionsExtractor = new WaterfallHandler([
      new MethodPermissionsExtractor(),
      new SparqlPatchPermissionsExtractor(),
    ]);
    const authorizer = new AllowEverythingAuthorizer();

    const operationHandler = getOperationHandler(this.store);

    const responseWriter = getResponseWriter();

    const handler = new AuthenticatedLdpHandler({
      requestParser,
      credentialsExtractor,
      permissionsExtractor,
      authorizer,
      operationHandler,
      responseWriter,
    });

    return handler;
  }
}
