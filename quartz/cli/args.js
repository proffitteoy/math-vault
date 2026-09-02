export const BuildArgv = {
  directory: {
    string: true,
    alias: ["d"],
    default: "content",
    describe: "directory containing public Markdown notes",
  },
  output: {
    string: true,
    alias: ["o"],
    default: ".quartz-cache/quartz-site",
    describe: "temporary build output directory",
  },
  verbose: {
    boolean: true,
    alias: ["v"],
    default: false,
    describe: "print detailed build output",
  },
  concurrency: {
    number: true,
    describe: "number of note parsing workers",
  },
}
