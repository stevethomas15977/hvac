import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = process.cwd();
const envPath = resolve(projectRoot, 'locals.env');
const appConfigPath = resolve(projectRoot, 'public', 'app-config.json');

function parseEnvFile(fileContent) {
  const env = {};

  for (const rawLine of fileContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function parseOrigins(value) {
  if (!value) {
    return ['http://localhost:4200', 'http://localhost:8080'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

if (!existsSync(envPath)) {
  console.log('locals.env not found; keeping existing public/app-config.json.');
  process.exit(0);
}

const envContent = readFileSync(envPath, 'utf8');
const env = parseEnvFile(envContent);

const proposalApiMode = env.LOCAL_PROPOSAL_API_MODE === 'http' ? 'http' : 'mock';
const proposalWizardApiBaseUrl = (env.LOCAL_PROPOSAL_WIZARD_API_BASE_URL ?? '').replace(/\/$/, '');
const proposalWizardApiMode = env.LOCAL_PROPOSAL_WIZARD_API_MODE
  ? env.LOCAL_PROPOSAL_WIZARD_API_MODE
  : proposalWizardApiBaseUrl
    ? 'http'
    : 'mock';
const authMode = env.LOCAL_AUTH_MODE === 'local' ? 'local' : 'cognito';

const config = {
  app: {
    proposalApiMode,
    proposalWizardApiMode,
    proposalWizardApiBaseUrl,
    authMode
  },
  cognito: {
    userPoolId: env.LOCAL_COGNITO_USER_POOL_ID ?? '',
    userPoolClientId: env.LOCAL_COGNITO_USER_POOL_CLIENT_ID ?? '',
    domain: env.LOCAL_COGNITO_DOMAIN ?? '',
    frontendBaseUrl: env.LOCAL_FRONTEND_BASE_URL ?? '',
    localOrigins: parseOrigins(env.LOCAL_COGNITO_LOCAL_ORIGINS)
  }
};

writeFileSync(appConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log('Generated public/app-config.json from locals.env.');
