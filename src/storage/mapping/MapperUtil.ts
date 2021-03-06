import { posix } from 'path';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Logger } from '../../logging/Logger';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { decodeUriPathComponents } from '../../util/PathUtil';

const { join: joinPath } = posix;

/**
 * Get the absolute file path based on the rootFilepath of the store.
 * @param rootFilepath - The root file path.
 * @param path - The relative file path.
 * @param identifier - Optional identifier to add to the path.
 *
 * @returns Absolute path of the file.
 */
export const getAbsolutePath = (rootFilepath: string, path: string, identifier = ''): string =>
  joinPath(rootFilepath, path, identifier);

/**
 * Strips the baseRequestURI from the identifier and checks if the stripped base URI matches the store's one.
 * @param baseRequestURI - Base URL for requests.
 * @param identifier - Incoming identifier.
 * @param logger - A logger instance.
 *
 * @throws {@link NotFoundHttpError}
 * If the identifier does not match the baseRequestURI path of the store.
 *
 * @returns A string representing the relative path.
 */
export const getRelativePath = (baseRequestURI: string, identifier: ResourceIdentifier, logger: Logger): string => {
  if (!identifier.path.startsWith(baseRequestURI)) {
    logger.warn(`The URL ${identifier.path} is outside of the scope ${baseRequestURI}`);
    throw new NotFoundHttpError();
  }
  return decodeUriPathComponents(identifier.path.slice(baseRequestURI.length));
};

/**
 * Check if the given relative path is valid.
 *
 * @throws {@link BadRequestHttpError}
 * If the relative path is invalid.
 *
 * @param path - A relative path, as generated by {@link getRelativePath}.
 * @param identifier - A resource identifier.
 * @param logger - A logger instance.
 */
export const validateRelativePath = (path: string, identifier: ResourceIdentifier, logger: Logger): void => {
  if (!path.startsWith('/')) {
    logger.warn(`URL ${identifier.path} needs a / after the base`);
    throw new BadRequestHttpError('URL needs a / after the base');
  }

  if (path.includes('/..')) {
    logger.warn(`Disallowed /.. segment in URL ${identifier.path}.`);
    throw new BadRequestHttpError('Disallowed /.. segment in URL');
  }
};
