/** @type {import("@commitlint/types").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Subject-only commit messages: keep the header short and skip bodies.
    "header-max-length": [2, "always", 72],
    "body-max-line-length": [2, "always", 72],
  },
};
