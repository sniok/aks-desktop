# Azure AKS

Headlamp plugin for Azure authentication and AKS integration in AKS Desktop.

Features include:

- Azure login and account profile
- AKS cluster registration and token refresh
- Regular Kubernetes namespace creation as AKS Desktop projects
- Managed namespace project creation, import, configuration, access, and deletion
- Application deployment from container images or Kubernetes YAML
- Optional Azure workload identity configuration

## Development

```bash
npm install
npm start
```

Run validation with:

```bash
npm run tsc
npm test
npm run lint
npm run build
```
