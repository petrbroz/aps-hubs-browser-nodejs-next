import APS from 'forge-apis';
import { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL } from './config.js';

const internalAuthClient = new APS.AuthClientThreeLegged(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, ['data:read'], true);
const publicAuthClient = new APS.AuthClientThreeLegged(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, ['viewables:read'], true);

export function getAuthorizationUrl() {
    return internalAuthClient.generateAuthUrl();
}

export async function getCredentials(code) {
    const internalCredentials = await internalAuthClient.getToken(code);
    const publicCredentials = await publicAuthClient.refreshToken(internalCredentials);
    return {
        publicToken: publicCredentials.access_token,
        internalToken: internalCredentials.access_token,
        refreshToken: publicCredentials.refresh_token,
        expiresAt: Date.now() + internalCredentials.expires_in * 1000
    };
}

export async function refreshCredentials(refreshToken) {
    const internalCredentials = await internalAuthClient.refreshToken(refreshToken);
    const publicCredentials = await publicAuthClient.refreshToken(internalCredentials);
    return {
        publicToken: publicCredentials.access_token,
        internalToken: internalCredentials.access_token,
        refreshToken: publicCredentials.refresh_token,
        expiresAt: Date.now() + internalCredentials.expires_in * 1000
    };
}

export async function getUserProfile(token) {
    const resp = await new APS.UserProfileApi().getUserProfile(internalAuthClient, { access_token: token });
    return resp.body;
};

export async function getHubs(token) {
    const resp = await new APS.HubsApi().getHubs(null, internalAuthClient, { access_token: token });
    return resp.body.data;
};

export async function getProjects(hubId, token) {
    const resp = await new APS.ProjectsApi().getHubProjects(hubId, null, internalAuthClient, { access_token: token });
    return resp.body.data;
};

export async function getProjectContents(hubId, projectId, folderId, token) {
    if (!folderId) {
        const resp = await new APS.ProjectsApi().getProjectTopFolders(hubId, projectId, internalAuthClient, { access_token: token });
        return resp.body.data;
    } else {
        const resp = await new APS.FoldersApi().getFolderContents(projectId, folderId, null, internalAuthClient, { access_token: token });
        return resp.body.data;
    }
};

export async function getItemVersions(projectId, itemId, token) {
    const resp = await new APS.ItemsApi().getItemVersions(projectId, itemId, null, internalAuthClient, { access_token: token });
    return resp.body.data;
};