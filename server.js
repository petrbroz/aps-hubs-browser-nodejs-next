import path from 'node:path';
import { fastify } from 'fastify';
import { fastifyStatic } from '@fastify/static';
import { fastifySession } from '@fastify/session';
import { fastifyCookie } from '@fastify/cookie';
import { getAuthorizationUrl, getCredentials, refreshCredentials, getUserProfile, getHubs, getProjects, getProjectContents, getItemVersions } from './aps.js';
import { PORT, SERVER_SESSION_SECRET } from './config.js';

async function checkAuth(req, res) {
    const { credentials } = req.session;
    if (!credentials) {
        res.code(401);
        throw new Error('Missing credentials.');
    } else {
        if (credentials.expires_at < Date.now()) {
            req.session.credentials = await refreshCredentials(credentials.refresh_token);
        }
    }
}

const server = fastify({ logger: true });
server.register(fastifyStatic, { root: path.join(import.meta.dirname, 'wwwroot') });
server.register(fastifyCookie);
server.register(fastifySession, {
    cookieName: 'hubs-browser-session',
    secret: SERVER_SESSION_SECRET,
    cookie: { maxAge: 24 * 60 * 60 * 1000, secure: false }
});

server.get('/api/auth/login', async (req, res) => {
    res.redirect(getAuthorizationUrl());
});

server.get('/api/auth/logout', async (req, res) => {
    delete req.session.credentials;
    res.redirect('/');
});

server.get('/api/auth/callback', async (req, res) => {
    req.session.credentials = await getCredentials(req.query.code);
    res.redirect('/');
});

server.get('/api/auth/token', { preHandler: [checkAuth] }, async (req, res) => {
    const { credentials } = req.session;
    return {
        access_token: credentials.access_token,
        expires_in: Math.round((credentials.expires_at - Date.now()) / 1000)
    };
});

server.get('/api/auth/profile', { preHandler: [checkAuth] }, async (req, res) => {
    const profile = await getUserProfile(req.session.credentials);
    return { name: profile.name };
});

server.get('/api/hubs', { preHandler: [checkAuth] }, async (req, res) => getHubs(req.session.credentials));
server.get('/api/hubs/:hub/projects', { preHandler: [checkAuth] }, async (req, res) => getProjects(req.params.hub, req.session.credentials));
server.get('/api/hubs/:hub/projects/:project/contents', { preHandler: [checkAuth] }, async (req, res) => getProjectContents(req.params.hub, req.params.project, req.query.folder, req.session.credentials));
server.get('/api/hubs/:hub/projects/:project/contents/:item/versions', { preHandler: [checkAuth] }, async (req, res) => getItemVersions(req.params.project, req.params.item, req.session.credentials));

try {
    await server.listen({ port: PORT });
} catch (err) {
    console.error(err);
    process.exit(1);
}