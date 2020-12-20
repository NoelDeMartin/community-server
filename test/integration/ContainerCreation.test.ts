import type { Server } from 'http';
import { join } from 'path';
import fetch from 'cross-fetch';
import type { HttpServerFactory } from '../../src/server/HttpServerFactory';
import { readableToString } from '../../src/util/StreamUtil';
import { instantiateFromConfig } from '../configs/Util';

const port = 6003;
const baseUrl = `http://localhost:${port}/`;

describe('A server', (): void => {
  let server: Server;

  beforeAll(async(): Promise<void> => {
    const factory = await instantiateFromConfig(
      'urn:solid-server:default:ServerFactory', 'auth-allow-all.json', {
        'urn:solid-server:default:variable:port': port,
        'urn:solid-server:default:variable:baseUrl': baseUrl,
        'urn:solid-server:default:variable:podTemplateFolder': join(__dirname, '../assets/templates'),
      },
    ) as HttpServerFactory;
    server = factory.startServer(port);
  });

  afterAll(async(): Promise<void> => {
    await new Promise((resolve, reject): void => {
      server.close((error): void => error ? reject(error) : resolve());
    });
  });

  it('creates a container.', async(): Promise<void> => {
    const slug = 'my-container';
    let response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'text/turtle',
        link: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
        slug,
      },
      body: '<> <http://www.w3.org/2000/01/rdf-schema#label> "My Container" .',
    });
    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe(`${baseUrl}${slug}/`);

    response = await fetch(`${baseUrl}${slug}/`, {
      headers: {
        accept: 'text/turtle',
      },
    });
    expect(response.status).toBe(200);

    const body = await readableToString(response.body as any);
    expect(body).toContain(`<${baseUrl}${slug}/> <http://www.w3.org/2000/01/rdf-schema#label> "My Container".`);
  });
});
