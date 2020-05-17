import { boolean } from "boolean";
import * as core from "@actions/core";

import * as config from "./config";
import * as util from "./util";

type Inputs = {
  configFilePath: string;
  passphrase: string;
  type: string;
};

function getInputs(required = true): Inputs {
  return {
    configFilePath: core.getInput("config_file_path", { required: required }),
    passphrase: core.getInput("passphrase", { required: required }),
    type: core.getInput("type", { required: required }),
  };
}

async function run(): Promise<void> {
  try {
    const skipAllowed = boolean(core.getInput("skip_allowed"));

    core.debug(`skipAllowed: ${skipAllowed}`);

    let inputs: Inputs;

    if (skipAllowed == true) {
      inputs = getInputs(false);
      core.debug(`inputs: ${JSON.stringify(inputs)}`);
      //if all required inputs are not configured, skip
      if (
        inputs.configFilePath === "" ||
        inputs.passphrase === "" ||
        inputs.type === ""
      ) {
        console.log("skipped due to one of the required inputs are not configured");
        return;
      }
    } else {
      inputs = getInputs(true);
    }

    const unmaskedKeys = core.getInput("unmasked_keys") || "";
    const exportedKeys = core.getInput("exported_keys") || "";

    const env = await config.getConfigEnv({
      configFilePath: inputs.configFilePath,
      type: inputs.type,
      passphrase: inputs.passphrase,
    });
    util.outputEnv(env);
    util.unmaskValuesByKeys(env, unmaskedKeys.split(","));
    util.exportValuesByKeys(env, exportedKeys.split(","));
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
