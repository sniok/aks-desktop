# Azure Utilities (`utils/azure/`)

This directory contains the Azure SDK integration layer for AKS Desktop. Every
Azure operation for workload features flows through these modules. Operations are performed programmatically
with the Azure SDK clients, not by shelling out to the `az` CLI.

## Authentication

All authentication lives in `../../azureCredential.tsx`, the single source of
truth. It exports an SDK-compatible `azureCredential` (`{ getToken(scopes) }`)
plus `getLoginStatus()`, `initiateLogin()`, and `logout()`. The credential is
passed into every SDK client constructor. For raw bearer tokens (kubeconfig,
Prometheus, Microsoft Graph) call `azureCredential.getToken(scope)`.

## Module Map

### Core Layer

| Module             | Responsibility                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `clients.ts`       | SDK client factories, each bound to `azureCredential` (Resource Graph, Container Service, Authorization, MSI, Container Registry, Features, Resources) |
| `az-helpers.ts`    | Shared pure helpers: `debugLog`, `isValidGuid`, `getErrorMessage`                                                  |
| `az-validation.ts` | Input validation (`isValidAzResourceName`, `isValidGitHubName`) and output parsing (`parseManagedIdentityOutput`) |

### Domain Modules

| Module                   | SDK client(s)                                              | Responsibility                                                                |
| ------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `az-subscriptions.ts`    | `SubscriptionClient`, `ResourceManagementClient`          | Subscriptions, tenants, resource groups, locations, VM sizes                  |
| `az-resource-graph.ts`   | `ResourceGraphClient`                                      | Azure Resource Graph queries for fast cross-subscription lookups              |
| `az-clusters.ts`         | `ResourceGraphClient`, `ContainerServiceClient`           | AKS cluster listing, status, capabilities, kubeconfig, addons                 |
| `az-identity.ts`         | `ManagedServiceIdentityClient`, `AuthorizationManagementClient` | Managed identity CRUD, role assignments, scope building                  |
| `az-acr.ts`              | `ContainerRegistryManagementClient`, `ContainerRegistryClient` | Container registry creation, listing, and image discovery                |
| `az-federation.ts`       | `ManagedServiceIdentityClient`, `ContainerServiceClient` | Federated credentials for GitHub Actions and Kubernetes OIDC                  |

### Orchestration Modules

These modules compose the domain primitives into higher-level workflows used by
UI components:

| Module                 | Responsibility                                                           |
| ---------------------- | ------------------------------------------------------------------------ |
| `aks.ts`               | Cluster registration flow (kubeconfig credentials + Headlamp `setCluster`) |
| `identitySetup.ts`     | Ensure resource group + managed identity exist (create-if-missing)       |
| `identityRoles.ts`     | Compute required role assignments for a given namespace context          |
| `identityWithRoles.ts` | End-to-end: ensure identity exists with all required roles               |

## SDK Client Factories (`clients.ts`)

Every client is constructed via a factory bound to `azureCredential`:

```typescript
import { containerServiceClient, resourceGraphClient } from './clients';

const clusters = containerServiceClient(subscriptionId);
const graph = resourceGraphClient();
```

Read-heavy, cross-subscription queries use `ResourceGraphClient`. Resource CRUD
uses the per-service management clients (`ContainerServiceClient`,
`AuthorizationManagementClient`, etc.), each scoped to a `subscriptionId`.

## Adding a New Function

1. **Find the right module.** Match the Azure resource type: subscriptions go in
   `az-subscriptions.ts`, cluster operations in `az-clusters.ts`, etc.
2. **Create a new module** only when the function targets a new Azure resource
   domain (e.g., `az-dns.ts` for DNS zones). Prefix with `az-`.
3. **Get a client from `clients.ts`** (add a new factory there if the SDK client
   is not yet exposed). Never construct clients inline; always bind through the
   shared `azureCredential`.
4. **Validate inputs** with `isValidGuid` (from `az-helpers.ts`) or helpers from
   `az-validation.ts` before interpolating values into KQL Resource Graph
   queries or OData filters -- this prevents query injection.
5. **Wrap SDK calls in try/catch** and map errors to the module's result shape
   using `getErrorMessage(error)`.

## Return Type Conventions

**Operations that can fail gracefully:**

```typescript
{ success: boolean; data?: T; error?: string }
```

**Operations returning only a status:**

```typescript
{ success: boolean; message?: string }
```

These shapes are preserved from the previous CLI implementation so consumers did
not need to change.

## Error Handling

- SDK clients throw on failure (the Azure SDK raises `RestError`). Wrap calls in
  `try/catch` and convert to the module result shape.
- **`getErrorMessage(error)`** (from `az-helpers.ts`) -- normalizes an unknown
  thrown value into a string message (`error instanceof Error ? error.message :
  'Unknown error'`).
- **`isValidGuid(value)`** -- validates subscription/tenant IDs before
  interpolating into KQL queries or other string-based query contexts to prevent
  query injection.
- Token expiry / re-login is handled centrally by `azureCredential`; modules do
  not implement their own re-login detection.
