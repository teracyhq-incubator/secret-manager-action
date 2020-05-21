import * as core from "@actions/core";

import * as config from "./config";
import * as util from "./util";

async function run(): Promise<void> {
  try {
    const configFilePath = core.getInput("config_file_path", {
      required: true,
    });
    const passphrase = core.getInput("passphrase", {
      required: true,
    });
    const type = core.getInput("type", { required: true });
    const unmaskedKeys = core.getInput("unmasked_keys") || "";
    const exportedKeys = core.getInput("exported_keys") || "";

    core.debug(`configFilePath: ${configFilePath}`);
    core.debug(`type: ${type}`);
    core.debug(`unmaskedKeys: ${unmaskedKeys}`);
    core.debug(`exportedKeys: ${exportedKeys}`);

    const env = await config.getConfigEnv({
      configFilePath,
      type,
      passphrase,
    });
    util.unmaskValuesByKeys(env, unmaskedKeys.split(","));
    util.outputEnv(env);
    util.exportValuesByKeys(env, exportedKeys.split(","));
  } catch (err) {
    core.debug(err);
    core.setFailed(err.message);
  }
}

run();
