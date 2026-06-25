// Copyright (c) Microsoft Corporation.
// Licensed under the Apache 2.0.
// Azure Container Registry functions (management plane + data plane).

import { ContainerRegistryManagementClient } from '@azure/arm-containerregistry';
import { ContainerRegistryClient } from '@azure/container-registry';
import { getAzureCredential } from '../../azureCredential';
import { debugLog, getErrorMessage, isValidGuid } from './az-helpers';
import { isValidAzResourceName } from './az-validation';

/** Azure Container Registry name: 5-50 lowercase alphanumeric characters. */
export const ACR_NAME_PATTERN = /^[a-z0-9]{5,50}$/;

/** Shared validation error for invalid ACR names. */
export const ACR_NAME_ERROR = 'Registry name must be 5-50 lowercase alphanumeric characters.';

/**
 * Creates an Azure Container Registry.
 */
export async function createContainerRegistry(options: {
  registryName: string;
  resourceGroup: string;
  subscriptionId: string;
  location: string;
  sku?: 'Basic' | 'Standard' | 'Premium';
}): Promise<{ success: boolean; id?: string; loginServer?: string; error?: string }> {
  const { registryName, resourceGroup, subscriptionId, location, sku = 'Basic' } = options;

  if (!isValidGuid(subscriptionId)) {
    return { success: false, error: 'Invalid subscription ID format' };
  }
  if (!ACR_NAME_PATTERN.test(registryName)) {
    return { success: false, error: `Invalid registry name: ${ACR_NAME_ERROR}` };
  }
  if (!isValidAzResourceName(resourceGroup)) {
    return { success: false, error: 'Invalid resource group name format' };
  }

  try {
    debugLog('Creating container registry:', registryName);
    const client = new ContainerRegistryManagementClient(
      await getAzureCredential(),
      subscriptionId
    );
    const registry = await client.registries.beginCreateAndWait(resourceGroup, registryName, {
      location,
      sku: { name: sku },
    });
    return {
      success: true,
      id: registry.id,
      loginServer: registry.loginServer,
    };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// Azure Container Registry functions (moved from az-cli.ts)
export type AcrSku = 'Basic' | 'Standard' | 'Premium';

export interface AcrInfo {
  id: string;
  name: string;
  resourceGroup: string;
  loginServer: string;
  location: string;
  sku: AcrSku;
}

/** Extracts the resource group name from an Azure resource ID. */
function resourceGroupFromId(id?: string): string {
  if (!id) {
    return '';
  }
  const match = /\/resourceGroups\/([^/]+)/i.exec(id);
  return match?.[1] ?? '';
}

export async function getContainerRegistries(subscriptionId: string): Promise<AcrInfo[]> {
  if (!isValidGuid(subscriptionId)) {
    throw new Error('Invalid subscription ID format');
  }

  try {
    debugLog('Listing container registries:', subscriptionId);
    const client = new ContainerRegistryManagementClient(
      await getAzureCredential(),
      subscriptionId
    );
    const registries: AcrInfo[] = [];
    for await (const r of client.registries.list()) {
      registries.push({
        id: r.id as string,
        name: r.name as string,
        resourceGroup: resourceGroupFromId(r.id),
        loginServer: r.loginServer as string,
        location: r.location as string,
        sku: (r.sku?.name as AcrSku) ?? 'Basic',
      });
    }
    return registries;
  } catch (error) {
    throw new Error(getErrorMessage(error) ?? 'Failed to get container registries');
  }
}

export async function getContainerImages(
  subscriptionId: string,
  registryName?: string
): Promise<any[]> {
  let allImages: any[] = [];

  if (registryName) {
    const images = await getImagesFromRegistry(registryName);
    allImages = allImages.concat(images);
  } else {
    // Get all registries first, then get images from each.
    const registries = await getContainerRegistries(subscriptionId);

    for (const registry of registries) {
      try {
        const images = await getImagesFromRegistry(registry.name, registry.loginServer);
        allImages = allImages.concat(images);
      } catch (error) {
        console.warn(`Failed to get images from registry ${registry.name}:`, error);
        // Continue with other registries.
      }
    }
  }

  return allImages;
}

/**
 * Lists repositories and their recent tags from a single registry via the ACR
 * data-plane API. The `ContainerRegistryClient` performs the ACR token exchange
 * internally using `azureCredential`. Returns an empty list on auth/404 errors
 * so callers can degrade gracefully, matching prior CLI behavior.
 */
async function getImagesFromRegistry(registryName: string, loginServer?: string): Promise<any[]> {
  const endpoint = `https://${loginServer ?? `${registryName}.azurecr.io`}`;
  const client = new ContainerRegistryClient(endpoint, await getAzureCredential());

  const MAX_REPOSITORIES = 10; // Limit to first 10 repositories for performance.
  const MAX_IMAGES_TOTAL = 50; // Stop after collecting 50 images total.
  const MAX_TAGS_PER_REPO = 5; // Most recent tags per repository.

  const repositories: string[] = [];
  try {
    for await (const name of client.listRepositoryNames()) {
      repositories.push(name);
      if (repositories.length >= MAX_REPOSITORIES) {
        break;
      }
    }
  } catch (error) {
    console.error(`Failed to get repositories from ${registryName}:`, error);
    return [];
  }

  const allImages: any[] = [];

  for (const repository of repositories) {
    if (allImages.length >= MAX_IMAGES_TOTAL) {
      debugLog(`Limiting results to ${MAX_IMAGES_TOTAL} images for performance`);
      break;
    }

    try {
      const repo = client.getRepository(repository);
      let tagCount = 0;

      for await (const manifest of repo.listManifestProperties({
        order: 'LastUpdatedOnDescending',
      })) {
        for (const tag of manifest.tags ?? []) {
          allImages.push({
            id: `${registryName}/${repository}:${tag}`,
            name: repository.split('/').pop() || repository,
            repository,
            tag,
            registry: `${registryName}.azurecr.io`,
            registryName,
            createdTime: manifest.createdOn.toISOString().split('T')[0],
            size:
              manifest.sizeInBytes !== null && manifest.sizeInBytes !== undefined
                ? String(manifest.sizeInBytes)
                : 'Unknown',
            digest: manifest.digest ?? '',
          });

          tagCount += 1;
          if (tagCount >= MAX_TAGS_PER_REPO || allImages.length >= MAX_IMAGES_TOTAL) {
            break;
          }
        }
        if (tagCount >= MAX_TAGS_PER_REPO || allImages.length >= MAX_IMAGES_TOTAL) {
          break;
        }
      }
    } catch (error) {
      console.warn(`Failed to process repository ${repository}:`, error);
    }
  }

  return allImages;
}
