import { createServer, plugins } from 'restify';
import cookieSession from 'cookie-session';
import { getAuthorizationUrl, getCredentials, refreshCredentials, getUserProfile, getHubs, getProjects, getProjectContents, getItemVersions } from './aps.js';
import { PORT, SERVER_SESSION_SECRET } from './config.js';

async function checkAuth(req, res) {
    const { credentials } = req.session;
    if (!credentials) {
        res.send(401);
    } else {
        if (credentials.expires_at < Date.now()) {
            req.session.credentials = await refreshCredentials(credentials.refresh_token);
        }
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
    req.session.credentials = await getCredentials(req.params.code);
    res.send(302, null, { Location: '/' });
});

server.get('/api/auth/token', checkAuth, async function (req, res) {
    const { credentials } = req.session;
    res.send({
        access_token: credentials.access_token,
        expires_in: Math.round((credentials.expires_at - Date.now()) / 1000)
    });
});

server.get('/api/auth/profile', checkAuth, async function (req, res) {
    const profile = await getUserProfile(req.session.credentials);
    res.send({ name: profile.name });
});

server.get('/api/hubs', checkAuth, async function (req, res) {
    res.send(await getHubs(req.session.credentials));
});

server.get('/api/hubs/:hub/projects', checkAuth, async function (req, res) {
    res.send(await getProjects(req.params.hub, req.session.credentials));
});

server.get('/api/hubs/:hub/projects/:project/contents', checkAuth, async function (req, res) {
    res.send(await getProjectContents(req.params.hub, req.params.project, req.query.folder, req.session.credentials));
});

server.get('/api/hubs/:hub/projects/:project/contents/:item/versions', checkAuth, async function (req, res) {
    res.send(await getItemVersions(req.params.project, req.params.item, req.session.credentials));
});

server.listen(PORT, function () { console.log('Server listening at', server.url); });