#!/usr/bin/env -S node --no-deprecation
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { BuildArgv } from "./cli/args.js"
import { handleBuild } from "./cli/handlers.js"

yargs(hideBin(process.argv))
  .scriptName("notes")
  .usage("$0 build [args]")
  .command("build", "Generate the note artifacts used by the Next.js site", BuildArgv, handleBuild)
  .showHelpOnFail(false)
  .help()
  .strict()
  .demandCommand(1)
  .parse()
