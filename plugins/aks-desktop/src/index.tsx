// Copyright (c) Microsoft Corporation.
// Licensed under the Apache 2.0.

import {
  Headlamp,
  registerAppBarAction,
  registerAppLogo,
  registerAppTheme,
  registerPluginSettings,
  registerProjectDetailsTab,
  // @ts-ignore todo: registerProjectHeaderAction is not exported properly
  registerProjectHeaderAction,
  registerProjectOverviewSection,
} from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import ConfigurePipelineButton from './components/ConfigurePipeline/ConfigurePipelineButton';
import PipelineCard from './components/Deployments/PipelineCard';
import DeployTab from './components/DeployTab/DeployTab';
import { GitHubAuthStatusButton } from './components/GitHubPipeline/components/GitHubAuthStatusButton';
import { GitHubAuthProvider } from './components/GitHubPipeline/GitHubAuthContext';
import AzureLogo from './components/Logo/Logo';
import PreviewFeaturesSettings from './components/PluginSettings/PreviewFeaturesSettings';
import { previewFeaturesStore } from './components/PluginSettings/previewFeaturesStore';
import TelemetrySettings from './components/PluginSettings/TelemetrySettings';
import TelemetryBoot from './components/TelemetryBoot';
import { TelemetryErrorBoundary } from './components/TelemetryErrorBoundary';
import { type ClusterShapeInput, trackClusterShape } from './telemetry';
import type { ProjectDefinition } from './types/project';
import { isAksProject } from './utils/shared/isAksProject';
import { azureTheme } from './utils/shared/theme';

if (!Headlamp.isRunningAsApp()) {
  throw new Error('This plugin is desktop only');
}

window.addEventListener('aks-desktop:cluster-shape', event => {
  const { dedupeKey, input } = (
    event as CustomEvent<{
      dedupeKey: string;
      input: ClusterShapeInput;
    }>
  ).detail;
  trackClusterShape(dedupeKey, input);
});

Headlamp.setAppMenu(menus => {
  // Find the Help menu
  const helpMenu = menus?.find(menu => menu.id === 'original-help');

  if (helpMenu && helpMenu.submenu) {
    // Replace Documentation link
    const docIndex = helpMenu.submenu.findIndex(item => item.id === 'original-documentation');
    if (docIndex !== -1) {
      helpMenu.submenu[docIndex] = {
        label: 'Documentation',
        id: 'aks-documentation',
        url: 'https://aka.ms/aks/aks-desktop',
      };
    }

    // Replace Open Issue link
    const issueIndex = helpMenu.submenu.findIndex(item => item.id === 'original-open-issue');
    if (issueIndex !== -1) {
      helpMenu.submenu[issueIndex] = {
        label: 'Open an Issue',
        id: 'aks-open-issue',
        url: 'https://github.com/Azure/aks-desktop/issues',
      };
    }
  }

  return menus;
});

// boot App Insights telemetry once on first render
registerAppBarAction(TelemetryBoot);

// register azure logo
registerAppLogo(AzureLogo);

// register the theme and make it default
registerAppTheme(azureTheme);
if (!localStorage.getItem('headlampThemePreference')) {
  localStorage.setItem('headlampThemePreference', 'Azure Theme');
  localStorage.setItem('cached-current-theme', `${azureTheme}`);
}

registerProjectDetailsTab({
  id: 'deploy',
  label: 'Deploy',
  icon: 'mdi:cloud-upload',
  isEnabled: isAksProject,
  component: ({ project }) => (
    <TelemetryErrorBoundary>
      <GitHubAuthProvider>
        <DeployTab project={project} />
      </GitHubAuthProvider>
    </TelemetryErrorBoundary>
  ),
});

registerPluginSettings(
  'aks-desktop',
  () => (
    <>
      <PreviewFeaturesSettings />
      <TelemetrySettings />
    </>
  ),
  false
);

registerProjectOverviewSection({
  id: 'pipeline-overview',
  // @ts-expect-error isEnabled exists at runtime but is missing from ProjectOverviewSection types
  isEnabled: props =>
    previewFeaturesStore.get()?.githubPipelines ? isAksProject(props) : Promise.resolve(false),
  // GitHubAuthProvider is duplicated across three registrations (here, DeployTab, and
  // ConfigurePipelineButton) because Headlamp renders each registered component in an
  // independent React tree — there is no shared ancestor to hoist the provider into.
  // Token state is shared across instances via localStorage inside useGitHubAuth.
  component: ({ project }) => (
    <GitHubAuthProvider>
      <PipelineCard project={project} />
    </GitHubAuthProvider>
  ),
});

registerProjectHeaderAction({
  id: 'github-auth-status',
  component: () => (
    <GitHubAuthProvider>
      <GitHubAuthStatusButton />
    </GitHubAuthProvider>
  ),
});

registerProjectHeaderAction({
  id: 'configure-pipeline',
  // setSelectedTab is provided by the headlamp fork (PR #406) but not yet in published types
  component: (props: { project: ProjectDefinition; setSelectedTab?: (tabId: string) => void }) => (
    <GitHubAuthProvider>
      <ConfigurePipelineButton project={props.project} setSelectedTab={props.setSelectedTab} />
    </GitHubAuthProvider>
  ),
});
