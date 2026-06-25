/** Wait for azureAuth to be available */
const azureAuth: Promise<any> = new Promise((resolve, reject) => {
  const POLLING_INTERVAL = 100;
  const POLLING_LIMIT = 5;
  let pollingCount = 0;
  const intervalId = setInterval(() => {
    if ('azureAuth' in window) {
      clearInterval(intervalId);
      resolve(window.azureAuth);
    }
    if (pollingCount > POLLING_LIMIT) {
      clearInterval(intervalId);
      reject();
    }
    pollingCount++;
  }, POLLING_INTERVAL);
});

/** Azure SDK compatible token credential */
export const getAzureCredential = async () => (await azureAuth).azureCredential;
export const getLoginStatus = async (...params: any[]) =>
  (await azureAuth).getLoginStatus(...params);
export const initiateLogin = async (...params: any[]) => (await azureAuth).initiateLogin(...params);
export const logout = async (...params: any[]) => (await azureAuth).logout(...params);
