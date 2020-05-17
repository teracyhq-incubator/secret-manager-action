import * as core from "@actions/core";

import * as config from "./config";
import * as util from "./util";

async function run(): Promise<void> {
  try {
    // setGracefulCleanup();
    const configFilePath = core.getInput("config_file_path", {
      required: true,
    });
    const passphrase = core.getInput("passphrase", {
      required: true,
    });
    const type = core.getInput("type", { required: true });
    const unmaskedKeys = core.getInput("unmasked_keys") || "";
    const exportedKeys = core.getInput("exported_keys") || "";

    const env = await config.getConfigEnv({
      configFilePath,
      type,
      passphrase,
    });
    util.outputEnv(env);
    util.unmaskValuesByKeys(env, unmaskedKeys.split(","));
    util.exportValuesByKeys(env, exportedKeys.split(","));
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
