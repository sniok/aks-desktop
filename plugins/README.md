# Plugins

This directory contains the plugins for the AKS desktop application.

## Structure

- `azure-aks/` - Azure and AKS project integration for Headlamp
  - Provides Azure authentication, AKS cluster registration, regular and managed namespace projects, application deployment, and Azure workload identity support
- `aks-desktop/` - AKS Desktop shell and workload features
  - Contains app customization, telemetry, observability, and GitHub pipelines
- `ai-assistant/` - AI Assistant plugin for Headlamp (Preview)
  - Provides conversational AI capabilities for Kubernetes cluster management
  - Disabled by default; must be enabled in Settings
  - See [ai-assistant/README.md](ai-assistant/README.md) for details

## Building Plugins

To build all plugins, use the build script from the root directory:

```bash
npx tsx ./build/setup-plugins.ts
```

This script will for each plugin:

1. Navigate to the plugin directory
2. Install dependencies
3. Build the plugin
4. Copy the built plugin to the Headlamp plugins directory

## Development

Each plugin has its own package.json and can be developed independently:

```bash
cd plugins/azure-aks   # or another directory under plugins/
npm install
npm run start  # For development mode
npm run build  # For production build
```
