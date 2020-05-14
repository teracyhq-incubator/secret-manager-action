import * as core from "@actions/core";

function normalizedKeys(keys: Array<string>): Array<string> {
  return keys.map((val) => {
    return val.trim();
  });
}

/**
 * output all env KEY=value
 */
export async function outputEnv(env: object): Promise<void> {
  for (const [key, value] of Object.entries(env)) {
    core.setOutput(key, value);
  }
}

/**
 * mask values by default, can specify the keys to be unmasked
 */
export async function unmaskValuesByKeys(
  env: object,
  keys: Array<string>
): Promise<void> {
  const nKeys = normalizedKeys(keys);
  for (const [key, value] of Object.entries(env)) {
    if (!nKeys.includes(key)) {
      core.setSecret(value);
    }
  }
}

/**
 * export values by specified keys
 */
export async function exportValuesByKeys(
  env: object,
  keys: Array<string>
): Promise<void> {
  const nKeys = normalizedKeys(keys);
  for (const [key, value] of Object.entries(env)) {
    if (nKeys.includes(key)) {
      core.exportVariable(key, value);
    }
  }
}
