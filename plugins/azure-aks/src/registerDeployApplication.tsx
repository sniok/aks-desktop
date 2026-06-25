// Copyright (c) Microsoft Corporation.
// Licensed under the Apache 2.0.

import {
  // @ts-ignore registerProjectHeaderAction is available at runtime but missing from published types
  registerProjectHeaderAction,
} from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import DeployButton from './components/Deploy/DeployButton';

/** Registers the application deployment action for project headers. */
export function registerDeployApplicationFeature() {
  registerProjectHeaderAction({
    id: 'deploy-application',
    component: ({ project }) => <DeployButton project={project} />,
  });
}
