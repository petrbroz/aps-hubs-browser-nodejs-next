import { createServer, plugins } from 'restify';
import cookieSession from 'cookie-session';
import { getAuthorizationUrl, getCredentials, refreshCredentials, getUserProfile, getHubs, getProjects, getProjectContents, getItemVersions } from './aps.js';
import { PORT, SERVER_SESSION_SECRET } from './config.js';

async function authMiddleware(req, res) {
    if (!req.session.refreshToken) {
        res.send(401);
        return;
    }
    if (req.session.expiresAt < Date.now()) {
        const credentials = await refreshCredentials(req.session.refreshToken);
        Object.assign(req.session, credentials);
    }
}

const server = createServer();
server.use(plugins.queryParser({ mapParams: true }));
server.use(plugins.bodyParser({ mapParams: true, mapFiles: true, maxBodySize: 0 }));
server.use(cookieSession({ secret: SERVER_SESSION_SECRET, maxAge: 24 * 60 * 60 * 1000 }));

server.get('/*', plugins.serveStaticFiles('./wwwroot'));

server.get('/api/auth/login', async function (req, res) {
    res.send(302, null, { Location: getAuthorizationUrl() });
});

server.get('/api/auth/logout', async function (req, res) {
    req.session = null;
    res.send(302, null, { Location: '/' });
});

server.get('/api/auth/callback', async function (req, res) {
    const credentials = await getCredentials(req.params.code);
    Object.assign(req.session, credentials);
    res.send(302, null, { Location: '/' });
});

server.get('/api/auth/token', authMiddleware, async function (req, res) {
    const expiresIn = Math.round((req.session.expiresAt - Date.now()) / 1000);
    res.send({ access_token: req.session.publicToken, expires_in: expiresIn });
});

server.get('/api/auth/profile', authMiddleware, async function (req, res) {
    const profile = await getUserProfile(req.session.internalToken);
    res.send({ name: profile.name });
});

server.get('/api/hubs', authMiddleware, async function (req, res) {
    const hubs = await getHubs(req.session.internalToken);
    res.send(hubs);
});

server.get('/api/hubs/:hub/projects', authMiddleware, async function (req, res) {
    const projects = await getProjects(req.params.hub, req.session.internalToken);
    res.send(projects);
});

server.get('/api/hubs/:hub/projects/:project/contents', authMiddleware, async function (req, res) {
    const contents = await getProjectContents(req.params.hub, req.params.project, req.query.folder, req.session.internalToken);
    res.send(contents);
});

server.get('/api/hubs/:hub/projects/:project/contents/:item/versions', authMiddleware, async function (req, res) {
    const versions = await getItemVersions(req.params.project, req.params.item, req.session.internalToken);
    res.send(versions);
});

server.listen(PORT, function () { console.log('Server listening at', server.url); });