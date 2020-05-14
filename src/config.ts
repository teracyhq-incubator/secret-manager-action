import * as core from "@actions/core";
import { Octokit } from "@octokit/action";
import * as dotenv from "dotenv";

import * as gpg from "./gpg";

async function getFileContent(path: string): Promise<string> {
  //TODO(hoatle): implement this
  core.debug(`getFileContent: ${path}`);
  return "";
}

async function getHttpContent(path: string): Promise<string> {
  //TODO(hoatle): implemetn this
  core.debug(`getHttpContent: ${path}`);
  return "";
}

function prop(obj: any, key: string): any {
  return obj[key];
}

/**
 * getContent implementation for gist protocol
 * gist://:gist_id#:file_name is used to always get the latest file content
 * gist://:gist_id/:sha#:file_name is used to get the file content of a specific revision
 * @return
 */
async function getGistContent(path: string): Promise<string> {
  core.debug(`getGistContent: ${path}`);
  //:gist_id
  const gistIdFound = path.match(/^gist:\/\/(\S+)[/#]/);
  if (gistIdFound == null) {
    throw new Error(`gistId not found: ${path}`);
  }
  const gistId = gistIdFound[1];

  const fileNameFound = path.match(/^gist:\/\/\S+#(\S+)/);

  if (fileNameFound == null) {
    throw new Error(`fileName not found: ${path}`);
  }

  const fileName = fileNameFound[1];

  const shaFound = path.match(/^gist:\/\/\S+\/(\S+)#/);

  const octokit = new Octokit();

  let fileContent;

  let sha = "";
  if (shaFound) {
    sha = shaFound[1];
    core.debug(`sha: ${sha}`);
    const { data } = await octokit.gists.getRevision({
      gist_id: gistId, // eslint-disable-line @typescript-eslint/camelcase
      sha,
    });
    fileContent = prop(data.files, fileName).content;
  } else {
    const { data } = await octokit.gists.get({
      gist_id: gistId, // eslint-disable-line @typescript-eslint/camelcase
    });
    fileContent = prop(data.files, fileName).content;
  }

  core.debug(`fileContent of ${path}:`);
  console.debug(`${fileContent}`);
  return fileContent;
}

// factory
async function getContentResolver(path: string): Promise<string> {
  if (path.startsWith("file://")) {
    return await getFileContent(path);
  } else if (path.startsWith("http://") || path.startsWith("https://")) {
    return await getHttpContent(path);
  } else if (path.startsWith("gist://")) {
    return await getGistContent(path);
  } else {
    throw new Error(`the path protocol is not supported: ${path}`);
  }
}

/**
 * Get content from the provided path with different protocols:
 * - file:// as a local file path relative to the GITHUB_WORKSPACE
 * - http:// https:// as http locations
 * - gist://:gist_id#:file_name or gist://:gist_id/:sha#:file_name as github gists
 * more protocols can be added and implemented easily
 * @return the downloaded file path
 */
async function getContent(path: string): Promise<string> {
  if (!path) {
    throw new Error("path is not defined");
  }
  path = path.trim();
  return await getContentResolver(path);
}

async function getMatchedEnvPaths(
  fileContent: string,
  type: string
): Promise<Array<string>> {
  const typePaths = fileContent.split(/(?:\r\n|\r|\n)/g);
  const matchedTypeReg = new RegExp(`^${type}=(\\S+)$`);

  let filteredPaths = typePaths.filter((path) => {
    return path.match(matchedTypeReg) != null;
  });

  // core.debug(`filteredPaths: ${filteredPaths}`);

  filteredPaths = filteredPaths.map((path) => {
    const matched = path.match(matchedTypeReg);
    // console.log(`matched: ${matched}`);
    if (!matched) {
      throw new Error(
        `no match for path: ${path} with regex: ${matchedTypeReg}`
      );
    }
    return matched[1];
  });
  core.debug(`filteredPaths: ${filteredPaths}`);
  return filteredPaths;
}

async function parseEnvPaths(
  envPaths: Array<string>,
  passphrase: string
): Promise<object> {
  // core.debug(`parseEnvPaths: ${envPaths}`);
  // use the order for override mechanism
  const decryptedContents = await Promise.all(
    envPaths.map(async (path) => {
      try {
        const result = new Map<string, string>();
        const fileContent = await getContent(path);
        const decryptedContent = await gpg.decrypt(fileContent, {
          passphrase,
        });
        // core.debug(`decrypted content of ${path}:`);
        // console.log(`${decryptedContent}`);
        result.set(path, decryptedContent);
        return result;
      } catch (err) {
        core.setFailed(err);
      }
    })
  );

  // now parse env vars with override mechanism
  let env = {};
  envPaths.forEach(async (path) => {
    const found = decryptedContents.filter((obj) => {
      return obj?.get(path) != undefined;
    });
    if (found[0] != undefined) {
      const envConf = found[0].get(path) || "";
      env = { ...env, ...dotenv.parse(envConf) };
    }
  });

  core.debug(`env: ${JSON.stringify(env)}`);
  return env;
}

type ConfigEnvOptions = {
  configFilePath: string;
  type: string;
  passphrase: string;
};

/**
 * Get env config object from the provided ConfigEnvOptions
 */
export async function getConfigEnv(opts: ConfigEnvOptions): Promise<object> {
  const configFileContent = await getContent(opts.configFilePath);
  const envPaths = await getMatchedEnvPaths(configFileContent, opts.type);
  return await parseEnvPaths(envPaths, opts.passphrase);
}
