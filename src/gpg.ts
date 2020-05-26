import * as util from "util";
import { promises as fs } from "fs";

import * as io from "@actions/io";
import { file, dir } from "tmp-promise";

// check if ggp is available, othewise, throw error
(async function (): Promise<void> {
  await io.which("gpg", true);
})();

const exec = util.promisify(require("child_process").exec);

type GpgOptions = {
  passphrase: string;
};

// export async function encrypt(input:string, opts:GpgOptions): Promise<string> {
//   return '';
// }

/**
 * Decrypt a string input with the provided passphrase
 * @return decrypted string
 */
export async function decrypt(
  input: string,
  opts: GpgOptions
): Promise<string> {
  const { path: passphrasePath, cleanup: cleanupPassPhrase } = await file();
  const { path: filePath, cleanup: cleanupFile } = await file();
  // see: https://github.com/teracyhq-incubator/secret-manager-action/issues/17
  const { path: gpgHomeDir, cleanup: cleanupGpgDir } = await dir({
    unsafeCleanup: true,
  });

  await fs.writeFile(passphrasePath, opts.passphrase);
  await fs.writeFile(filePath, input);

  const execCmd = [
    `cat ${passphrasePath}`,
    "|",
    `gpg --homedir=${gpgHomeDir} --quiet --batch --yes --decrypt --passphrase-fd=0 ${filePath}`,
  ].join(" ");

  const { stdout, stderr } = await exec(execCmd);

  if (stderr) {
    throw new Error(stderr);
  }

  cleanupPassPhrase();
  cleanupFile();
  cleanupGpgDir();
  return stdout;
}
