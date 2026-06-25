// Copyright (c) Microsoft Corporation.
// Licensed under the Apache 2.0.

import { azureCredential } from './azureAuth';

/** Returns the Azure SDK-compatible credential owned by this plugin. */
export const getAzureCredential = async () => azureCredential;
